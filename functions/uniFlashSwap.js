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

const { ethers } = require("ethers");
const { CONFIG } = require("../constants/config");
const { ADDRESS } = require("../constants/address.js");
const { CONTRACTS } = require("../constants/contracts");
const { GasEstimate } = require("../utilities/gas.js");

const CHAINNAME = getChainConfig().CHAINNAME;

// Function to create swap path and its encoded version
function createSwapPath(tokenIn, tokenOut, fee = 3000) {
  // Create the swap path array
  const swapPath = [tokenIn, fee, tokenOut];

  // Encode the swap path
  const swapPathEncoded = ethers.utils.solidityPack(
    ["address", "uint24", "address"],
    swapPath
  );

  return { swapPath, swapPathEncoded };
}

async function UniFlashSwap(pairAddress, amtOut, gasBudget) {
  const swapperFunctionName = "flashSwapExactAmountOut";
  const swapperArgs = [pairAddress, CONFIG.WALLET, amtOut.toString(), "1"];
  console.log("swapper args", swapperArgs);
  const gasEstimate = await GasEstimate(
    CONTRACTS.UNIFLASHLIQUIDATORSIGNER[CHAINNAME],
    swapperFunctionName,
    swapperArgs,
    CONFIG.PRIORITYFEE
  );
  if (gasEstimate.gt(gasBudget)) {
    console.log("not profitable including gas costs");
  } else {
    const tryIt = await CONTRACTS.UNIFLASHLIQUIDATORSIGNER[
      CHAINNAME
    ].flashSwapExactAmountOut(...swapperArgs, {
      maxPriorityFeePerGas: "1000011",
      gasLimit: "1000000",
    });
    const tryReceipt = await tryIt.wait();
    console.log(tryReceipt.transactionHash);
  }
}

async function FlashLiquidate(
  pairAddress,
  tokenIn,
  tokenOut,
  profitThresholdETH,
  fee = 3000
) {
  try {
    // Create swap path and encode it
    const { swapPath, swapPathEncoded } = createSwapPath(
      tokenIn,
      tokenOut,
      fee
    );
    //console.log("swap path?",swapPathEncoded)
    // Get the best quote
    //console.log("pairAddress",pairAddress)
    console.log(CHAINNAME);
    const bestQuote = await CONTRACTS.FLASHLIQUIDATORSIGNER[
      CHAINNAME
    ].callStatic.findBestQuoteStatic(pairAddress, swapPathEncoded);
    //console.log("got quote?")
    // Define flash liquidation parameters
    const flashLiquidateParams = {
      liquidationPairAddress: pairAddress,
      receiver: CONFIG.WALLET,
      amountOut: bestQuote.amountOut,
      amountInMax: bestQuote.amountIn.mul(101).div(100), // +1% slippage
      profitMin: bestQuote.profit.mul(98).div(100), // -2% slippage
      deadline: Math.floor(Date.now() / 1000) + 60, // +1 min
      swapPath: swapPathEncoded,
    };
    //console.log("best quote profit",bestQuote.profit.toString())
    //console.log("profit threshold ETH",profitThresholdETH.toString())
    //console.log("gas estaimte",gasEstimate.toString())
    //   console.log("flash liquidate params", flashLiquidateParams);
    //console.log("amount in max",flashLiquidateParams.amountInMax.toString())
    //console.log("profit min",flashLiquidateParams.profitMin.toString())
    // Estimate gas cost
    if (bestQuote.profit.gt(0)) {
      const gasEstimate = await GasEstimate(
        CONTRACTS.FLASHLIQUIDATORSIGNER[CHAINNAME],
        "flashLiquidate",
        [
          flashLiquidateParams.liquidationPairAddress,
          flashLiquidateParams.receiver,
          flashLiquidateParams.amountOut.toString(),
          flashLiquidateParams.amountInMax.toString(),
          flashLiquidateParams.profitMin.toString(),
          flashLiquidateParams.deadline.toString(),
          flashLiquidateParams.swapPath,
        ],
        CONFIG.PRIORITYFEE,
        {}, // options
        690000 // gaslimit
      );
      console.log("gas estimate", gasEstimate.toString());
      const gasAndProfit = gasEstimate.add(profitThresholdETH);
      if (bestQuote.profit.lt(gasAndProfit)) {
        console.log("not profitable including gas costs");
      } else {
        //return // return for testing
        const tryIt = await CONTRACTS.FLASHLIQUIDATORSIGNER[
          CHAINNAME
        ].flashLiquidate(
          flashLiquidateParams.liquidationPairAddress,
          flashLiquidateParams.receiver,
          flashLiquidateParams.amountOut.toString(),
          flashLiquidateParams.amountInMax.toString(),
          flashLiquidateParams.profitMin.toString(),
          flashLiquidateParams.deadline.toString(),
          flashLiquidateParams.swapPath,
          { maxPriorityFeePerGas: "1000011", gasLimit: "1700000" }
        );
        const tryReceipt = await tryIt.wait();
        console.log(tryReceipt.transactionHash);
      }
    } else {
      console.log("not profitable");
    }
  } catch (e) {
    console.log("Error in FlashLiquidate", e);
  }
}

// Example usage
const go = async () => {
  // Example usage of createSwapPath function
  const liquidationPair = "0xeebdd08a67130e3a56e30ef950d56033b7d1d9f1";
  const tokenIn = "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452"; // OP address
  const tokenOut = "0x4200000000000000000000000000000000000006"; // WETH address
  const fee = 100; // 0.01% fee
  const profitThreshold = ethers.utils.parseUnits(".00001", 18);
  //async function FlashLiquidate(pairAddress, tokenIn, tokenOut, profitThresholdETH, fee = 3000) {
  const tx = await FlashLiquidate(
    liquidationPair,
    tokenIn,
    tokenOut,
    profitThreshold,
    fee
  );
};

//go();

module.exports = { UniFlashSwap, FlashLiquidate };
