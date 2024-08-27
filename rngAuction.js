const { loadChainConfig, getChainConfig } = require("./chains");

const chainKey = process.argv[2] || "";

try {
  // Load the configuration with the provided chainKey or default
  loadChainConfig(chainKey);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`);
  process.exit(1);
}

const { CONTRACTS } = require("./constants/contracts");
//const { CONFIG, PROVIDERS, ADDRESS } = require("./constants");
const { CONFIG } = require("./constants/config");
const { PROVIDERS } = require("./constants/providers.js");
const { ADDRESS } = require("./constants/address.js");
// const { GeckoIDPrices } = require("./utilities/geckoFetch.js");
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

const FORFREE = false; // !!!!!!!!!!!!! bypasses profitability and sends auctions regardless of cost/reward

function cacheDrawData(drawId, data) {
  const timestamp = Date.now();
  console.log(
    `Caching data for draw ${drawId} at ${new Date(timestamp).toISOString()}`
  );
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
    percentage:
      (parseFloat(d.data.startDrawAward) /
        parseFloat(d.data.totalStartDrawCost)) *
      100,
  }));

  observations.sort((a, b) => a.time - b.time);

  const latestObservation = observations[observations.length - 1];
  const initialObservation = observations.find(
    (obs) => obs.time <= latestObservation.time - 120000
  ); // Observations over 2 minutes

  if (!initialObservation) return RETRYTIME;

  const timeElapsed =
    (latestObservation.time - initialObservation.time) / 60000; // Convert ms to minutes
  const percentageIncrease =
    latestObservation.percentage - initialObservation.percentage;
  const percentageLeft = 100 - latestObservation.percentage;

  if (percentageIncrease <= 0) return RETRYTIME;

  const estimatedMinutesLeft =
    (percentageLeft / percentageIncrease) * timeElapsed;
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
    const [canStartDraw, drawIdToAward, openDrawId, auctionDuration] =
      await Multicall(callsMain, CHAINNAME);
    nextCheckTime = parseInt(calculateNextCheck(openDrawId));
    console.log("next check time", nextCheckTime);
    console.log("Getting draw data...");
    const openDrawClosesAt = await CONTRACTS.PRIZEPOOL[CHAINNAME].drawClosesAt(
      openDrawId
    );
    const drawToAwardClosedAt = await CONTRACTS.PRIZEPOOL[
      CHAINNAME
    ].drawClosesAt(drawIdToAward);

    console.log(
      `Open draw ${openDrawId} closes in ${timeUntil(openDrawClosesAt)}`
    );
    if (Date.now() / 1000 - drawToAwardClosedAt > auctionDuration) {
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

    console.log(
      `RNG auction is open, starting draw award: ${ethers.utils.formatUnits(
        startDrawAward,
        ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS
      )} ${prizeTokenSymbol}, payable fee estimate: ${ethers.utils.formatUnits(
        estimateFee,
        18
      )}`
    );

    const costPercentage = startDrawAward.mul(100).div(estimateFee);
    if (startDrawAward.gt(estimateFee) || FORFREE) {
      console.log(
        "Reward greater than ",
        estimateFee / 1e18,
        "ETH",
        " fee, let's check gas cost"
      );
      try {
        const args = [
          CHAINNAME === "BASESEPOLIA"
            ? estimateFee.div(10).toString()
            : estimateFee.div(500).toString(),
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
            CONFIG.PRIORITYFEE,
            {
              value: estimateFee.toString(),
              //maxFeePerGas: maxFeeWithBuffer
            },
            MANUAL_GAS_LIMIT
          );
        } catch (e) {
          console.log("Error sending RNG, we will retry");
          setTimeout(checkAndCompleteRng, RETRYTIME);
        }

        // temp override to not include gas
        //        const totalStartDrawCost = web3TotalGasCost.add(estimateFee);

        const totalStartDrawCost = estimateFee.add(web3TotalGasCost);
        const rewardInfo = {
          startDrawAward: startDrawAward.toString(),
          estimateFee: estimateFee.toString(),
          totalStartDrawCost: totalStartDrawCost.toString(),
          timestamp: Date.now(),
        };
        cacheDrawData(openDrawId, rewardInfo);
        console.log("start award", startDrawAward.toString());
        console.log("ttoal start cost", totalStartDrawCost.toString());
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
                maxPriorityFeePerGas: "1000001",
                //maxFeePerGas: maxFeeWithBuffer,
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
            "Reward ",
            (startDrawAward / 1e18).toFixed(7),
            "is short of rng + gas",
            (totalStartDrawCost / 1e18).toFixed(7),
            "(" +
              (
                (startDrawAward / 1e18 / (totalStartDrawCost / 1e18)) *
                100
              ).toFixed(2) +
              "%)"
          );
          setTimeout(checkAndCompleteRng, RETRYTIME / 7);
        }
      } catch (e) {
        console.log(e);
      }
    } else {
      console.log(
        `Not profitable with reward covering ${costPercentage.toNumber()}% of the cost, retrying...`
      );
      setTimeout(checkAndCompleteRng, RETRYTIME / 6);
    }
  } catch (e) {
    console.error("Error during open draw handling: ", e);
    setTimeout(checkAndCompleteRng, RETRYTIME);
  }
}

async function handleExpiredDraw(openDrawClosesAt) {
  const waitTime = parseInt(openDrawClosesAt) * 1000 - Date.now() + 7200;
  if (waitTime > 0) {
    console.log(
      `Waiting ${waitTime / 1000} seconds until the next draw closes.`
    );
    setTimeout(checkAndCompleteRng, waitTime);
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
    //console.log("estimate fee",estimateFee.toString())
    console.log(
      `RNG auction is open, starting draw award: ${ethers.utils.formatUnits(
        startDrawAward,
        ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS
      )} ${prizeTokenSymbol}, payable fee estimate: ${ethers.utils.formatUnits(
        estimateFee,
        18
      )}`
    );
    // Calculate percentage of the reward covered by the total cost
    const costPercentage = startDrawAward.mul(100).div(estimateFee);
    if (startDrawAward.gt(estimateFee) || FORFREE) {
      console.log(
        "Reward greater than ",
        estimateFee / 1e18,
        "ETH",
        " fee, lets check gas cost"
      );
      try {
        const args = [
          CHAINNAME === "BASESEPOLIA"
            ? estimateFee.div(10).toString()
            : estimateFee.toString(),
          ADDRESS[CHAINNAME].DRAWMANAGER,
          CONFIG.WALLET,
        ];
        let web3TotalGasCost;
        let feeData;
        let maxFeeWithBuffer;
        try {
          feeData = await PROVIDERS[CHAINNAME].getFeeData();

          maxFeeWithBuffer = feeData.lastBaseFeePerGas.mul(105).div(100);

          //console.log(temp.lastBaseFeePerGas.toString())

          web3TotalGasCost = await GasEstimate(
            CONTRACTS.RNGWITHSIGNER[CHAINNAME],
            "startDraw",
            args,
            CONFIG.PRIORITYFEE,

            {
              value: estimateFee.toString(),
              // maxFeePerGas:  CHAINNAME === "ARBSEPOLIA" ? 17537000000 : 90000000  // pass the fee value to send
              // maxFeePerGas: maxFeeWithBuffer
            },
            MANUAL_GAS_LIMIT
          );
        } catch (e) {
          console.log("error sending RNG, we will retry");
          setTimeout(checkAndCompleteRng, RETRYTIME);
        }

        //temp oerride
        const totalStartDrawCost = web3TotalGasCost.add(estimateFee);

        //const totalStartDrawCost = estimateFee.mul(2)
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
            //console.log("est gas", web3TotalGasCost / 1e18, "ETH");
            const rngTx = await CONTRACTS.RNGWITHSIGNER[CHAINNAME].startDraw(
              estimateFee.toString(),
              ADDRESS[CHAINNAME].DRAWMANAGER,
              CONFIG.WALLET,
              {
                maxPriorityFeePerGas: "1000001",
                //maxFeePerGas: maxFeeWithBuffer,
                //maxFeePerGas: CHAINNAME === "ARBSEPOLIA" ? 17537000000 : 68000000,
                //nonce: '157',
                //gasLimit: 560000,
                value: estimateFee.toString(),
                gasLimit: MANUAL_GAS_LIMIT.toString(),
              }
            );
            console.log("sending! pending tx confirmation....");
            const rngReceipt = await rngTx.wait();
            console.log("success tx hash ", rngReceipt.transactionHash);
            console.log("gas used ", rngReceipt.gasUsed.toString());
            setTimeout(checkAndCompleteRng, RETRYTIME);
          }
        } else {
          console.log(
            "reward ",
            (startDrawAward / 1e18).toFixed(7),
            "is short of rng + gas",
            (totalStartDrawCost / 1e18).toFixed(7),
            "(" +
              (
                (startDrawAward / 1e18 / (totalStartDrawCost / 1e18)) *
                100
              ).toFixed(2) +
              "%)"
          );
          setTimeout(checkAndCompleteRng, RETRYTIME / 7);
        }
      } catch (e) {
        console.log(e);
      }
    } else {
      console.log(
        `Not profitable with reward covering ${costPercentage.toNumber()}% of the cost, retrying...`
      );
      setTimeout(checkAndCompleteRng, RETRYTIME / 6);
    }
  } catch (e) {
    console.error("Error during open draw handling: ", e);
    setTimeout(checkAndCompleteRng, RETRYTIME);
  }
}
/*
async function executeTransaction(startDrawAward, estimateFee) {
    const formattedStartDrawAward = ethers.utils.parseUnits(startDrawAward, ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS);
    const formattedEstimateFee = ethers.utils.parseUnits(estimateFee, 'wei');

    console.log(`Attempting to execute transaction with start draw award: ${startDrawAward} and estimated fee: ${estimateFee}`);

    if (formattedStartDrawAward.gt(formattedEstimateFee)) {
        console.log(`Reward (${startDrawAward}) is greater than the estimated fee (${estimateFee}), proceeding with the transaction.`);
        try {
            const transactionArgs = [
                formattedEstimateFee.toString(),
                ADDRESS[CHAINNAME].DRAWMANAGER,
                CONFIG.WALLET,
                {
                    value: formattedEstimateFee.toString(),
                    gasLimit: ethers.utils.hexlify(600000), // Adjust gas limit as necessary
                    maxPriorityFeePerGas: ethers.utils.parseUnits(CONFIG.PRIORITYFEE, 'gwei'),
                    maxFeePerGas: ethers.utils.parseUnits('100', 'gwei') // Adjust based on network conditions
                }
            ];

            const transactionResponse = await CONTRACTS.RNGWITHSIGNER[CHAINNAME].startDraw(...transactionArgs);
            console.log('Transaction sent, waiting for confirmation...');
            const receipt = await transactionResponse.wait();
            console.log(`Transaction confirmed with hash: ${receipt.transactionHash}`);
        } catch (error) {
            console.error('Transaction failed:', error);
            setTimeout(checkAndCompleteRng, RETRYTIME);
        }
    } else {
        console.log('Not executing transaction as the fee exceeds the reward.');
        setTimeout(checkAndCompleteRng, RETRYTIME / 2); // Adjust retry logic as necessary
    }
}
*/
async function handleCloseDraw(drawIdToAward, openDrawId) {
  const feeData = await PROVIDERS[CHAINNAME].getFeeData();
  //console.log(feeData)
  const canFinish = await CONTRACTS.DRAWMANAGER[CHAINNAME].canFinishDraw();
  if (canFinish) {
    const finishReward = await CONTRACTS.DRAWMANAGER[
      CHAINNAME
    ].finishDrawReward();
    if (finishReward.gt(0)) {
      console.log(
        `Finish draw reward available: ${ethers.utils.formatUnits(
          finishReward,
          ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS
        )} ${prizeTokenSymbol}`
      );

      const gasEstimate = await GasEstimate(
        CONTRACTS.DRAWMANAGERWITHSIGNER[CHAINNAME],
        "finishDraw",
        [CONFIG.WALLET],
        CONFIG.PRIORITYFEE,
        {
          //maxFeePerGas: CHAINNAME === "ARBSEPOLIA" ? 17537000000 : 68000000
          maxFeePerGas: feeData.maxFeePerGas,
        }
      );

      if (gasEstimate.lt(finishReward) || FORFREE) {
        try {
          if (DONTSEND) {
            console.log("DONTSEND is true, not sending the tx");
            return;
          } else {
            const finishTx = await CONTRACTS.DRAWMANAGERWITHSIGNER[
              CHAINNAME
            ].finishDraw(CONFIG.WALLET, {
              maxPriorityFeePerGas: "1000000",
              //maxFeePerGas: CHAINNAME === "ARBSEPOLIA" ? 17537000000 : 68000000,
            });
            console.log("Sending transaction, waiting for confirmation...");
            const finishReceipt = await finishTx.wait();
            console.log(
              `Success! Transaction hash: ${finishReceipt.transactionHash}`
            );
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
          `Reward covers ${rewardPercentage.toFixed(
            2
          )}% of the gas cost. Will retry...`
        );

        setTimeout(checkAndCompleteRng, RETRYTIME / 5);
      }
    } else {
      console.log("No finish draw reward available yet, will retry...");
      setTimeout(checkAndCompleteRng, RETRYTIME / 5);
    }
  } else {
    //console.log("Cannot finish draw yet, checking draw status...");
    if (drawIdToAward !== openDrawId) {
      console.log(
        "Waiting for random number to finish fetching before finishing the draw"
      );
      setTimeout(checkAndCompleteRng, RETRYTIME / 5);
    } else {
      const drawClosesAt = await CONTRACTS.PRIZEPOOL[CHAINNAME].drawClosesAt(
        drawIdToAward
      );
      const waitTime = parseInt(drawClosesAt) * 1000 - Date.now() + 1000;
      if (waitTime > 0) {
        console.log(
          `Waiting ${waitTime / 1000} seconds until the next draw closes.`
        );
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
