const { CONFIG } = require("../constants/config");
const { ADDRESS } = require("../constants/address.js");
const { CONTRACTS } = require("../constants/contracts");
const { BuildTxForSwap } = require("../utilities/1inchSwap.js");
const { GasEstimate } = require("../utilities/gas.js");
const { ethers } = require("ethers");


const {getChainConfig } = require('../chains');

const CHAINNAME = getChainConfig().CHAINNAME;

async function UniFlashSwap(
  pairAddress,
  amtOut,
  gasBudget
) {
  const swapperFunctionName = "flashSwapExactAmountOut";
  const swapperArgs = [
    pairAddress,
    CONFIG.WALLET,
    amtOut.toString(),
    gasBudget.toString()
  ];
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

//console.log("passes gas test return for now");return
    const tryIt = await CONTRACTS.UNIFLASHLIQUIDATORSIGNER[CHAINNAME].flashSwapExactAmountOut(
      ...swapperArgs,
      { maxPriorityFeePerGas: "1000011", gasLimit: "1700000" }
    );
    const tryReceipt = await tryIt.wait();
    console.log(tryReceipt.transactionHash);
  }
}

async function OutAndBack(
  pairAddress,
  depositTokenAddress,
  amtOut,
  amtIn,
  gasBudget
) {
  console.log("swapper chain", CHAINNAME);
  const swapBackParam = {
    src: depositTokenAddress,
    dst: ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS,
    amount: amtOut.toString(),
    from: ADDRESS[CHAINNAME].SWAPPER,
    slippage: 1,
    disableEstimate: true, // Set to true to disable estimation of swap details
    allowPartialFill: false, // Set to true to allow partial filling of the swap order
  };
  console.log("swap params for 1inch swap back to pool", swapBackParam);

  const swapBack = await BuildTxForSwap(swapBackParam);

  console.log("1 inch swap data", swapBack);

  const swapData = swapBack.data;
  //const swapData = replaceAddressInCalldata(swapBack.data,"0xE5860FF1c57DDCEF024Cb43B37b8A20bfE4c9822",ADDRESS[CHAINNAME].SWAPPER)
  // console.log("1 inch SWAPBACK INFO", swapBack);
  const swapperFunctionName = "outAndBack";
  const swapperArgs = [
    pairAddress,
    amtOut.toString(),
    amtIn.toString(),
    swapData,
  ];
  console.log("swapper args", swapperArgs);
  const gasEstimate = await GasEstimate(
    CONTRACTS.SWAPPERSIGNER[CHAINNAME],
    swapperFunctionName,
    swapperArgs,
    CONFIG.PRIORITYFEE
  );
  if (gasEstimate.gt(gasBudget)) {
    console.log("not profitable including gas costs");
  } else {
console.log(CONTRACTS.SWAPPERSIGNER[CHAINNAME].address,"address for contract")
    //console.log("returning for debuuuug");return
    const tryIt = await CONTRACTS.SWAPPERSIGNER[CHAINNAME].outAndBack(
      ...swapperArgs,
      { maxPriorityFeePerGas: "1000011", gasLimit: "1700000" }
    );
    const tryReceipt = await tryIt.wait();
    console.log(tryReceipt.transactionHash);
const [gasSpent,totalTransactionCost ] = await getAlchemyReceipt(tryReceipt.transactionHash) 
 }
}

async function getAlchemyReceipt(hash){
  try {
    alchemyReceipt = await AlchemyTransactionReceipt(
      hash
    );
    // console.log("alchemy receipt", alchemyReceipt);
    L1transactionCost =
      Number(alchemyReceipt.result.l1Fee) / 1e18;
    console.log(
      "L2 Gas fees (in ETH) " +
        L2transactionCost +
        " L1 Gas fees (in ETH) " +
        L1transactionCost
    );

    totalTransactionCost = L2transactionCost + L1transactionCost;
    totalTransasactionCostDollar =
      totalTransactionCost * ethPrice;
    console.log(
      "Total Gas fees (in ETH) " +
        totalTransactionCost +
        "  $" +
        totalTransasactionCostDollar
    );

    gasSpent = parseFloat(
      ethers.utils.formatUnits(
        txReceipt.gasUsed.mul(txReceipt.effectiveGasPrice),
        18
      )
    );

    // todo this gas junk is no bueno
    console.log(
      "gas used",
      txReceipt.gasUsed.toString(),
      " effective gas price",
      ethers.utils.formatUnits(txReceipt.effectiveGasPrice, 18),
      " gas cost ",
      gasSpent
    );

    // totalGasSpent += gasSpent;
    return [gasSpent,totalTransactionCost]
    // console.log("tx receipt",txReceipt.getTransactionReceipt)
    // console.log("get tx",txReceipt.getTransaction)

    // txReceipt.logs.map((log,index)=>{console.log("log ",index," ",log,interface.parseLog(log))}
  } catch (e) {
    console.log("error on alchemy receipt", e);
  }
}

// example
const go = async () => {
  console.log(
    await BuildTxForSwap({
      src: "0x4200000000000000000000000000000000000006",
      dst: "0x395Ae52bB17aef68C2888d941736A71dC6d4e125",
      amount: "2693295755114884",
      //from: ADDRESS[CHAINNAME].SWAPPER,
      // hard coding while we try to get estimate
      from: "0xE5860FF1c57DDCEF024Cb43B37b8A20bfE4c9822",
      slippage: 1,
      disableEstimate: false, // Set to true to disable estimation of swap details
      allowPartialFill: false, // Set to true to allow partial filling of the swap order
    })
  );
};
//go()

module.exports = { UniFlashSwap};
