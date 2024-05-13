const { loadChainConfig, getChainConfig } = require('./chains');

const chainKey = process.argv[2] || '';

try {
  // Load the configuration with the provided chainKey or default
  loadChainConfig(chainKey);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`);
  process.exit(1);
}

const CHAINNAME = getChainConfig().CHAINNAME;
const CHAINID = getChainConfig().CHAINID;

const ethers = require("ethers");
// const { CONTRACTS, PROVIDERS, SIGNER, ABI } = require("./constants/index")
const { CONTRACTS } = require("./constants/contracts.js")
const { SIGNER } = require("./constants/providers.js");
const { ADDRESS } = require("./constants/address.js");
const { ABI } = require("./constants/abi.js");
const { CONFIG } = require("./constants/config.js");
const { FetchApiPrizes } = require("./functions/fetchApiPrizes.js");
const { FetchG9ApiPrizes } = require("./functions/fetchG9ApiPrizes.js");
const { GetWinnersByTier } = require("./functions/getWinnersByTier.js");
const { GetRecentClaims } = require("./functions/getRecentClaims.js");
const { SendClaims } = require("./functions/sendClaims.js");
const chalk = require("chalk");
const { GetPrizePoolData } = require("./functions/getPrizePoolData.js");
const { GeckoIDPrices } = require("./utilities/geckoFetch.js");
const { GetPricesForToken } = require("./utilities/1inch.js");
const { CollectRewards } = require("./collectRewards.js");
//const settings = require('./constants/liquidator-config');
const { minTimeInMilliseconds, maxTimeInMilliseconds, useCoinGecko } = CONFIG;

// covalent, not accurate to get twab players
// const FetchPlayers = require("./utilities/players.js");

const section = chalk.hex("#47FDFB");

const claimerContract = CONTRACTS.CLAIMERSIGNER[CHAINNAME]

new ethers.Contract(
  ADDRESS[CHAINNAME].CLAIMER,
  ABI.CLAIMER,
  SIGNER
);

async function go() {
  console.log(section("----- starting claim bot ------"));
  console.log("time logged | ", Date.now());

  const claimsPromise = GetRecentClaims(CHAINID);
  const prizePoolDataPromise = GetPrizePoolData();

  // Set up the third promise based on the useCoinGecko flag
  const priceFetchPromise = useCoinGecko
    ? GeckoIDPrices([ADDRESS[CHAINNAME].PRIZETOKEN.GECKO, "ethereum"])
    : GetPricesForToken(ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS);

  // Use Promise.all to wait for all three promises to resolve
  const [claims, prizePoolData, priceData] = await Promise.all([
    claimsPromise,
    prizePoolDataPromise,
    priceFetchPromise,
  ]);

  console.log("got " + claims.length + " claim events ", "\n");

  // Extract the necessary data from prizePoolData
  const {
    lastDrawId,
    numberOfTiers,
    tierTimestamps,
    prizesForTier,
    //maxFee,
    tierPrizeValues,
    tierRemainingLiquidites,
    reserve,
  } = prizePoolData;

  let prizeTokenPrice, ethPrice;

  // If useCoinGecko is true, priceData is from GeckoIDPrices, otherwise it's the direct prize token price
  if (useCoinGecko) {
    prizeTokenPrice = priceData[0];
    ethPrice = priceData[1];
  } else {
    // If not using CoinGecko, priceData is directly the prizeTokenPrice
    prizeTokenPrice = priceData;
    // Assume you have another way to get ethPrice if necessary or it's not needed in this branch
  }

  console.log(section("----- contract data ------"));

  /*maxFee.forEach((fee, index) => {
    console.log("max fee for tier ", index, " -> ", parseInt(fee) / 1e18);
  });*/
  // console.log("prizes for Tier ",prizesForTier)

  let newWinners;
  console.log(section("----- getting winners -----"));

  if (CONFIG.USEAPI==="none") {
    // await SendClaims(claimerContract, lastDrawId, []);
// console.log("winners calculation not hooked up.  need to connect to getWinnersByTier")
newWinners=[] 
  newWinners = await GetWinnersByTier(
      CHAINNAME,
      numberOfTiers,
      lastDrawId,
      tierTimestamps,
      CONFIG.TIERSTOCLAIM,
      prizesForTier,
      "latest"
    );
  } else if(CONFIG.USEAPI==="g9"){
newWinners = await FetchG9ApiPrizes(CHAINID,ADDRESS[CHAINNAME].PRIZEPOOL,lastDrawId,CONFIG.TIERSTOCLAIM,claims)}
else {
    console.log("using pooltime api for winner calculations");
  

  newWinners = await FetchApiPrizes(
      CHAINID,
      lastDrawId,
      CONFIG.TIERSTOCLAIM,
      claims
    );
  }
  if (newWinners === null) {
    console.log("ERROR fetching API");
  } else {

let winVsClaimStats
    ({ updatedWinners: newWinners, stats:winVsClaimStats } = removeAlreadyClaimed(newWinners, claims, lastDrawId))
console.log("won vs claimed",winVsClaimStats)
    console.log("winners before removing claims", newWinners.length);
    console.log("winners after removing claims", newWinners.length);

    //  console.log(section("---- checking profitability -----"));
    // console.log("time logged | ",Date.now())
    await SendClaims(
      claimerContract,
      lastDrawId,
      newWinners,
      //maxFee,
      prizeTokenPrice,
      ethPrice
    );
    console.log("");
    console.log(section("----- rewards check and claim ------"));

    await CollectRewards(prizeTokenPrice, ethPrice);
  }

  console.log(
    "-------------------------------------------bot will run again in " +
      parseInt(minTimeInMilliseconds / 60000) +
      "min - " +
      parseInt(maxTimeInMilliseconds / 60000) +
      "min------------ "
  );
}


function removeAlreadyClaimed(winners, claims, drawId) {
  // Initialize statistics objects
  const tierStats = {
    totalPrizesByTier: {},
    claimedPrizesByTier: {},
  };

  // Filter claims for the specified drawId and prepare for efficient lookup
  const claimKeySet = new Set(claims.filter(claim => claim.drawId === drawId)
    .map(claim => `${claim.vault.toLowerCase()}-${claim.winner.toLowerCase()}-${claim.index}`));

  // Initialize and update stats based on winners
  winners.forEach(([, , tier, prizeIndices]) => {
    tierStats.totalPrizesByTier[tier] = (tierStats.totalPrizesByTier[tier] || 0) + prizeIndices.length;
  });

  const updatedWinners = winners.map(winner => {
    const [vault, person, tier, prizeIndices] = winner;

    const unclaimedPrizeIndices = prizeIndices.filter(prizeIndex => {
      const claimKey = `${vault.toLowerCase()}-${person.toLowerCase()}-${prizeIndex}`;
      return !claimKeySet.has(claimKey);
    });

    // Update claimed prizes stats
    const claimedCount = prizeIndices.length - unclaimedPrizeIndices.length;
    if (claimedCount > 0) {
      tierStats.claimedPrizesByTier[tier] = (tierStats.claimedPrizesByTier[tier] || 0) + claimedCount;
    }

    return [vault, person, tier, unclaimedPrizeIndices];
  }).filter(winner => winner[3].length > 0);

  return {
    updatedWinners,
    stats: tierStats
  };
}


/*
function removeAlreadyClaimed(winners, claims, drawId) {
  // Initialize statistics objects
  const tierStats = {
    totalPrizesByTier: {},
    claimedPrizesByTier: {},
  };
  // Filter the claims for the specified drawId
  const relevantClaims = claims.filter((claim) => claim.drawId === drawId);

  // Initialize the count of total prizes by tier from winners
  winners.forEach(([,, tier, prizeIndices]) => {

    // Increment total prizes for each prize index in the tier
    tierStats.totalPrizesByTier[tier] = (tierStats.totalPrizesByTier[tier] || 0) + prizeIndices.length;
  });

// Increment claims for each tier
relevantClaims.forEach((claim) => {
//  console.log(`Claim Tier: ${claim.tier}, Current Count: ${tierStats.claimedPrizesByTier[claim.tier] || 0}`);
  tierStats.claimedPrizesByTier[claim.tier] = (tierStats.claimedPrizesByTier[claim.tier] || 0) + 1;
});

  const updatedWinners = winners.map((winner) => {
    const [vault, person, tier, prizeIndices] = winner;

    // Filter out claimed prizes
    const unclaimedPrizeIndices = prizeIndices.filter(
      (prizeIndex) =>
        !relevantClaims.some(
          (claim) =>
            claim.vault.toLowerCase() === vault.toLowerCase() &&
            claim.winner.toLowerCase() === person.toLowerCase() &&
            claim.index === prizeIndex
        )
    );


    // Adjust the count of claimed prizes for the tier based on the difference
//    if (prizeIndices.length !== unclaimedPrizeIndices.length) {
  //    tierStats.claimedPrizesByTier[tier] = (tierStats.claimedPrizesByTier[tier] || 0) + (prizeIndices.length - unclaimedPrizeIndices.length);
   // }

    // Return the winner with only unclaimed prize indices
    return [vault, person, tier, unclaimedPrizeIndices];
  }).filter((winner) => winner[3].length > 0); // Remove winners with no unclaimed prizes

  // Return both the updated winners list and the statistics
  return {
    updatedWinners,
    stats: tierStats
  };
}
*/

async function executeAfterRandomTime(minTime, maxTime) {
  // Calculate a random time between minTime and maxTime
  const randomTime = minTime + Math.random() * (maxTime - minTime);

  setTimeout(async () => {
    try {
      await go();
    } catch (error) {
      console.error("Error occurred:", error);
    }
    // Recursively call the function to continue the cycle
    executeAfterRandomTime(minTime, maxTime);
  }, randomTime);
}

// go once
go();

// go randomly after init
executeAfterRandomTime(minTimeInMilliseconds, maxTimeInMilliseconds);
