const fs = require("fs");
const { loadChainConfig, getChainConfig } = require("../chains");
const chainKey = process.argv[2] || "";
try {
  // Load the configuration with the provided chainKey or default
  loadChainConfig(chainKey);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`); // Fixed template literal
  process.exit(1);
}
const BATCH_SIZE = 2000;
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
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const DELAY_MS = 600;  // Delay of 1 second between batches (adjust as necessary)

async function PrizeCalcToDb(chainId, block = "latest", maxTiersToCalculate, debug = false, multicallBatchSize = BATCH_SIZE, multicallAddress = null) {
  console.log("recvd multi", multicallAddress);
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
  console.log(section("----- getting players -----")); // Changed from 'winners' to 'players' for clarity
  const tier = 0; // This 'tier' variable only seems to be used for fetching players for tier 0's timestamp range
  const tierTimestamp = tierTimestamps[tier];
  const oneDrawStartTimeStamp = tierTimestamp.startTimestamp.toString();
  const oneDrawEndTimeStamp = tierTimestamp.endTimestamp.toString();
  console.log(`Workspaceing players for draw from ${oneDrawStartTimeStamp} to ${oneDrawEndTimeStamp}`); // Fixed template literal and clarified message
  let oneDrawPlayers;
  try {
    oneDrawPlayers = await GetTwabPlayers(oneDrawStartTimeStamp, oneDrawEndTimeStamp);
  } catch (e) {
    await SendMessageToChannel("1225048554708406282", "❌ error in fetching players from subgraph for " + CHAINNAME);
    console.log(e);
    return;
  }
  console.log(`Got ${oneDrawPlayers.length} players, writing to database.`); // Fixed template literal and clarified message
  if (!oneDrawPlayers || oneDrawPlayers.length === 0) {
    console.log("error fetching players, will skip calculation");
    return;
  }
  await AddPoolers(chainId, lastDrawId.toString(), oneDrawPlayers);
  const groupedResult = groupPlayersByVaultForFoundry(chainId, ADDRESS[CHAINNAME].PRIZEPOOL, oneDrawPlayers);

  const tiersToCalculate = Math.min(maxTiersToCalculate, numberOfTiers);
  const tierArray = Array.from({ length: tiersToCalculate }, (_, index) => index);

  // --- START CHANGES HERE ---

  const rpcUrl = PROVIDERS[CHAINNAME].connection.url;

  async function processTierGroup(tierNumbers, label) { // Renamed `tierGroup` to `tierNumbers` for clarity
    console.log(`--- Processing ${label} ---`);
    let results = [];
    let vaultCount = 0;

    for (const vault of groupedResult) {
      vaultCount++;
      const userBatches = [];
      for (let i = 0; i < vault.userAddresses.length; i += BATCH_SIZE) {
        userBatches.push(vault.userAddresses.slice(i, i + BATCH_SIZE));
      }

      for (let batch of userBatches) {
        const computeWinnersOptions = {
          chainId,
          rpcUrl,
          prizePoolAddress: ADDRESS[CHAINNAME].PRIZEPOOL,
          vaultAddress: vault.vaultAddress,
          userAddresses: batch,
          prizeTiers: tierNumbers, // Use the `tierNumbers` array passed to this function
          blockNumber: block ? block.toString() : undefined,
          multicallBatchSize: multicallBatchSize,
          debug: debug,
          ...(multicallAddress ? { multicallAddress } : {})
        };

        try {
          const vaultWinners = await computeWinners(computeWinnersOptions);
          console.log(`Processed batch of ${batch.length} users for vault ${vault.vaultAddress} for tiers [${tierNumbers.join(', ')}]`); // Updated log

for (const winner of vaultWinners) {
  const { user, prizes } = winner;
  const vaultAddress = vault.vaultAddress;
  winner.vault = vaultAddress;

  for (const [tier, indices] of Object.entries(prizes)) {
    const parsedTier = parseInt(tier, 10);
    if (parsedTier > numberOfTiers - 3) canaryWins += indices.length;
    totalAdds += indices.length;

    console.log(`Adding: User: ${user}, Vault: ${vaultAddress}, Tier: ${parsedTier}, Indices: ${indices}`);
    await AddWin(chainId, lastDrawId.toString(), vaultAddress, user, parsedTier, indices, ADDRESS[CHAINNAME].PRIZEPOOL);
  }
}

          results = results.concat(vaultWinners);

          // This check for tier 0 winner should ideally be after consolidation for the whole tier,
          // but if you want immediate alerts for tier 0 winners per batch, keep it here.
          // Consider if you want this specific alert logic tied to individual tiers.
          const tier0WinnersInBatch = vaultWinners.filter(winner => winner.prizes["0"]);
          if (tier0WinnersInBatch.length > 0 && tierNumbers.includes(0)) { // Added check for tier 0 in the current tierNumbers
             await SendMessageToChannel("1225048554708406282", `🎉🎉🎉 Jackpot winner on ${CHAINNAME} (Tier 0 batch alert)`);
          }

          await delay(DELAY_MS);
        } catch (error) {
          console.error(`Error processing batch for vault ${vault.vaultAddress} for tiers [${tierNumbers.join(', ')}]:`, error); // Updated log
        }
      }

      console.log(`Vault ${vault.vaultAddress} complete (${vaultCount}/${groupedResult.length}) for tiers [${tierNumbers.join(', ')}]`); // Updated log
    }

    return results;
  }

  function consolidateWinners(winners) {
    return winners.reduce((acc, { user, prizes, vault }) => {
      Object.entries(prizes).forEach(([tier, indices]) => {
        const key = `${user}-${tier}-${vault}`; // Fixed template literal
        if (!acc[key]) {
          acc[key] = { user, vault, tier: parseInt(tier, 10), indices: [] }; // Parse tier to int
        }
        acc[key].indices.push(...indices);
      });
      return acc;
    }, {});
  }

  let winnersData = [];
  let totalAdds = 0;
  let canaryWins = 0;

  // Loop through each tier individually
  for (const tierIndex of tierArray) {
    const currentTierResults = await processTierGroup([tierIndex], `tier ${tierIndex}`); // Pass a single-element array for the current tier
    const consolidatedTierWinners = consolidateWinners(currentTierResults);
    const consolidatedArrayForTier = Object.values(consolidatedTierWinners);

    for (const { user, vault, tier, indices } of consolidatedArrayForTier) {
      console.log(`Adding: User: ${user}, Vault: ${vault}, Tier: ${tier}, Indices: ${indices}`); // Fixed template literal
      if (tier > numberOfTiers - 3) canaryWins += indices.length; // This logic remains, but applies per tier
      totalAdds += indices.length;
     // await AddWin(chainId, lastDrawId.toString(), vault, user, tier, indices, ADDRESS[CHAINNAME].PRIZEPOOL);
    }
    // Update draw calculated after processing each tier's wins if you want progress updates
    // await UpdateDrawCalculated(chainId, lastDrawId.toString(), ADDRESS[CHAINNAME].PRIZEPOOL); // Consider if this should be after each tier or once at the end. Keeping it at the end is safer.

    winnersData = winnersData.concat(currentTierResults); // Accumulate all results
  }

  // Final update to draw calculated (moved outside the loop)
  await UpdateDrawCalculated(chainId, lastDrawId.toString(), ADDRESS[CHAINNAME].PRIZEPOOL);


  // --- END CHANGES HERE ---


  // Final consolidation and file write (consolidate all results once at the end)
  const consolidatedWinnersData = consolidateWinners(winnersData);
  const consolidatedArray = Object.values(consolidatedWinnersData);
  fs.writeFileSync("winners.json", JSON.stringify(winnersData, null, 2));
  fs.writeFile("consolidatedWinnersData.json", JSON.stringify(consolidatedArray, null, 2), (err) => {
    if (err) {
      console.error("An error occurred while writing JSON to file:", err);
    } else {
      console.log("JSON data has been written to disk successfully.");
    }
  });

  let totalPrizeValueInEther;
  try {
    const totalPrizeValueInWei = consolidatedArray.reduce((acc, { tier, indices }) => {
      // Ensure tier is a number before accessing tierPrizeValues
      const actualTier = parseInt(tier, 10);
      if (isNaN(actualTier) || actualTier < 0 || actualTier >= tierPrizeValues.length) {
        console.warn(`Invalid tier value encountered: ${tier}. Skipping prize value calculation for this entry.`);
        return acc;
      }
      return acc + BigInt(tierPrizeValues[actualTier]) * BigInt(indices.length); // Use BigInt for large numbers
    }, BigInt(0)); // Initialize accumulator as BigInt

    totalPrizeValueInEther = Number(totalPrizeValueInWei) / 1e18; // Convert BigInt back to Number for division and formatting
  } catch (e) {
    console.error("Error calculating total prize value:", e); // Use console.error for errors
  }

  const endTime = new Date();
  console.log("There were", totalAdds, "wins calculated");
  console.log("End Time ", endTime);
  const nonCanaryWins = totalAdds - canaryWins;
  const timeDifference = endTime - startTime;
  console.log("Time elapsed (seconds)", timeDifference / 1000);
  await SendMessageToChannel(
    "1225048554708406282",
    `${CHAINNAME} Draw ${lastDrawId} - ${numberOfTiers} tiers with ${nonCanaryWins} wins with ${canaryWins} canary ${totalPrizeValueInEther?.toFixed(4)} total ${ADDRESS[CHAINNAME].PRIZETOKEN.SYMBOL} time(s) ${timeDifference/1000}` // Fixed template literal
  );
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
//PrizeCalcToDb(10, 125592259 , maxTiersToCalculate = 7, debug=true); // optimism
//PrizeCalcToDb(1,"latest", maxTiersToCalculate = 7, debug=true)
//PrizeCalcToDb(42161, "latest", maxTiersToCalculate = 7, debug = true); // arbitrum
// PrizeCalcToDb(8453, "latest", maxTiersToCalculate = 7, debug= true)
// FoundryPrizeWinsToDb(42161, 221234069);
// PrizeCalcToDb(8453,"latest",maxTiersToCalculate = 6, debug= true)
//PrizeCalcToDb(534352,"latest",maxTiersToCalculate = 7, true, 200, multicallAddress = "0xcA11bde05977b3631167028862bE2a173976CA11"); // scroll
//PrizeCalcToDb(100,"latest",maxTiersToCalculate = 7, debug=true, 200, multicallAddress = "0xcA11bde05977b3631167028862bE2a173976CA11")
//PrizeCalcToDb(480,"latest",maxTiersToCalculate = 7, multicallAddress = "0xca11bde05977b3631167028862be2a173976ca11",debug=true); // scroll
/*
PrizeCalcToDb(
480,                         // chainId
"latest",                   // block
6,                          // maxTiersToCalculate
true,                       // debug
200,                        // multicallBatchSize
"0xca11bde05977b3631167028862be2a173976ca11" // multicallAddress
);
*/
module.exports = { PrizeCalcToDb };
