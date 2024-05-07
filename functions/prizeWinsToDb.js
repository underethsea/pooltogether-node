const { CONTRACTS } = require("../constants/contracts.js");
const { PROVIDERS, SIGNER } = require("../constants/providers.js");
const { ADDRESS } = require("../constants/address.js");
const { CONFIG } = require("../constants/config.js");
const { GetChainName } = require("../constants/address.js")
const GetTwabPlayers = require("../functions/playersSubgraph.js")
const { AddWin, AddDraw, AddPoolers } = require("../functions/dbDonkey.js");
const { GetWinnersByTier } = require("../functions/getWinnersByTier.js");
const { GetPrizePoolData } = require("../functions/getPrizePoolData.js");
const chalk = require("chalk");

const section = chalk.hex("#47FDFB");
const batchSize = 300;

async function PrizeWinsToDb(chainId, block = "latest") {
  if (block === "latest") {
    block = await PROVIDERS[CONFIG.CHAINNAME].getBlock();
    block = block.number;
  }
  console.log("block", block,"chain id ", chainId, " name ", GetChainName(chainId));
  console.log(section("----- calling contract data ------"));

  const {
    lastDrawId,
    numberOfTiers,
    tierTimestamps,
    lastCompletedDrawStartedAt,
    drawPeriodSeconds,
    //grandPrizePeriod,
    tierPrizeValues,
    prizesForTier
  } = await GetPrizePoolData(block);

  console.log("");
  await AddDraw(
    chainId,
    lastDrawId.toString(),
//    lastCompletedDrawStartedAt,
  //  drawPeriodSeconds,
    numberOfTiers,
    //grandPrizePeriod,
    tierPrizeValues.map(value => +value),
    prizesForTier,
    block,
    ADDRESS[CONFIG.CHAINNAME].PRIZEPOOL,
  );

  const startTime = new Date();
  console.log("Start Time", startTime);

  console.log(section("----- getting winners -----"));

  // Create a map to store fetched players for each unique timestamp
  const fetchedPlayersMap = new Map();

  for (let tier = 0; tier < numberOfTiers; tier++) {
    console.log(section(`Fetching winners for Tier ${tier}`));

    // Check if players for this tier have already been fetched
// Check if players for this tier have already been fetched
const tierTimestamp = tierTimestamps[tier];
let oneDrawPlayers;

// Generate a unique key based on start and end timestamps
const tierTimestampKey = `${tierTimestamp.startTimestamp}-${tierTimestamp.endTimestamp}`;

if (fetchedPlayersMap.has(tierTimestampKey)) {
  console.log("Using previously fetched players for Tier", tier, "due to matching timestamps.");
  oneDrawPlayers = fetchedPlayersMap.get(tierTimestampKey);
} else {
  const oneDrawStartTimeStamp = tierTimestamp.startTimestamp.toString();
  const oneDrawEndTimeStamp = tierTimestamp.endTimestamp.toString();
  console.log(`Fetching players for Tier ${tier} from ${oneDrawStartTimeStamp} to ${oneDrawEndTimeStamp}`);
  oneDrawPlayers = await GetTwabPlayers(oneDrawStartTimeStamp, oneDrawEndTimeStamp);

  // Store fetched players in the map
  fetchedPlayersMap.set(tierTimestampKey, oneDrawPlayers);
}

    console.log(`Got ${oneDrawPlayers.length} players, writing to database for Tier ${tier}`);
    await AddPoolers(chainId, lastDrawId.toString(), oneDrawPlayers);

    const winners = await GetWinnersByTier(
      GetChainName(chainId),
      tier, // Fetching one tier at a time
      lastDrawId,
      prizesForTier[tier],
      oneDrawPlayers,
      "latest",
    );

    console.log(`Fetched winners for Tier ${tier}`);

const combinedArray = [];
for (const [vault, winner, _, index] of winners) {
  const existingEntry = combinedArray.find(([v, w]) => v === vault && w === winner);

  if (existingEntry) {
    // Ensure that existingEntry[3] is initialized as an array
    if (!Array.isArray(existingEntry[3])) {
      existingEntry[3] = [];
    }
    existingEntry[3].push(index);
  } else {
    combinedArray.push([vault, winner, tier, [index]]); // Initialize index as an array
  }
}
    const addWinPromises = combinedArray.map(([vault, pooler, tier, indices]) =>
      AddWin(chainId, lastDrawId.toString(), vault, pooler, tier, indices, ADDRESS[CONFIG.CHAINNAME].PRIZEPOOL)
    );

    await Promise.all(addWinPromises);

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
  }

  const endTime = new Date();
  console.log("End Time ", endTime);

  const timeDifference = endTime - startTime;
  console.log("Time elapsed (seconds)", timeDifference / 1000);
}
PrizeWinsToDb(10)
