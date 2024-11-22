const { CONFIG } = require("../constants/config");
const { ADDRESS } = require("../constants/address.js");
const { CONTRACTS } = require("../constants/contracts");
const { BuildTxForSwap } = require("../utilities/1inchSwap.js");
const { GasEstimate } = require("../utilities/gas.js");
const { ethers } = require("ethers");
const { AlchemyTransactionReceipt } = require("../utilities/alchemy");
const ParaswapQuote = require("./paraswapQuote")
const {OdosQuote,OdosAssembleTransaction} = require("./odosQuote")
const {getChainConfig } = require('../chains');

const CHAINNAME = getChainConfig().CHAINNAME;
const CHAINID = getChainConfig().CHAINID

function replaceAddressInCalldata(data, originalAddress, replacementAddress) {
  // Ensure addresses are properly checksummed
  originalAddress = ethers.utils.getAddress(originalAddress);
  replacementAddress = ethers.utils.getAddress(replacementAddress);

  // Convert addresses to stripped, lowercase form (remove '0x' prefix)
  let strippedOriginal = originalAddress.slice(2).toLowerCase();
  let strippedReplacement = replacementAddress.slice(2).toLowerCase();

  // Replace and return the updated calldata
  return data.split(strippedOriginal).join(strippedReplacement);
}

async function PrizeSwim(pairAddress,
  vaultAddress,
  amtOut,
  amtIn,
  profitThreshold){
  const swimArgs =  [
      pairAddress,
      amtOut.toString(),
      amtIn.toString(),
      vaultAddress,
    ];

   // console.log('Prize token exchange args:', swimArgs);
//console.log("---------------------------------------",CONTRACTS.SWAPPERSIGNER[CHAINNAME])
 const gasEstimate = await GasEstimate(
          CONTRACTS.SWAPPERSIGNER[CHAINNAME],
          'prizeSwim',
          swimArgs,
          CONFIG.PRIORITYFEE
        )
const netOutput = amtOut.sub(gasEstimate)
if(netOutput.gt(amtIn.add(profitThreshold))){

 const tryIt = await CONTRACTS.SWAPPERSIGNER[CHAINNAME].prizeSwim(
        ...swimArgs,
        { maxPriorityFeePerGas: '1000011', gasLimit: '1700000' }
      );
      const tryReceipt = await tryIt.wait();
      console.log(tryReceipt.transactionHash);
}else {console.log("transaction not profitable including gas costs.")}

}
async function LapThePoolBestOption(pairAddress,
  vaultAddress,
  depositTokenAddress,
  pairDecimals,
  amtOut,
  amtIn,
  profitThreshold
) {
  try {

    const [paraswapResult, odosResult] = await Promise.allSettled([
      ParaswapQuote(CHAINID, CONFIG.SWAPPERS[CHAINNAME], depositTokenAddress, pairDecimals,
        amtOut.toString(), ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS, ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS),
      OdosQuote(CHAINID, CONFIG.SWAPPERS[CHAINNAME], depositTokenAddress, amtOut.toString(),
        ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS)
    ]);

    let paraswap, odos, odosData, odosOutput, paraswapOutput, paraswapData;

    if (paraswapResult.status === 'fulfilled') {
      paraswap = paraswapResult.value;
      paraswapOutput = ethers.BigNumber.from(paraswap.priceRoute.destAmount);
      paraswapData = paraswap.txParams.data;
    } else {
      console.error('Paraswap Quote failed:', paraswapResult.reason);
    }

    if (odosResult.status === 'fulfilled') {
      odos = odosResult.value;
      console.log(odos.pathId);
      odosData = await OdosAssembleTransaction(CONFIG.SWAPPERS[CHAINNAME], odos.pathId);
      odosOutput = ethers.BigNumber.from(odos.outAmounts[0]);
    } else {
      console.error('Odos Quote failed:', odosResult.reason);
    }

    if (!paraswap && !odos) {
      console.error('Both quotes failed. Exiting function.');
      return;
    }
    const swapperArgs = paraswap ? [
      pairAddress,
      amtOut.toString(),
      amtIn.toString(),
      vaultAddress,
      paraswapData,
    ] : null;

    const odosArgs = odos ? [
      pairAddress,
      amtOut.toString(),
      amtIn.toString(),
      vaultAddress,
      odosData.transaction.data,
    ] : null;

   // console.log('Paraswap Args:', swapperArgs);
//console.log("odos data",odosData)    
//console.log('Odos Args:', odosArgs);

    let paraswapGasEstimate, odosGasEstimate;
    const gasEstimatePromises = [];

    if (paraswap) {
      gasEstimatePromises.push(
        GasEstimate(
          CONTRACTS.SWAPPERSIGNER[CHAINNAME],
          'lapThePoolParaswap',
          swapperArgs,
          CONFIG.PRIORITYFEE
        ).then(result => ({ type: 'paraswap', value: result })).catch(error => ({ type: 'paraswap', error }))
      );
    }

    if (odos) {
      gasEstimatePromises.push(
        GasEstimate(
          CONTRACTS.SWAPPERSIGNER[CHAINNAME],
          'lapThePoolOdos',
          odosArgs,
          CONFIG.PRIORITYFEE
        ).then(result => ({ type: 'odos', value: result })).catch(error => ({ type: 'odos', error }))
      );
    }

    const gasEstimates = await Promise.all(gasEstimatePromises);

    gasEstimates.forEach(estimate => {
      if (estimate.type === 'paraswap') {
        if (estimate.error) {
          console.error('Paraswap Gas Estimate failed:', estimate.error);
        } else {
          paraswapGasEstimate = estimate.value;
        }
      } else if (estimate.type === 'odos') {
        if (estimate.error) {
          console.error('Odos Gas Estimate failed:', estimate.error);
        } else {
          odosGasEstimate = estimate.value;
        }
      }
    });

    let grossOdos, grossParaswap
    let grossLog = ''
    if (odos && odosGasEstimate) {
      grossOdos = odosOutput.sub(odosGasEstimate);
      grossLog = 'odos after gas: '+ grossOdos.toString();
    }

    if (paraswap && paraswapGasEstimate) {
      grossParaswap = paraswapOutput.sub(paraswapGasEstimate);
      grossLog += ' paraswap after gas: '+ grossParaswap.toString();
    }
    console.log(grossLog)
    let bestOption, bestGrossOutput, bestArgs, bestFunctionName;

    if (grossOdos && grossParaswap) {
      if (grossOdos.gt(grossParaswap)) {
        bestOption = 'odos';
        bestGrossOutput = grossOdos;
        bestArgs = odosArgs;
        bestFunctionName = 'lapThePoolOdos';
        //console.log('ODOS WINS');
      } else {
        bestOption = 'paraswap';
        bestGrossOutput = grossParaswap;
        bestArgs = swapperArgs;
        bestFunctionName = 'lapThePoolParaswap';
        //console.log('PARASWAP WINS');
      }
    } else if (grossOdos) {
      bestOption = 'odos';
      bestGrossOutput = grossOdos;
      bestArgs = odosArgs;
      bestFunctionName = 'lapThePoolOdos';
      console.log('Only ODOS quote succeeded.');
    } else if (grossParaswap) {
      bestOption = 'paraswap';
      bestGrossOutput = grossParaswap;
      bestArgs = swapperArgs;
      bestFunctionName = 'lapThePoolParaswap';
      console.log('Only PARASWAP quote succeeded.');
    }

    if (bestGrossOutput && bestGrossOutput.gt(amtIn.add(profitThreshold))) {
   // console.log('profitable!');return
      console.log(`Executing ${bestOption.toUpperCase()} transaction`);
      const tryIt = await CONTRACTS.SWAPPERSIGNER[CHAINNAME][bestFunctionName](
        ...bestArgs,
        { maxPriorityFeePerGas: '1000011', gasLimit: '1700000' }
      );
      const tryReceipt = await tryIt.wait();
      console.log(tryReceipt.transactionHash);
      const [gasSpent, totalGasSpent] = await getAlchemyReceipt(tryReceipt.transactionHash);
    } else {
      console.log(`${bestOption.toUpperCase()} transaction not profitable including gas costs.`);
    }

  } catch (e) {
    console.error('Unexpected error:', e);
  }
}



async function LapThePoolParaswap(
  pairAddress,
  vaultAddress,
  depositTokenAddress,
  pairDecimals,
  amtOut,
  amtIn,
  profitThreshold
) {
//  console.log("swapper chain", CHAINNAME);
 /* const swapBackParam = {
    src: depositTokenAddress,
    dst: ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS,
    amount: amtOut.toString(),
    from: CONFIG.SWAPPERS[CHAINNAME],
    //from: "0xE5860FF1c57DDCEF024Cb43B37b8A20bfE4c9822",
    slippage: 1,
    disableEstimate: true, // Set to true to disable estimation of swap details
    allowPartialFill: false, // Set to true to allow partial filling of the swap order
  };
  //console.log("swap params for 1inch swap back to pool", swapBackParam);
*/
/*
interfaces.......
async function ParaswapQuote(network, userAddress, srcToken, srcDecimals, amount, destToken, destDecimals, slippage=100) {
const paraswapGo = await LapThePoolParaswap(
pairAddress,
                    vaultAddress,
                    pairOutAsset,
                    pairDecimals,
                    bestOptionOut,
                    maxToSendWithSlippage,
)*/

/*console.log("chain",CHAINID)
console.log("swapper address",CONFIG.SWAPPERS[CHAINNAME])
console.log("dep token",depositTokenAddress)
console.log("amt",amtOut.toString())
console.log("prize toke",ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS)
console.log(ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS)
*/

const paraswap = await ParaswapQuote(CHAINID,CONFIG.SWAPPERS[CHAINNAME],depositTokenAddress,pairDecimals,
amtOut.toString(),ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS,ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS)

//console.log(paraswap)
//console.log("paraswap amount returned",paraswap.priceRoute.destAmount)
const paraswapOutput = ethers.BigNumber.from(paraswap.priceRoute.destAmount)
const swapData = paraswap.txParams.data
//console.log("paraswap data",swapData)

//const swapBack = await BuildTxForSwap(swapBackParam);

  // console.log("1 inch swap data", swapBack);

  //const swapData = swapBack.data;
  //const swapData = replaceAddressInCalldata(swapBack.data,"0xE5860FF1c57DDCEF024Cb43B37b8A20bfE4c9822",CONFIG.SWAPPERS[CHAINNAME])
  //console.log("1 inch SWAPBACK INFO", swapBack);
  const swapperFunctionName = "lapThePoolParaswap";

  const swapperArgs = [
    pairAddress,
    amtOut.toString(),
    amtIn.toString(),
    vaultAddress,
    swapData,
  ];

  console.log("paraswapper args", swapperArgs);

  const gasEstimate = await GasEstimate(
    CONTRACTS.SWAPPERSIGNER[CHAINNAME],
    swapperFunctionName,
    swapperArgs,
    CONFIG.PRIORITYFEE
  );
  //if (gasEstimate.gt(gasBudget)) {

//console.log("amtIn",amtIn.toString())
//console.log("prof threshold",profitThreshold.toString())
//console.log("amt in + profit thresh",amtIn.add(profitThreshold).toString())
//console.log("gas est",gasEstimate.toString())
//console.log("paraswap out",paraswapOutput.toString())
// profitability
if(amtIn.add(profitThreshold).gt(paraswapOutput.sub(gasEstimate))){   
 console.log("not profitable including gas costs");
  } else {
    //console.log("returning for debuuuug");return
    const tryIt = await CONTRACTS.SWAPPERSIGNER[CHAINNAME].lapThePoolParaswap(
      ...swapperArgs,
      { maxPriorityFeePerGas: "1000011", gasLimit: "1700000" }
    );
    const tryReceipt = await tryIt.wait();
    console.log(tryReceipt.transactionHash);
const [gasSpent,totalGasSpent] = await getAlchemyReceipt(tryReceipt.transactionHash)
  }
}


async function LapThePool(
  pairAddress,
  vaultAddress,
  depositTokenAddress,
  amtOut,
  amtIn,
  gasBudget
) {
//  console.log("swapper chain", CHAINNAME);
  const swapBackParam = {
    src: depositTokenAddress,
    dst: ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS,
    amount: amtOut.toString(),
    from: CONFIG.SWAPPERS?.[CHAINNAME],
    //from: "0xE5860FF1c57DDCEF024Cb43B37b8A20bfE4c9822",
    slippage: 1,
    disableEstimate: true, // Set to true to disable estimation of swap details
    allowPartialFill: false, // Set to true to allow partial filling of the swap order
  };
  //console.log("swap params for 1inch swap back to pool", swapBackParam);

  const swapBack = await BuildTxForSwap(swapBackParam);

  // console.log("1 inch swap data", swapBack);

  const swapData = swapBack.data;
  //const swapData = replaceAddressInCalldata(swapBack.data,"0xE5860FF1c57DDCEF024Cb43B37b8A20bfE4c9822",CONFIG.SWAPPERS[CHAINNAME])
  //console.log("1 inch SWAPBACK INFO", swapBack);
  const swapperFunctionName = "lapThePoolOneInch";
  const swapperArgs = [
    pairAddress,
    amtOut.toString(),
    amtIn.toString(),
    vaultAddress,
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
    console.log("returning for debuuuug");return
    const tryIt = await CONTRACTS.SWAPPERSIGNER[CHAINNAME].lapThePoolOneInch(
      ...swapperArgs,
      { maxPriorityFeePerGas: "1000011", gasLimit: "1700000" }
    );
    const tryReceipt = await tryIt.wait();
    console.log(tryReceipt.transactionHash);
const [gasSpent,totalGasSpent] = await getAlchemyReceipt(tryReceipt.transactionHash)
  }
}


async function OutAndBackBestOption(
  pairAddress,
  depositTokenAddress,
  pairDecimals,
  amtOut,
  amtIn,
  profitThreshold
) {
  try {
    const [paraswapResult, odosResult] = await Promise.allSettled([
      ParaswapQuote(
        CHAINID,
        CONFIG.SWAPPERS[CHAINNAME],
        depositTokenAddress,
        pairDecimals,
        amtOut.toString(),
        ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS,
        ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS
      ),
      OdosQuote(
        CHAINID,
        CONFIG.SWAPPERS[CHAINNAME],
        depositTokenAddress,
        amtOut.toString(),
        ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS
      )
    ]);

    let paraswap, odos, odosData, odosOutput, paraswapOutput, paraswapData;

    if (paraswapResult.status === 'fulfilled') {
      paraswap = paraswapResult.value;
      paraswapOutput = ethers.BigNumber.from(paraswap.priceRoute.destAmount);
      paraswapData = paraswap.txParams.data;
    } else {
      console.error('Paraswap Quote failed:', paraswapResult.reason);
    }

    if (odosResult.status === 'fulfilled') {
      odos = odosResult.value;
      console.log(odos.pathId);
      odosData = await OdosAssembleTransaction(CONFIG.SWAPPERS[CHAINNAME], odos.pathId);
      odosOutput = ethers.BigNumber.from(odos.outAmounts[0]);
    } else {
      console.error('Odos Quote failed:', odosResult.reason);
    }

    if (!paraswap && !odos) {
      console.error('Both quotes failed. Exiting function.');
      return;
    }

    const swapperArgsParaswap = paraswap ? [
      pairAddress,
      amtOut.toString(),
      amtIn.toString(),
      paraswapData,
    ] : null;

    const swapperArgsOdos = odos ? [
      pairAddress,
      amtOut.toString(),
      amtIn.toString(),
      odosData.transaction.data,
    ] : null;

    //console.log('Paraswap Args:', swapperArgsParaswap);
    //console.log('Odos Args:', swapperArgsOdos);

    let paraswapGasEstimate, odosGasEstimate;
    const gasEstimatePromises = [];

    if (paraswap) {
      gasEstimatePromises.push(
        GasEstimate(
          CONTRACTS.SWAPPERSIGNER[CHAINNAME],
          'outAndBackParaswap',
          swapperArgsParaswap,
          CONFIG.PRIORITYFEE
        ).then(result => ({ type: 'paraswap', value: result })).catch(error => ({ type: 'paraswap', error }))
      );
    }

    if (odos) {
      gasEstimatePromises.push(
        GasEstimate(
          CONTRACTS.SWAPPERSIGNER[CHAINNAME],
          'outAndBackOdos',
          swapperArgsOdos,
          CONFIG.PRIORITYFEE
        ).then(result => ({ type: 'odos', value: result })).catch(error => ({ type: 'odos', error }))
      );
    }

    const gasEstimates = await Promise.all(gasEstimatePromises);

    gasEstimates.forEach(estimate => {
      if (estimate.type === 'paraswap') {
        if (estimate.error) {
          console.error('Paraswap Gas Estimate failed:', estimate.error);
        } else {
          paraswapGasEstimate = estimate.value;
        }
      } else if (estimate.type === 'odos') {
        if (estimate.error) {
          console.error('Odos Gas Estimate failed:', estimate.error);
        } else {
          odosGasEstimate = estimate.value;
        }
      }
    });

    let grossOdos, grossParaswap, grossLog

    if (odos && odosGasEstimate) {
      grossOdos = odosOutput.sub(odosGasEstimate);
      grossLog = 'odos after gas: '+ grossOdos.toString();
    }

    if (paraswap && paraswapGasEstimate) {
      grossParaswap = paraswapOutput.sub(paraswapGasEstimate);
     grossLog += '  paraswap after gas:' + grossParaswap.toString();
    }
if(grossLog.length>0){console.log(grossLog)}
    let bestOption, bestGrossOutput, bestArgs, bestFunctionName;

    if (grossOdos && grossParaswap) {
      if (grossOdos.gt(grossParaswap)) {
        bestOption = 'odos';
        bestGrossOutput = grossOdos;
        bestArgs = swapperArgsOdos;
        bestFunctionName = 'outAndBackOdos';
      } else {
        bestOption = 'paraswap';
        bestGrossOutput = grossParaswap;
        bestArgs = swapperArgsParaswap;
        bestFunctionName = 'outAndBackParaswap';
      }
    } else if (grossOdos) {
      bestOption = 'odos';
      bestGrossOutput = grossOdos;
      bestArgs = swapperArgsOdos;
      bestFunctionName = 'outAndBackOdos';
      console.log('Only ODOS quote succeeded.');
    } else if (grossParaswap) {
      bestOption = 'paraswap';
      bestGrossOutput = grossParaswap;
      bestArgs = swapperArgsParaswap;
      bestFunctionName = 'outAndBackParaswap';
      console.log('Only PARASWAP quote succeeded.');
    }

    if (bestGrossOutput && bestGrossOutput.gt(amtIn.add(profitThreshold))) {
      console.log(`Executing ${bestOption.toUpperCase()} transaction`);
      const tryIt = await CONTRACTS.SWAPPERSIGNER[CHAINNAME][bestFunctionName](
        ...bestArgs,
        { maxPriorityFeePerGas: '1000011', gasLimit: '1700000' }
      );
      const tryReceipt = await tryIt.wait();
      console.log(tryReceipt.transactionHash);
      const [gasSpent, totalGasSpent] = await getAlchemyReceipt(tryReceipt.transactionHash);
    } else {
      console.log(`${bestOption.toUpperCase()} transaction not profitable including gas costs.`);
    }

  } catch (e) {
    console.error('Unexpected error:', e);
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
    from: CONFIG.SWAPPERS[CHAINNAME],
    slippage: 1,
    disableEstimate: true, // Set to true to disable estimation of swap details
    allowPartialFill: false, // Set to true to allow partial filling of the swap order
  };
  console.log("swap params for 1inch swap back to pool", swapBackParam);

  const swapBack = await BuildTxForSwap(swapBackParam);

  //console.log("1 inch swap data", swapBack);

  const swapData = swapBack.data;
  //const swapData = replaceAddressInCalldata(swapBack.data,"0xE5860FF1c57DDCEF024Cb43B37b8A20bfE4c9822",CONFIG.SWAPPERS[CHAINNAME])
  // console.log("1 inch SWAPBACK INFO", swapBack);
  const swapperFunctionName = "outAndBackOneInch";
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
    const tryIt = await CONTRACTS.SWAPPERSIGNER[CHAINNAME].outAndBackOneInch(
      ...swapperArgs,
      { maxPriorityFeePerGas: "1000011", gasLimit: "1700000" }
    );
    const tryReceipt = await tryIt.wait();
    console.log(tryReceipt.transactionHash);
    const [gasSpent,totalGasSpent] = await getAlchemyReceipt(tryReceipt.transactionHash)
  }
}


async function OutAndBackParaswap(
  pairAddress,
  depositTokenAddress,
  pairDecimals,
  amtOut,
  amtIn,
  profitThreshold
) {
  console.log("swapper chain", CHAINNAME);
/*  const swapBackParam = {
    src: depositTokenAddress,
    dst: ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS,
    amount: amtOut.toString(),
    from: CONFIG.SWAPPERS[CHAINNAME],
    slippage: 1,
    disableEstimate: true, // Set to true to disable estimation of swap details
    allowPartialFill: false, // Set to true to allow partial filling of the swap order
  };
  console.log("swap params for 1inch swap back to pool", swapBackParam);
*/
const paraswap = await ParaswapQuote(CHAINID,CONFIG.SWAPPERS[CHAINNAME],depositTokenAddress,pairDecimals,
amtOut.toString(),ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS,ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS)
//console.log(paraswap)
//console.log("paraswap amount returned",paraswap.priceRoute.destAmount)
const paraswapOutput = ethers.BigNumber.from(paraswap.priceRoute.destAmount)
const swapData = paraswap.txParams.data
//console.log("paraswap data",swapData)

  //const swapData = replaceAddressInCalldata(swapBack.data,"0xE5860FF1c57DDCEF024Cb43B37b8A20bfE4c9822",CONFIG.SWAPPERS[CHAINNAME])
  // console.log("1 inch SWAPBACK INFO", swapBack);
  const swapperFunctionName = "outAndBackParaswap";
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
 // if (gasEstimate.gt(gasBudget)) {

/*
console.log("amtIn",amtIn.toString())
console.log("prof threshold",profitThreshold.toString())
console.log("amt in plus profit thresh",amtIn.add(profitThreshold).toString())
console.log("gas est",gasEstimate.toString())
console.log("paraswap out",paraswapOutput.toString())
console.log("output minus gas",paraswapOutput.sub(gasEstimate).toString())
*/

// profitability
if(amtIn.add(profitThreshold).gt(paraswapOutput.sub(gasEstimate))){   
 console.log("not profitable including gas costs");
  } else {
console.log(CONTRACTS.SWAPPERSIGNER[CHAINNAME].address,"address for contract")
    console.log("returning for debuuuug");return
    const tryIt = await CONTRACTS.SWAPPERSIGNER[CHAINNAME].outAndBackOneInch(
      ...swapperArgs,
      { maxPriorityFeePerGas: "1000011", gasLimit: "1700000" }
    );
    const tryReceipt = await tryIt.wait();
    console.log(tryReceipt.transactionHash);
    const [gasSpent,totalGasSpent] = await getAlchemyReceipt(tryReceipt.transactionHash)
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
      //from: CONFIG.SWAPPERS[CHAINNAME],
      // hard coding while we try to get estimate
      from: "0xE5860FF1c57DDCEF024Cb43B37b8A20bfE4c9822",
      slippage: 1,
      disableEstimate: false, // Set to true to disable estimation of swap details
      allowPartialFill: false, // Set to true to allow partial filling of the swap order
    })
  );
};
//go()

module.exports = { LapThePool,OutAndBack,LapThePoolParaswap,
OutAndBackParaswap, LapThePoolBestOption, OutAndBackBestOption,
PrizeSwim
 };
