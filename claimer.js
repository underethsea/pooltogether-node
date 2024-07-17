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
const useApiPriceOverride = true 
// covalent, not accurate to get twab players
// const FetchPlayers = require("./utilities/players.js");

const section = chalk.hex("#47FDFB");


async function go() {
  console.log(section("----- starting claim bot ------"));
  console.log("time logged | ", Date.now());

  const claimsPromise = GetRecentClaims(CHAINID);
  const prizePoolDataPromise = GetPrizePoolData();

  // Set up the third promise based on the useCoinGecko flag
   const priceFetchPromise = useCoinGecko && !useApiPriceOverride
    ? GeckoIDPrices([ADDRESS[CHAINNAME].PRIZETOKEN.GECKO, "ethereum"])
  : fetch("https://poolexplorer.xyz/overview")
//  : GetPricesForToken(ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS);

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
  if (useCoinGecko && !useApiPriceOverride) {
    prizeTokenPrice = priceData[0];
    ethPrice = priceData[1];
  } else {
    // If not using CoinGecko, priceData is directly the prizeTokenPrice
    // prizeTokenPrice = priceData;
    const priceResponse = await priceData.json()
    prizeTokenPrice = priceResponse.prices.geckos["ethereum"]
ethPrice = prizeTokenPrice   
console.log("got price from api",prizeTokenPrice)  
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
  const filteredClaims = claims.filter(claim => claim.drawId === drawId);
  const claimKeySet = new Set(
    filteredClaims.map(claim => `${claim.vault.toLowerCase()}-${claim.winner.toLowerCase()}-${claim.tier}-${claim.index}`)
  );

  // Initialize and update stats based on winners
  winners.forEach(([, , tier, prizeIndices]) => {
    tierStats.totalPrizesByTier[tier] = (tierStats.totalPrizesByTier[tier] || 0) + prizeIndices.length;
  });

  const updatedWinners = winners.map(winner => {
    const [vault, person, tier, prizeIndices] = winner;

    // Filter out claimed prize indices
    const unclaimedPrizeIndices = prizeIndices.filter(prizeIndex => {
      const claimKey = `${vault.toLowerCase()}-${person.toLowerCase()}-${tier}-${prizeIndex}`;
      const isClaimed = claimKeySet.has(claimKey);

      return !isClaimed;
    });

    // Update claimed prizes stats
    const claimedCount = prizeIndices.length - unclaimedPrizeIndices.length;
    if (claimedCount > 0) {
      tierStats.claimedPrizesByTier[tier] = (tierStats.claimedPrizesByTier[tier] || 0) + claimedCount;
    }

    // Only include winners with unclaimed prizes
    return [vault, person, tier, unclaimedPrizeIndices];
  }).filter(winner => winner[3].length > 0);


  return {
    updatedWinners,
    stats: tierStats,
  };
}

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
