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

// const { CONTRACTS } = require("../constants/contracts.js");
const { PROVIDERS, SIGNER } = require("../constants/providers.js");
const { ADDRESS } = require("../constants/address.js");
// const { CONFIG } = require("../constants/config.js");
const { GetChainName } = require("../constants/address.js");
const GetTwabPlayers = require("../functions/playersSubgraph.js");
const { AddWin, AddDraw, AddPoolers } = require("../functions/dbDonkey.js");
// const { GetWinnersByTier } = require("../functions/getWinnersByTier.js");
const { GetPrizePoolData } = require("../functions/getPrizePoolData.js");
const chalk = require("chalk");
const GetFoundryWinnersByVault = require("./foundryCalc");
const section = chalk.hex("#47FDFB");
const { SendMessageToChannel } = require("./discordAlert");
const CHAINNAME = getChainConfig().CHAINNAME;

async function FoundryPrizeWinsToDb(chainId, block = "latest") {
  if (block === "latest") {
    block = await PROVIDERS[CHAINNAME].getBlock();
    block = block.number;
  }
  console.log(
    "block",
    block,
    "chain id ",
    chainId,
    " name ",
    GetChainName(chainId)
  );
  console.log(section("----- calling contract data ------"));

  const {
    lastDrawId,
    numberOfTiers,
    tierTimestamps,
    //    lastCompletedDrawStartedAt,
    //  drawPeriodSeconds,
    //grandPrizePeriod,
    tierPrizeValues,
    prizesForTier,
  } = await GetPrizePoolData(block);
  console.log("last awarded draw id", lastDrawId);
  console.log("");
  await AddDraw(
    chainId,
    lastDrawId.toString(),
    //  lastCompletedDrawStartedAt,
    //  drawPeriodSeconds,
    numberOfTiers,
    //grandPrizePeriod,
    tierPrizeValues.map((value) => +value),
    prizesForTier,
    block,
    ADDRESS[CHAINNAME].PRIZEPOOL
  );

  const startTime = new Date();
  console.log("Start Time", startTime);
  console.log(section("----- getting winners -----"));

  // Fetch players for Tier 0 only
  const tier = 0; // Fetching players for Tier 0
  const tierTimestamp = tierTimestamps[tier];
  const oneDrawStartTimeStamp = tierTimestamp.startTimestamp.toString();
  const oneDrawEndTimeStamp = tierTimestamp.endTimestamp.toString();

  console.log(
    `Fetching players for Tier ${tier} from ${oneDrawStartTimeStamp} to ${oneDrawEndTimeStamp}`
  );
  let oneDrawPlayers;
  try {
    oneDrawPlayers = await GetTwabPlayers(
      oneDrawStartTimeStamp,
      oneDrawEndTimeStamp
    );
  } catch (e) {
    await SendMessageToChannel(
      "1225048554708406282",
      "❌ error in fetching players from subgraph for " + CHAINNAME
    );
  }
  console.log(
    `Got ${oneDrawPlayers.length} players, writing to database for Tier ${tier}`
  );
  await AddPoolers(chainId, lastDrawId.toString(), oneDrawPlayers);

  console.log("one draw players", oneDrawPlayers[0]);

  const groupedResult = groupPlayersByVaultForFoundry(
    chainId,
    ADDRESS[CHAINNAME].PRIZEPOOL,
    oneDrawPlayers
  );
  fs.writeFileSync(
    "playersToCalculate.json",
    JSON.stringify(groupedResult, null, 2)
  );
  //console.log("file written")

  let winnersData;
  try {
    winnersData = await GetFoundryWinnersByVault(
      groupedResult,
      numberOfTiers,
      PROVIDERS[CHAINNAME].connection.url
    );
    // Add this code block right after getting the winnersData
    let tier0Winners = winnersData.filter((winner) => winner.prizes["0"]); // Assuming '0' is the key for Tier 0

    if (tier0Winners.length > 0) {
      await SendMessageToChannel(
        "1225048554708406282",
        `🎉🎉🎉 Jackpot winner on ${CHAINNAME}`
      );
    }
  } catch (e) {
    await SendMessageToChannel(
      "1225048554708406282",
      "❌ error in prize calculations for " + CHAINNAME
    );
  }
  fs.writeFileSync("winners.json", JSON.stringify(winnersData, null, 2));
  //console.log(winnersData)
  //console.log(`Fetched winners for Tier ${tier}`);

  // Consolidation logic
  const consolidatedWinnersData = winnersData.reduce(
    (acc, { user, prizes, vault }) => {
      Object.entries(prizes).forEach(([tier, indices]) => {
        // Generate a unique key for each combination of user, tier, and vault
        const key = `${user}-${tier}-${vault}`;
        if (!acc[key]) {
          acc[key] = { user, vault, tier, indices: [] };
        }
        // Combine indices for matching user, tier, and vault
        acc[key].indices = [...acc[key].indices, ...indices];
      });
      return acc;
    },
    {}
  );

  // Convert the consolidated object back to an array format
  const consolidatedArray = Object.values(consolidatedWinnersData);

  fs.writeFile(
    "consolidatedWinnersData.json",
    JSON.stringify(consolidatedArray, null, 2),
    (err) => {
      if (err) {
        console.error("An error occurred while writing JSON to file:", err);
      } else {
        console.log("JSON data has been written to disk successfully.");
      }
    }
  );

  let totalAdds = 0;
  // Assuming consolidatedArray contains the data prepared for processing
  const addWinPromises = consolidatedArray.map(
    ({ user, vault, tier, indices }) => {
      console.log(
        `Adding: User: ${user}, Vault: ${vault}, Tier: ${tier}, Indices: ${indices}`
      );
      totalAdds += indices.length;
      return AddWin(
        chainId,
        lastDrawId.toString(),
        vault,
        user,
        tier,
        indices,
        ADDRESS[CHAINNAME].PRIZEPOOL
      );
    }
  );

  // Execute all AddWin operations in parallel
  Promise.all(addWinPromises)
    .then(() => {
      console.log("All winners processed successfully.");
    })
    .catch((error) => {
      console.error("An error occurred while processing winners:", error);
    });

  console.log("There were", totalAdds, "wins calculated");
  /*
        for (const [vault, pooler, tier, indices] of combinedArray) {
          console.log(
            pooler,
            "won tier",
            tier,
            "indices",
            indices,
            "on vault",
            vault,
          );
        }
      
    */
  const endTime = new Date();
  console.log("End Time ", endTime);

  const timeDifference = endTime - startTime;
  console.log("Time elapsed (seconds)", timeDifference / 1000);
  await SendMessageToChannel(
    "1225048554708406282",
      CHAINNAME +
      " Draw " + lastDrawId + " - " + 
      numberOfTiers +
      " tiers with " +
      totalAdds +
      " wins calculated"
  );
}

function groupPlayersByVaultForFoundry(chain, prizePool, players) {
  return Object.values(
    players.reduce((groups, player) => {
      const { vault, address } = player;
      if (!groups[vault]) {
        groups[vault] = {
          chainId: chain, // Example value, replace with your actual chainId
          prizePoolAddress: prizePool, // Example value, replace with your actual prize pool address
          vaultAddress: vault,
          userAddresses: [],
        };
      }
      groups[vault].userAddresses.push(address);
      return groups;
    }, {})
  );
}
//FoundryPrizeWinsToDb(42161, "latest");
//FoundryPrizeWinsToDb(8453,15204879)
//FoundryPrizeWinsToDb(10,121750922)
//FoundryPrizeWinsToDb(42161,221234069)
module.exports = { FoundryPrizeWinsToDb };
