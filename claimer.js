const { loadChainConfig, getChainConfig } = require("./chains");

const chainKey = process.argv[2] || "";

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
const { CONTRACTS } = require("./constants/contracts.js");
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
const NodeCache = require("node-cache");
const nodeCache = new NodeCache();

const { minTimeInMilliseconds, maxTimeInMilliseconds, useCoinGecko } = CONFIG;
const useApiPriceOverride = true;

const section = chalk.hex("#47FDFB");

// Function to fetch and cache prize pool data
async function fetchAndCachePrizePoolData(drawId) {
  const cacheKey = `prizePoolData-${drawId}`;
  let cachedData = await nodeCache.get(cacheKey);

  if (cachedData) {
    console.log("Using cached prize pool data for draw ID:", drawId);
    return cachedData;
  } else {
    console.log("Fetching new prize pool data for draw ID:", drawId);
    const prizePoolData = await GetPrizePoolData();
    await nodeCache.set(cacheKey, prizePoolData, 24 * 60 * 60); // Cache for 24 hours
    return prizePoolData;
  }
}

async function go() {
  console.log(section("----- starting claim bot ------"));
  console.log("time logged | ", new Date().toLocaleTimeString());

  const claimsPromise = GetRecentClaims(CHAINID);
  //  const prizePoolDataPromise = GetPrizePoolData();

  // Set up the third promise based on the useCoinGecko flag
  const priceFetchPromise =
    useCoinGecko && !useApiPriceOverride
      ? GeckoIDPrices([ADDRESS[CHAINNAME].PRIZETOKEN.GECKO, "ethereum"])
      : fetch("https://poolexplorer.xyz/overview");

  // Use Promise.all to wait for all three promises to resolve
  const [claims, lastDraw /*prizePoolData*/, priceData] = await Promise.all([
    claimsPromise,
    CONTRACTS.PRIZEPOOL[CHAINNAME].getLastAwardedDrawId(),
    //prizePoolDataPromise,
    priceFetchPromise,
  ]);

  console.log("got " + claims.length + " claim events ", "\n");

  const prizePoolData = await fetchAndCachePrizePoolData(lastDraw);

  // Extract the necessary data from prizePoolData
  const {
    lastDrawId,
    numberOfTiers,
    tierTimestamps,
    prizesForTier,
    tierPrizeValues,
    tierRemainingLiquidites,
    //reserve,
  } = prizePoolData;

  let prizeTokenPrice, ethPrice;

  // If useCoinGecko is true, priceData is from GeckoIDPrices, otherwise it's the direct prize token price
  if (useCoinGecko && !useApiPriceOverride) {
    prizeTokenPrice = priceData[0];
    ethPrice = priceData[1];
  } else {
    const priceResponse = await priceData.json();
    prizeTokenPrice = priceResponse.prices.geckos["ethereum"];
    ethPrice = prizeTokenPrice;
    console.log("got price from api", prizeTokenPrice);
  }

  console.log(section("----- contract data ------"));

  let newWinners;
  console.log(section("----- getting winners -----"));

  if (CONFIG.USEAPI === "none") {
    newWinners = await GetWinnersByTier(
      CHAINNAME,
      numberOfTiers,
      lastDrawId,
      tierTimestamps,
      CONFIG.TIERSTOCLAIM,
      prizesForTier,
      "latest"
    );
  } else if (CONFIG.USEAPI === "g9") {
    newWinners = await FetchG9ApiPrizes(
      CHAINID,
      ADDRESS[CHAINNAME].PRIZEPOOL,
      lastDrawId,
      CONFIG.TIERSTOCLAIM,
      claims
    );
  } else {
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
    let winVsClaimStats;
    ({ updatedWinners: newWinners, stats: winVsClaimStats } =
      removeAlreadyClaimed(newWinners, claims, lastDrawId));
    console.log("won vs claimed", winVsClaimStats);
    console.log("winners before removing claims", newWinners.length);
    console.log("winners after removing claims", newWinners.length);

    await SendClaims(lastDrawId, newWinners, prizeTokenPrice, ethPrice);
    console.log("");
    console.log(section("----- rewards check and claim ------"));

    await CollectRewards(prizeTokenPrice, ethPrice);
  }

  console.log("Execution completed at", new Date().toLocaleTimeString());
  scheduleNextRun(); // Schedule the next execution
}

function removeAlreadyClaimed(winners, claims, drawId) {
  // Initialize statistics objects
  const tierStats = {
    totalPrizesByTier: {},
    claimedPrizesByTier: {},
  };

  // Filter claims for the specified drawId and prepare for efficient lookup
  const filteredClaims = claims.filter((claim) => claim.drawId === drawId);
  const claimKeySet = new Set(
    filteredClaims.map(
      (claim) =>
        `${claim.vault.toLowerCase()}-${claim.winner.toLowerCase()}-${
          claim.tier
        }-${claim.index}`
    )
  );

  // Initialize and update stats based on winners
  winners.forEach(([, , tier, prizeIndices]) => {
    tierStats.totalPrizesByTier[tier] =
      (tierStats.totalPrizesByTier[tier] || 0) + prizeIndices.length;
  });

  const updatedWinners = winners
    .map((winner) => {
      const [vault, person, tier, prizeIndices] = winner;

      // Filter out claimed prize indices
      const unclaimedPrizeIndices = prizeIndices.filter((prizeIndex) => {
        const claimKey = `${vault.toLowerCase()}-${person.toLowerCase()}-${tier}-${prizeIndex}`;
        const isClaimed = claimKeySet.has(claimKey);

        return !isClaimed;
      });

      // Update claimed prizes stats
      const claimedCount = prizeIndices.length - unclaimedPrizeIndices.length;
      if (claimedCount > 0) {
        tierStats.claimedPrizesByTier[tier] =
          (tierStats.claimedPrizesByTier[tier] || 0) + claimedCount;
      }

      // Only include winners with unclaimed prizes
      return [vault, person, tier, unclaimedPrizeIndices];
    })
    .filter((winner) => winner[3].length > 0);

  return {
    updatedWinners,
    stats: tierStats,
  };
}

function scheduleNextRun() {
  // Calculate a random time between minTime and maxTime
  const randomTime =
    minTimeInMilliseconds +
    Math.random() * (maxTimeInMilliseconds - minTimeInMilliseconds);

  // Determine the time in minutes or seconds
  const timeInMinutes = randomTime / 60000;
  const timeInSeconds = randomTime / 1000;

  // Format the time until the next execution
  let formattedTime;
  if (timeInMinutes >= 1) {
    formattedTime = `${Math.round(timeInMinutes)} min`;
  } else {
    formattedTime = `${Math.round(timeInSeconds)} sec`;
  }

  // Calculate the next execution time
  const nextExecutionTime = new Date(Date.now() + randomTime);
  const formattedNextExecutionTime = nextExecutionTime.toLocaleTimeString();

  console.log(
    "-------------------------------------------bot will run again in " +
      formattedTime +
      " (" +
      formattedNextExecutionTime +
      ") ------------ "
  );

  setTimeout(() => {
    go(); // Run the main function again
  }, randomTime);
}

// Start the first execution immediately
go();
