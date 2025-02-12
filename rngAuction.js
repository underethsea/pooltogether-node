const { loadChainConfig, getChainConfig } = require("./chains");

const chainKey = process.argv[2] || "";

try {
  loadChainConfig(chainKey);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`);
  process.exit(1);
}

const { CONTRACTS } = require("./constants/contracts");
const { CONFIG } = require("./constants/config");
const { PROVIDERS } = require("./constants/providers.js");
const { ADDRESS } = require("./constants/address.js");
const { GeckoIDPrices } = require("./utilities/geckoFetch.js");
const { Multicall } = require("./utilities/multicall.js");
const { GasEstimate } = require("./utilities/gas.js");
const NodeCache = require("node-cache");
const cache = new NodeCache();
const ethers = require("ethers");

const CHAINNAME = getChainConfig().CHAINNAME;
const CHAINID = getChainConfig().CHAINID;
const MANUAL_GAS_LIMIT = 1150000;
const RETRYTIME = CONFIG.RNGRETRY * 1000;
const DONTSEND = false; // true to not send the txs

const prizeTokenSymbol = ADDRESS[CHAINNAME].PRIZETOKEN.SYMBOL;
const prizeTokenGeckoId = ADDRESS[CHAINNAME].PRIZETOKEN.GECKO;

const FORFREE = false; // !!!!!!!!!!!!! bypasses profitability and sends auctions regardless of cost/reward

// Determine if we are on Gnosis Chain
const isGnosisChain = CHAINNAME === "GNOSIS" || CHAINID === "100";


let PRIORITYFEE = CONFIG.PRIORITYFEE
if(CHAINNAME === "GNOSIS") {PRIORITYFEE="1"}
if(CHAINNAME === "SCROLL") {PRIORITYFEE=".0001"}
let PRIORITYFEEPARSED = ethers.utils.parseUnits(PRIORITYFEE,9).toString()

// Fetch the prize token price and Ethereum price
async function fetchPrices() {
console.log(`Fetching prices for ${prizeTokenGeckoId} on ${CHAINNAME}`);
  if (prizeTokenGeckoId === "ethereum" | prizeTokenGeckoId === "weth") {
    return { ethPrice: 1, prizeTokenPrice: 1 }; // If prize token is Ethereum, no need to fetch prices
  }
// For Gnosis Chain (xDAI), treat xDAI as having a price of $1
  if (isGnosisChain) {
    return { ethPrice: 1, prizeTokenPrice: 1 }; // xDAI is pegged to $1
  }

  try {
    const prices = await GeckoIDPrices([prizeTokenGeckoId, "ethereum"]);
    const ethPrice = prices[1];
console.log("eth price",ethPrice)

    const prizeTokenPrice = prices[0];
console.log("prize token price",prizeTokenPrice)
    if (!prizeTokenPrice || !ethPrice) {
      console.log(`Failed to fetch prices for ${prizeTokenSymbol} or ETH.`);
      return null;
    }
    return { ethPrice, prizeTokenPrice };
  } catch (error) {
    console.error("Error fetching prices:", error);
    return null;
  }
}

function cacheDrawData(drawId, data) {
  const timestamp = Date.now();
  console.log(`Caching data for draw ${drawId} at ${new Date(timestamp).toISOString()}`);
  cache.set(`${drawId}_${timestamp}`, data, 86400); // Store data with a TTL of 1 day (86400 seconds)
}

function getCachedDrawData(drawId) {
  const keys = cache.keys().filter((key) => key.startsWith(drawId));
  const data = keys.map((key) => ({ key, data: cache.get(key) }));
  if (data.length) {
    console.log(`Cache hits for draw ${drawId}`);
  } else {
    console.log(`Cache miss for draw ${drawId}`);
  }
  return data;
}

function calculateNextCheck(drawId) {
  const cachedData = getCachedDrawData(drawId);
  console.log("cached data length", cachedData.length);
  if (cachedData.length < 2) return RETRYTIME;

  const observations = cachedData.map((d) => ({
    time: parseInt(d.key.split("_")[1], 10),
    percentage: (parseFloat(d.data.startDrawAward) / parseFloat(d.data.totalStartDrawCost)) * 100,
  }));

  observations.sort((a, b) => a.time - b.time);

  const latestObservation = observations[observations.length - 1];
  const initialObservation = observations.find((obs) => obs.time <= latestObservation.time - 120000); // Observations over 2 minutes

  if (!initialObservation) return RETRYTIME;

  const timeElapsed = (latestObservation.time - initialObservation.time) / 60000; // Convert ms to minutes
  const percentageIncrease = latestObservation.percentage - initialObservation.percentage;
  const percentageLeft = 100 - latestObservation.percentage;

  if (percentageIncrease <= 0) return RETRYTIME;

  const estimatedMinutesLeft = (percentageLeft / percentageIncrease) * timeElapsed;
  const safeCheckTime = estimatedMinutesLeft / 3;

  if (safeCheckTime < 2) return 2 * 60000;

  return safeCheckTime * 60000; // Convert minutes back to ms
}

async function checkAndCompleteRng() {
  const callsMain = [
    CONTRACTS.DRAWMANAGER[CHAINNAME].canStartDraw(),
    CONTRACTS.PRIZEPOOL[CHAINNAME].getDrawIdToAward(),
    CONTRACTS.PRIZEPOOL[CHAINNAME].getOpenDrawId(),
    CONTRACTS.DRAWMANAGER[CHAINNAME].auctionDuration(),
  ];
  let nextCheckTime;
  try {
    const [canStartDraw, drawIdToAward, openDrawId, auctionDuration] = await Multicall(callsMain, CHAINNAME);
    nextCheckTime = parseInt(calculateNextCheck(openDrawId));
    console.log("next check time", nextCheckTime);
    console.log("Getting draw data...");
    const openDrawClosesAt = await CONTRACTS.PRIZEPOOL[CHAINNAME].drawClosesAt(openDrawId);
    const drawToAwardClosedAt = await CONTRACTS.PRIZEPOOL[CHAINNAME].drawClosesAt(drawIdToAward);

    console.log(`Open draw ${openDrawId} closes in ${timeUntil(openDrawClosesAt)}`);
    if (Date.now() / 1000 - drawToAwardClosedAt > (auctionDuration*2)) {
      console.log("Draw auction has expired");
      await handleExpiredDraw(openDrawClosesAt);
    } else {
      if (canStartDraw) {
        await handleOpenDraw(openDrawId);
      } else {
        console.log("RNG auction closed");
        await handleCloseDraw(drawIdToAward, openDrawId);
      }
    }
  } catch (e) {
    console.error("Error during RNG check: ", e);
    setTimeout(checkAndCompleteRng, nextCheckTime);
  }
}

async function handleOpenDraw(openDrawId) {
  try {
    const gasPrice = await PROVIDERS[CHAINNAME].getGasPrice();
    const [startDrawAward, estimateFee] = await Multicall(
      [
        CONTRACTS.DRAWMANAGER[CHAINNAME].startDrawReward(),
        CONTRACTS.RNG[CHAINNAME].estimateRandomizeFee(gasPrice),
      ],
      CHAINNAME
    );

    // Fetch the prize token and Ethereum prices
    const prices = await fetchPrices();
    if (!prices) {
      console.log("Skipping action as pricing could not be determined.");
      return;
    }

    const { ethPrice, prizeTokenPrice } = prices;
    const startDrawAwardInEth = ethers.utils.formatUnits(startDrawAward, ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS) * prizeTokenPrice / ethPrice;

    console.log(
      `RNG auction is open, starting draw award: ${ethers.utils.formatUnits(
        startDrawAward,
        ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS
      )} ${prizeTokenSymbol} (~$${(startDrawAwardInEth * ethPrice).toFixed(2)}), payable fee estimate: ${ethers.utils.formatUnits(
        estimateFee,
        18
      )} ETH`
    );

    const costPercentage = startDrawAwardInEth * 100 / ethers.utils.formatUnits(estimateFee, 18);
    if (startDrawAwardInEth > ethers.utils.formatUnits(estimateFee, 18) || FORFREE) {
      console.log("Reward greater than estimated fee, let's check gas cost.");
      try {
        const args = [
          CHAINNAME === "BASESEPOLIA" ? estimateFee.div(10).toString() : estimateFee.div(500).toString(),
          ADDRESS[CHAINNAME].DRAWMANAGER,
          CONFIG.WALLET,
        ];
        let web3TotalGasCost;
        let feeData;
        let maxFeeWithBuffer;
        try {
          feeData = await PROVIDERS[CHAINNAME].getFeeData();
          maxFeeWithBuffer = feeData.lastBaseFeePerGas.mul(105).div(100);

          web3TotalGasCost = await GasEstimate(
            CONTRACTS.RNGWITHSIGNER[CHAINNAME],
            "startDraw",
            args,
            PRIORITYFEE,
            {
              value: estimateFee.toString(),
            },
            MANUAL_GAS_LIMIT
          );
        } catch (e) {
          console.log("Error sending RNG, we will retry");
          setTimeout(checkAndCompleteRng, RETRYTIME);
        }

        const totalStartDrawCost = estimateFee.add(web3TotalGasCost);
        const rewardInfo = {
          startDrawAward: startDrawAward.toString(),
          estimateFee: estimateFee.toString(),
          totalStartDrawCost: totalStartDrawCost.toString(),
          timestamp: Date.now(),
        };
        cacheDrawData(openDrawId, rewardInfo);

        if (startDrawAward.gt(totalStartDrawCost) || FORFREE) {
          if (DONTSEND) {
            console.log("DONT SEND is on, returning before tx send");
            return;
          } else {

            const rngTx = await CONTRACTS.RNGWITHSIGNER[CHAINNAME].startDraw(
              estimateFee.toString(),
              ADDRESS[CHAINNAME].DRAWMANAGER,
              CONFIG.WALLET,
              {
                maxPriorityFeePerGas: PRIORITYFEEPARSED,
                value: estimateFee.toString(),
              }
            );
            console.log("Sending! Pending tx confirmation....");
            const rngReceipt = await rngTx.wait();
            console.log("Success! tx hash ", rngReceipt.transactionHash);
            console.log("Gas used ", rngReceipt.gasUsed.toString());
            setTimeout(checkAndCompleteRng, RETRYTIME);
          }
        } else {
          console.log(
            `Reward ${startDrawAwardInEth.toFixed(7)} ETH ($${(startDrawAwardInEth * ethPrice).toFixed(2)}) is short of rng + gas ${ethers.utils.formatUnits(
              totalStartDrawCost,
              18
            )} ETH (${((startDrawAwardInEth / ethers.utils.formatUnits(totalStartDrawCost, 18)) * 100).toFixed(2)}%)`
          );
          setTimeout(checkAndCompleteRng, RETRYTIME / 7);
        }
      } catch (e) {
        console.log(e);
      }
    } else {
      console.log(
        `Not profitable with reward covering ${costPercentage.toFixed(2)}% of the cost, retrying...`
      );
      setTimeout(checkAndCompleteRng, RETRYTIME / 6);
    }
  } catch (e) {
    console.error("Error during open draw handling: ", e);
    setTimeout(checkAndCompleteRng, RETRYTIME);
  }
}

const MAX_TIMEOUT = 2147483647; // Max timeout for setTimeout (~24.8 days)
const POLLING_INTERVAL = 1000 * 60 * 10; // Polling interval (10 minutes)

async function handleExpiredDraw(openDrawClosesAt) {
  const targetTime = parseInt(openDrawClosesAt) * 1000 + 7200; // Target timestamp in ms

  const checkTime = () => {
    const currentTime = Date.now();
    const remainingTime = targetTime - currentTime;

    if (remainingTime <= 0) {
      console.log("Wait is over, checking auction...");
      checkAndCompleteRng(); // Replace with your actual function
    } else if (remainingTime > MAX_TIMEOUT) {
      console.log(`Waiting ~${Math.ceil(MAX_TIMEOUT / (1000 * 60 * 60 * 24))} days (max timeout chunk).`);
      setTimeout(checkTime, MAX_TIMEOUT);
    } else {
      console.log(`Waiting ${remainingTime / 1000} seconds until the next draw closes.`);
      setTimeout(checkTime, remainingTime); // Final short timeout
    }
  };

  checkTime(); // Start the check process
}

async function handleCloseDraw(drawIdToAward, openDrawId) {
  const feeData = await PROVIDERS[CHAINNAME].getFeeData();
  const canFinish = await CONTRACTS.DRAWMANAGER[CHAINNAME].canFinishDraw();
  if (canFinish) {
    const finishReward = await CONTRACTS.DRAWMANAGER[CHAINNAME].finishDrawReward();
    if (finishReward.gt(0)) {
      console.log(
        `Finish draw reward available: ${ethers.utils.formatUnits(
          finishReward,
          ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS
        )} ${prizeTokenSymbol}`
      );

console.log("PRIORITYFEEE",PRIORITYFEE,"feeData.maxFeePerGas",feeData.maxFeePerGas.toString())
      const gasEstimate = await GasEstimate(
        CONTRACTS.DRAWMANAGERWITHSIGNER[CHAINNAME],
        "finishDraw",
        [CONFIG.WALLET],
        PRIORITYFEE,
        {
          maxFeePerGas: feeData.maxFeePerGas,
        }
      );

      if (gasEstimate.lt(finishReward) || FORFREE) {
        try {
          if (DONTSEND) {
            console.log("DONTSEND is true, not sending the tx");
            return;
          } else {
            const finishTx = await CONTRACTS.DRAWMANAGERWITHSIGNER[CHAINNAME].finishDraw(CONFIG.WALLET, {
              maxPriorityFeePerGas: PRIORITYFEEPARSED,
                  maxFeePerGas: feeData.maxFeePerGas,
   });
            console.log("Sending transaction, waiting for confirmation...");
            const finishReceipt = await finishTx.wait();
            console.log(`Success! Transaction hash: ${finishReceipt.transactionHash}`);
            console.log(`Gas used: ${finishReceipt.gasUsed.toString()}`);
            setTimeout(checkAndCompleteRng, RETRYTIME);
          }
        } catch (e) {
          console.error("Error executing finishDraw transaction:", e);
        }
      } else {
        const gasCost = ethers.utils.formatUnits(
          gasEstimate,
          ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS
        );
        const rewardAmount = ethers.utils.formatUnits(
          finishReward,
          ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS
        );
        const rewardPercentage = (rewardAmount / gasCost) * 100;
        console.log(
          `Reward covers ${rewardPercentage.toFixed(2)}% of the gas cost. Will retry...`
        );

        setTimeout(checkAndCompleteRng, RETRYTIME / 5);
      }
    } else {
      console.log("No finish draw reward available yet, will retry...");
      setTimeout(checkAndCompleteRng, RETRYTIME / 5);
    }
  } else {
    if (drawIdToAward !== openDrawId) {
      console.log("Waiting for random number to finish fetching before finishing the draw");
      setTimeout(checkAndCompleteRng, RETRYTIME / 5);
    } else {
      const drawClosesAt = await CONTRACTS.PRIZEPOOL[CHAINNAME].drawClosesAt(drawIdToAward);
      const waitTime = parseInt(drawClosesAt) * 1000 - Date.now() + 1000;
      if (waitTime > 0) {
        console.log(`Waiting ${waitTime / 1000} seconds until the next draw closes.`);
        setTimeout(checkAndCompleteRng, waitTime);
      } else {
        console.log("Retry in a moment...");
        setTimeout(checkAndCompleteRng, RETRYTIME);
      }
    }
  }
}

function timeUntil(timestamp) {
  const now = Date.now();
  const difference = timestamp * 1000 - now;
  if (difference < 0) return "The timestamp is in the past!";
  const minutes = Math.floor(difference / 60000);
  const seconds = Math.floor((difference % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

checkAndCompleteRng();
