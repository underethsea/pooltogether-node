const fs = require("fs");
const { loadChainConfig, getChainConfig } = require("../chains");

const chainKey = process.argv[2] || "";

try {
  // Load the configuration with the provided chainKey or default
  loadChainConfig(chainKey);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`);
  process.exit(1);
}
 const BATCH_SIZE = 200
// Import other dependencies after the chain configuration is loaded
const { PROVIDERS } = require("../constants/providers.js");
const { ADDRESS, GetChainName } = require("../constants/address.js");
const GetTwabPlayers = require("../functions/playersSubgraph.js");
const { AddWin, AddDraw, AddPoolers, UpdateDrawCalculated } = require("../functions/dbDonkey.js");
const { GetPrizePoolData } = require("../functions/getPrizePoolData.js");
const chalk = require("chalk");
const { SendMessageToChannel } = require("./discordAlert");

const section = chalk.hex("#47FDFB");
const CONFIG_CHAINNAME = getChainConfig().CHAINNAME;

async function PrizeCalcToDb(chainId, block = "latest", maxTiersToCalculate, debug = false,  multicallBatchSize = BATCH_SIZE) {
  const { computeWinners } = await import("@generationsoftware/js-winner-calc");

  const CHAINNAME = GetChainName(chainId);
  if (CHAINNAME !== CONFIG_CHAINNAME) {
    console.log("CONFIG CHAIN MISMATCH");
    return;
  }

  if (block === "latest") {
    block = await PROVIDERS[CHAINNAME].getBlockNumber();
  }

  console.log("block", block, "chain id ", chainId, " name ", CHAINNAME);
  console.log(section("----- calling contract data ------"));

  const {
    lastDrawId,
    numberOfTiers,
    tierTimestamps,
    tierPrizeValues,
    prizesForTier,
  } = await GetPrizePoolData(block);

  console.log("last awarded draw id", lastDrawId);
  console.log("");

  await AddDraw(
    chainId,
    lastDrawId.toString(),
    numberOfTiers,
    tierPrizeValues.map((value) => +value),
    prizesForTier,
    block,
    ADDRESS[CHAINNAME].PRIZEPOOL
  );

  const startTime = new Date();
  console.log("Start Time", startTime);
  console.log(section("----- getting winners -----"));

  // Fetch players for Tier 0 only
  const tier = 0;
  const tierTimestamp = tierTimestamps[tier];
  const oneDrawStartTimeStamp = tierTimestamp.startTimestamp.toString();
  const oneDrawEndTimeStamp = tierTimestamp.endTimestamp.toString();

  console.log(`Fetching players for Tier ${tier} from ${oneDrawStartTimeStamp} to ${oneDrawEndTimeStamp}`);
  let oneDrawPlayers;
  try {
    oneDrawPlayers = await GetTwabPlayers(oneDrawStartTimeStamp, oneDrawEndTimeStamp);
  } catch (e) {
    await SendMessageToChannel("1225048554708406282", "❌ error in fetching players from subgraph for " + CHAINNAME);
    return;
  }

  console.log(`Got ${oneDrawPlayers.length} players, writing to database for Tier ${tier}`);
if(!oneDrawPlayers || oneDrawPlayers.length === 0){  
console.log("error fetching players will skip calculation")
}else{ 
await AddPoolers(chainId, lastDrawId.toString(), oneDrawPlayers);

  //console.log("one draw players", oneDrawPlayers[0]);

  const groupedResult = groupPlayersByVaultForFoundry(chainId, ADDRESS[CHAINNAME].PRIZEPOOL, oneDrawPlayers);
 // fs.writeFileSync("playersToCalculate.json", JSON.stringify(groupedResult, null, 2));

  let winnersData = [];

    const tiersToCalculate = Math.min(maxTiersToCalculate, numberOfTiers);
    
    // Create an array from 0 to actualTiers - 1
    const tierArray = Array.from({ length: tiersToCalculate }, (_, index) => index);
console.log("calculating for",tierArray.length,"tiers") 
  try {
    const rpcUrl = PROVIDERS[CHAINNAME].connection.url;
let vaultCount=0
    for (const vault of groupedResult) {
vaultCount++
      const computeWinnersOptions = {
        chainId,
        rpcUrl,
        prizePoolAddress: ADDRESS[CHAINNAME].PRIZEPOOL,
        vaultAddress: vault.vaultAddress,
        userAddresses: vault.userAddresses
      };

      // Add optional parameters if specified
     
      if (debug) {
        computeWinnersOptions.debug = true;
      }

      computeWinnersOptions.prizeTiers = tierArray

      if (block !== null) {
        computeWinnersOptions.blockNumber = BigInt(block);
      }
      if (multicallBatchSize !== null) {
        computeWinnersOptions.multicallBatchSize = multicallBatchSize;
      }

      const vaultWinners = await computeWinners(computeWinnersOptions);
      console.log(`vault ${vault.vaultAddress} complete (${vaultCount}/${groupedResult.length})`);

      vaultWinners.forEach(winner => {
        winner.vault = vault.vaultAddress;
      });

      winnersData = winnersData.concat(vaultWinners);

      let tier0Winners = vaultWinners.filter(winner => winner.prizes["0"]);
      if (tier0Winners.length > 0) {
        await SendMessageToChannel("1225048554708406282", `🎉🎉🎉 Jackpot winner on ${CHAINNAME}`);
      }
    }
  } catch (e) {
    await SendMessageToChannel("1225048554708406282", "❌ error in prize calculations for " + CHAINNAME);
    return;
  }

  fs.writeFileSync("winners.json", JSON.stringify(winnersData, null, 2));

  const consolidatedWinnersData = winnersData.reduce((acc, { user, prizes, vault }) => {
    Object.entries(prizes).forEach(([tier, indices]) => {
      const key = `${user}-${tier}-${vault}`;
      if (!acc[key]) {
        acc[key] = { user, vault, tier, indices: [] };
      }
      acc[key].indices = [...acc[key].indices, ...indices];
    });
    return acc;
  }, {});

  let totalPrizeValueInEther;
  try {
    const totalPrizeValueInWei = Object.values(consolidatedWinnersData).reduce((acc, { tier, indices }) => {
      const prizeValue = tierPrizeValues[tier] * indices.length;
      return acc + prizeValue;
    }, 0);
    totalPrizeValueInEther = totalPrizeValueInWei / 1e18;
  } catch (e) {
    console.log(e);
  }

  const consolidatedArray = Object.values(consolidatedWinnersData);

  fs.writeFile("consolidatedWinnersData.json", JSON.stringify(consolidatedArray, null, 2), (err) => {
    if (err) {
      console.error("An error occurred while writing JSON to file:", err);
    } else {
      console.log("JSON data has been written to disk successfully.");
    }
  });

  let totalAdds = 0;
  let canaryWins = 0;
  const addWinPromises = consolidatedArray.map(({ user, vault, tier, indices }) => {
    console.log(`Adding: User: ${user}, Vault: ${vault}, Tier: ${tier}, Indices: ${indices}`);
    if (tier > numberOfTiers - 3) {
      canaryWins += indices.length;
    }
    totalAdds += indices.length;
    return AddWin(chainId, lastDrawId.toString(), vault, user, tier, indices, ADDRESS[CHAINNAME].PRIZEPOOL);
  });

  Promise.all(addWinPromises)
    .then(async () => {
      console.log("All winners processed successfully.");
      await UpdateDrawCalculated(chainId, lastDrawId.toString(), ADDRESS[CHAINNAME].PRIZEPOOL);
    })
    .catch((error) => {
      console.error("An error occurred while processing winners:", error);
    });

  console.log("There were", totalAdds, "wins calculated");

  const endTime = new Date();
  console.log("End Time ", endTime);
  const nonCanaryWins = totalAdds - canaryWins;
  const timeDifference = endTime - startTime;
  console.log("Time elapsed (seconds)", timeDifference / 1000);
  await SendMessageToChannel(
    "1225048554708406282",
    `${CHAINNAME} Draw ${lastDrawId} - ${numberOfTiers} tiers with ${nonCanaryWins} wins with ${canaryWins} canary ${totalPrizeValueInEther.toFixed(4)} total ETH`
  );
}
}

function groupPlayersByVaultForFoundry(chain, prizePool, players) {
  return Object.values(
    players.reduce((groups, player) => {
      const { vault, address } = player;
      if (!groups[vault]) {
        groups[vault] = {
          chainId: chain,
          prizePoolAddress: prizePool,
          vaultAddress: vault,
          userAddresses: [],
        };
      }
      groups[vault].userAddresses.push(address);
      return groups;
    }, {})
  );
}

// Uncomment the appropriate line to run for the desired chain and block
//PrizeCalcToDb(10, "latest", maxTiersToCalculate = 7, debug=true); // optimism 
//PrizeCalcToDb(42161, "latest",maxTiersToCalculate = 7, debug=true); // arbitrum
// PrizeCalcToDb(8453, "latest",maxTiersToCalculate = 7, debug=true, debug = true); // base
// FoundryPrizeWinsToDb(42161, 221234069);
// PrizeCalcToDb(8453,"latest",maxTiersToCalculate = 6, debug= true)
module.exports = { PrizeCalcToDb };
