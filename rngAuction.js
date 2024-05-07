const { CONTRACTS } = require("./constants/contracts") 
//const { CONFIG, PROVIDERS, ADDRESS } = require("./constants");
const { CONFIG } = require("./constants/config");
const { PROVIDERS } = require("./constants/providers.js");
const { ADDRESS } = require("./constants/address.js");
const { GeckoIDPrices } = require("./utilities/geckoFetch.js");
const { Multicall } = require("./utilities/multicall.js");
const { GasEstimate } = require("./utilities/gas.js");

const ethers = require("ethers");

const RETRYTIME = CONFIG.RNGRETRY * 1000;
const DONTSEND = false // true to not send the txs

const prizeTokenSymbol = ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.SYMBOL;

async function checkAndCompleteRng() {
    const callsMain = [
        CONTRACTS.DRAWMANAGER[CONFIG.CHAINNAME].canStartDraw(),
        CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].getDrawIdToAward(),
        CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].getOpenDrawId(),
        CONTRACTS.DRAWMANAGER[CONFIG.CHAINNAME].auctionDuration(),
    ];

    try {
        const [canStartDraw, drawIdToAward, openDrawId, auctionDuration] = await Multicall(callsMain, CONFIG.CHAINNAME);
        const openDrawClosesAt = await CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].drawClosesAt(openDrawId);
        const drawToAwardClosedAt = await CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].drawClosesAt(drawIdToAward);

        console.log(`Open draw ${openDrawId} closes in ${timeUntil(openDrawClosesAt)}`);
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
        setTimeout(checkAndCompleteRng, RETRYTIME);
    }
}

async function handleExpiredDraw(openDrawClosesAt) {
    const waitTime = parseInt(openDrawClosesAt) * 1000 - Date.now() + 5200;
    if (waitTime > 0) {
        console.log(`Waiting ${waitTime / 1000} seconds until the next draw closes.`);
        setTimeout(checkAndCompleteRng, waitTime);
    }
}

async function handleOpenDraw(openDrawId) {
    try {
        const gasPrice = await PROVIDERS[CONFIG.CHAINNAME].getGasPrice();
        const [startDrawAward, estimateFee ]  = await Multicall([
            CONTRACTS.DRAWMANAGER[CONFIG.CHAINNAME].startDrawReward(),
            CONTRACTS.RNG[CONFIG.CHAINNAME].estimateRandomizeFee(gasPrice),
        ], CONFIG.CHAINNAME);

        console.log(`RNG auction is open, starting draw award: ${ethers.utils.formatUnits(startDrawAward,ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS)} ${prizeTokenSymbol}, payable fee estimate: ${ethers.utils.formatUnits(estimateFee,18)}`);


if (startDrawAward.gt(estimateFee)) {
        console.log(
          "Reward greater than ",
          estimateFee / 1e18,
          "ETH",
          " fee, lets check gas cost"
        );
        try {
          const args = [
            estimateFee.toString(),
            ADDRESS[CONFIG.CHAINNAME].DRAWMANAGER,
            CONFIG.WALLET,
            /*  {
            maxPriorityFeePerGas: "1000001",
            maxFeePerGas: "1000002",
            //gasLimit: 560000,
            value: estimateFee.toString(),
          },*/
          ];
          let web3TotalGasCost;
          try {
            web3TotalGasCost = await GasEstimate(
              CONTRACTS.RNGWITHSIGNER[CONFIG.CHAINNAME],
              "startDraw",
              args,
              CONFIG.PRIORITYFEE,
              { value: estimateFee.toString(), maxFeePerGas: 68000000 } // pass the fee value to send
            );
          } catch (e) {
            console.log("error sending RNG, we will retry");
            setTimeout(checkAndCompleteRng, RETRYTIME);
          }
          const totalStartDrawCost = web3TotalGasCost.add(estimateFee);

          if (startDrawAward.gt(totalStartDrawCost)) {
            if(DONTSEND){console.log("DONT SEND is on, returning before tx send");return}else{
            //console.log("est gas", web3TotalGasCost / 1e18, "ETH");
            const rngTx = await CONTRACTS.RNGWITHSIGNER[
              CONFIG.CHAINNAME
            ].startDraw(
              estimateFee.toString(),
              ADDRESS[CONFIG.CHAINNAME].DRAWMANAGER,
              CONFIG.WALLET,
              {
                maxPriorityFeePerGas: "1000001",
                maxFeePerGas: "68000000",
                //nonce: '157',
                //gasLimit: 560000,
                value: estimateFee.toString(),
              }
            );
            console.log("sending! pending tx confirmation....");
            const rngReceipt = await rngTx.wait();
            console.log("success tx hash ", rngReceipt.transactionHash);
            console.log("gas used ", rngReceipt.gasUsed.toString());
            setTimeout(checkAndCompleteRng, RETRYTIME);}
          } else {
            console.log(
              (totalStartDrawCost / 1e18).toFixed(7),
              "fee + gas  still exceeds ",
              (startDrawAward / 1e18).toFixed(7),
              " reward, will retry"
            );
            setTimeout(checkAndCompleteRng, RETRYTIME / 7);
          }
		}catch(e){console.log(e)}
        } else {
            console.log("NOT profitable with payable cost, retrying...");
            setTimeout(checkAndCompleteRng, RETRYTIME / 6);
        }
    } catch (e) {
        console.error("Error during open draw handling: ", e);
        setTimeout(checkAndCompleteRng, RETRYTIME);
    }
}
/*
async function executeTransaction(startDrawAward, estimateFee) {
    const formattedStartDrawAward = ethers.utils.parseUnits(startDrawAward, ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS);
    const formattedEstimateFee = ethers.utils.parseUnits(estimateFee, 'wei');

    console.log(`Attempting to execute transaction with start draw award: ${startDrawAward} and estimated fee: ${estimateFee}`);

    if (formattedStartDrawAward.gt(formattedEstimateFee)) {
        console.log(`Reward (${startDrawAward}) is greater than the estimated fee (${estimateFee}), proceeding with the transaction.`);
        try {
            const transactionArgs = [
                formattedEstimateFee.toString(),
                ADDRESS[CONFIG.CHAINNAME].DRAWMANAGER,
                CONFIG.WALLET,
                {
                    value: formattedEstimateFee.toString(),
                    gasLimit: ethers.utils.hexlify(600000), // Adjust gas limit as necessary
                    maxPriorityFeePerGas: ethers.utils.parseUnits(CONFIG.PRIORITYFEE, 'gwei'),
                    maxFeePerGas: ethers.utils.parseUnits('100', 'gwei') // Adjust based on network conditions
                }
            ];

            const transactionResponse = await CONTRACTS.RNGWITHSIGNER[CONFIG.CHAINNAME].startDraw(...transactionArgs);
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
    const canFinish = await CONTRACTS.DRAWMANAGER[CONFIG.CHAINNAME].canFinishDraw();
    if (canFinish) {
        const finishReward = await CONTRACTS.DRAWMANAGER[CONFIG.CHAINNAME].finishDrawReward();
        if (finishReward.gt(0)) {
            console.log(`Finish draw reward available: ${ethers.utils.formatUnits(finishReward, ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS)} ${prizeTokenSymbol}`);
            const gasEstimate = await GasEstimate(
                CONTRACTS.DRAWMANAGERWITHSIGNER[CONFIG.CHAINNAME],
                "finishDraw",
                [CONFIG.WALLET],
                CONFIG.PRIORITYFEE,
                {maxFeePerGas: 68000000}
            );

            if (gasEstimate.lt(finishReward)) {
                try {
                   if(DONTSEND){console.log("DONTSEND is true, not sending the tx");return}else{
                    const finishTx = await CONTRACTS.DRAWMANAGERWITHSIGNER[CONFIG.CHAINNAME].finishDraw(CONFIG.WALLET, {
                        maxPriorityFeePerGas: "1000000",
                        maxFeePerGas: "68000000",
                    });
                    console.log("Sending transaction, waiting for confirmation...");
                    const finishReceipt = await finishTx.wait();
                    console.log(`Success! Transaction hash: ${finishReceipt.transactionHash}`);
                    console.log(`Gas used: ${finishReceipt.gasUsed.toString()}`);
			setTimeout(checkAndCompleteRng, RETRYTIME);}
                } catch (e) {
                    console.error("Error executing finishDraw transaction:", e);
                }
            } else {
const gasCost = ethers.utils.formatUnits(gasEstimate, ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS);
const rewardAmount = ethers.utils.formatUnits(finishReward, ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS);
const rewardPercentage = (rewardAmount / gasCost) * 100;
console.log(`Reward covers ${rewardPercentage.toFixed(2)}% of the gas cost. Will retry...`);

                setTimeout(checkAndCompleteRng, RETRYTIME / 5);
            }
        } else {
            console.log("No finish draw reward available yet, will retry...");
            setTimeout(checkAndCompleteRng, RETRYTIME / 5);
        }
    } else {
        //console.log("Cannot finish draw yet, checking draw status...");
        if (drawIdToAward !== openDrawId) {
            console.log("Waiting for random number to finish fetching before finishing the draw");
            setTimeout(checkAndCompleteRng, RETRYTIME / 5);
        } else {
            const drawClosesAt = await CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].drawClosesAt(drawIdToAward);
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
