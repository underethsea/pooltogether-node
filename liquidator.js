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
const CHAINID = getChainConfig().CHAINID
const { CONTRACTS } = require("./constants/contracts.js");
const { ADDRESS } = require("./constants/address.js");
const { PROVIDERS, SIGNER } = require("./constants/providers.js");
const { ABI } = require("./constants/abi.js");
const { CONFIG } = require("./constants/config.js");

const { GetLogs } = require("./utilities/getLogs.js");
const { Multicall } = require("./utilities/multicall.js");
const { GeckoIDPrices } = require("./utilities/geckoFetch.js");
const { AlchemyTransactionReceipt } = require("./utilities/alchemy");
const { GetPricesForToken } = require("./utilities/1inch");
const { GasEstimate } = require("./utilities/gas.js");
const { PrizeSwim, LapThePoolBestOption, OutAndBackBestOption, LapThePool, LapThePoolParaswap, OutAndBack, OutAndBackParaswap } = require("./functions/swapper.js");
const { UniFlashSwap} = require("./functions/uniFlashSwap.js")
// const { Get1inchQuote } = require("./utilities/1inchQuote");
// const { BuildTxForSwap } = require("./utilities/1inchSwap.js");
const { uniV2LPPriceInWeth } = require("./utilities/uniV2Price.js")
const ParaswapQuote = require("./functions/paraswapQuote.js")
const ethers = require("ethers");
const chalk = require("chalk");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const prizeTokenSymbol = ADDRESS[CHAINNAME].PRIZETOKEN.SYMBOL;
const {
  useCoinGecko,
  slippage,
  profitThreshold,
  profitPercentage,
  minTimeInMilliseconds,
  maxTimeInMilliseconds,
  ONLYLIQUIDATE,
  DONTLIQUIDATE,
} = CONFIG;
const fs = require("fs");

const section = chalk.hex("#47FDFB").bgBlack;

async function go() {
  //const isAwarding = await CONTRACTS.PRIZEPOOL[CHAINNAME].hasOpenDrawFinished()
  const isAwarding = false;
  if (!isAwarding) {
    let totalGasSpent = 0;
    let totalPoolSpent = 0;
    let assetsReceived = [];
    let pairs = [];
    let bestOptionIn;
    let bestOptionOut;
    let bestOutValue;

    // --------- use factory to find vaults to liquidate ------------------
    //     let vaults = [];
    // const vaultFactoryContract = new ethers.Contract(ADDRESS["SEPOLIA"].VAULTFACTORY,ABI.VAULTFACTORY,PROVIDERS["SEPOLIA"])
    // const allVaults = await vaultFactoryContract.totalVaults()
    // console.log("total vaults ",allVaults.toString())

    // for(vault=0;vault<parseInt(allVaults);vault++) {
    // const vaultAddress = await vaultFactoryContract.allVaults(vault)
    // console.log("vault address ",vaultAddress)
    // const vaultContract = new ethers.Contract(vaultAddress,ABI.VAULT,PROVIDERS["SEPOLIA"])
    // const liquidationPairAddress = await vaultContract.liquidationPair()
    // console.log("liq pair ",liquidationPairAddress)
    // vaults.push({VAULT:vaultAddress,LIQUIDATIONPAIR:liquidationPairAddress})
    // }

    // build pairs from factory
    // const numPairs = await CONTRACTS.LIQUIDATIONPAIRFACTORY[
    //   CHAINNAME
    // ].totalPairs();
    // console.log("num pairs", numPairs.toString());

    // for (x = 0; x < numPairs; x++) {
    //   const pairAddress = await CONTRACTS.LIQUIDATIONPAIRFACTORY[
    //     CHAINNAME
    //   ].allPairs(x);
    //   pairs.push(pairAddress);
    // }

     pairs = [
        ...ADDRESS[CHAINNAME].VAULTS,
        ...(ADDRESS[CHAINNAME].BOOSTS ?? []),
        ...(ADDRESS[CHAINNAME].PAIRS ?? []),
      ];

    pairs = pairs.filter(
      (pair) =>
        pair.LIQUIDATIONPAIR.toLowerCase() !==
        "0x0000000000000000000000000000000000000000"
    );

    if (ONLYLIQUIDATE.length > 0) {
      pairs = pairs.filter((pair) =>
        ONLYLIQUIDATE.map((addr) => addr.toLowerCase()).includes(
          pair.LIQUIDATIONPAIR.toLowerCase()
        )
      );
    } else if (DONTLIQUIDATE.length > 0) {
      pairs = pairs.filter(
        (pair) =>
          !DONTLIQUIDATE.map((addr) => addr.toLowerCase()).includes(
            pair.LIQUIDATIONPAIR.toLowerCase()
          )
      );
    }
uniV2Pairs = pairs.filter(pair => pair.UNIV2 === true)

pairs = pairs.filter(pair => pair.GECKO && pair.GECKO !== '');

    //console.log(pairs)
    geckos = pairs.map((pair) => pair.GECKO);
    let allUndefined;
    geckos.length === 0
      ? console.log("NO GECKO ID PRICES in constants/address.js to fetch")
      : (allUndefined = geckos.every((element) => element === undefined));

    if (allUndefined) {
      console.log("NO GECKO IDS in constants/address.js");
    }
    // console.log(geckos);

    let combinedPrices;
    try {
      // Combine 'pooltogether', 'ethereum' with the geckos array and fetch all prices at once
      const ids = [...geckos, "pooltogether", "ethereum"];
      combinedPrices = await GeckoIDPrices(ids);
    } catch (error) {
      console.error("Error fetching combined prices:", error);
      return;
    }

    const ethPrice = combinedPrices[combinedPrices.length - 1];
    const geckoPrices = combinedPrices.slice(0, -2); // This extracts all but the last two elements

    let prizeTokenPrice;
    if (useCoinGecko) {
      prizeTokenPrice = combinedPrices[combinedPrices.length - 1];
    } else {
      prizeTokenPrice = await GetPricesForToken(
        ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS
      );
      //await delay(1100); // Delays for 1.1 seconds
    }

    if (
      prizeTokenPrice === null ||
      prizeTokenPrice === undefined ||
      prizeTokenPrice === 0
    ) {
      console.log("cannot get prize token price");
      return;
    }
    console.log("prize token $", prizeTokenPrice, " eth $", ethPrice);
  
for (const pair of uniV2Pairs) {
  try {
    const LPprizeTokenPrice = await uniV2LPPriceInWeth(pair.ASSET, ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS);
    pair.PRICE = LPprizeTokenPrice / 1e18 * prizeTokenPrice
  } catch (error) {
    console.error(`Error setting price for pair ${pair.ASSET}: ${error}`);
  }
}




pairs.map((pair, index) => pair.PRICE = geckoPrices[index])
pairs =  pairs.concat(uniV2Pairs)
     console.log("total pairs ", pairs.length);

    const multiCallMaxOutArray = [];

    // Construct an array of call data for each pair
    for (const pair of pairs) {
if (CONFIG.SWAPPERS?.[CHAINNAME]?.length > 0) {
        //await delay(1100);
      }
      const contract = new ethers.Contract(
        pair.LIQUIDATIONPAIR,
        ABI.LIQUIDATIONPAIR,
        PROVIDERS[CHAINNAME]
      );
      multiCallMaxOutArray.push(contract.callStatic.maxAmountOut());
    }

multiCallMaxOutArray.push(CONTRACTS.PRIZETOKEN[
      CHAINNAME
    ].balanceOf(CONFIG.WALLET))

    let maxOutResults = [];

    try {
      maxOutResults = await Multicall(multiCallMaxOutArray);
    } catch (error) {
      console.error("Multicall error:", error.message);
    }

    let walletPrizeTokenBalance = maxOutResults[maxOutResults.length-1]

    const myBalanceFormatted = ethers.utils.formatUnits(
      walletPrizeTokenBalance,
      ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS
    );
    console.log("my prize token balance ", myBalanceFormatted);


    if (maxOutResults.length === 0) {
      // Handle the case where maxOutResults is empty
      console.log("No max out results available. Skipping related operations.");
      // Implement any fallback logic or skip certain operations as needed
    } else {
      // Continue with the normal flow, assuming maxOutResults contains data
      // loop through pairs
      //(z<pairs.length)
      for (let z = 0; z < pairs.length; z++) {
        console.log(section("\n------- reading pair ---------"));
        const pairAddress = pairs[z].LIQUIDATIONPAIR;
        const pairDecimals = pairs[z].DECIMALS;
        const pairOutSymbol = pairs[z].SYMBOL;
        const pairOutAsset = pairs[z].ASSET;
        const vaultDepositToken = pairs[z].ASSET;
        const vaultAddress = pairs[z].VAULT;
        const noVault =
          pairs[z].NOVAULT !== undefined ? pairs[z].NOVAULT : false;
        const pairOutPrice = pairs[z].PRICE
        const pairIsUniV2 = pairs[z].UNIV2
        //console.log("is v2?",pairIsUniV2)
        console.log("token out ", pairOutSymbol, " price ", pairOutPrice);
        // console.log("address ", ADDRESS[chainName].VAULTS[z].VAULT);
        // const contract = CONTRACTS.VAULTS[chainName][z].LIQUIDATIONPAIR;

        const contract = new ethers.Contract(
          pairAddress,
          ABI.LIQUIDATIONPAIR,
          PROVIDERS[CHAINNAME]
        );
        const contractWSigner = new ethers.Contract(
          pairAddress,
          ABI.LIQUIDATIONPAIR,
          SIGNER
        );

        // old code to get decimals and symbol from contract
        //const tokenOutDecimals = await CONTRACTS.VAULTS[chainName][z].VAULT.decimals()
        //const tokenOutSymbol = await CONTRACTS.VAULTS[chainName][z].VAULT.symbol()

        const maxOut = maxOutResults[z];
        // console.log("max out", maxOut);

        let tx;

        if (parseFloat(maxOut) === 0) {
          console.log("Pair ", pairAddress, " maxout = 0");
        } else {
          try {
            const inForOut =
              await contractWSigner.callStatic.computeExactAmountIn(maxOut);

            bestOptionOut = maxOut;
            bestOutValue =
              ethers.utils.formatUnits(bestOptionOut, pairDecimals) *
              pairOutPrice;

            bestOptionIn = inForOut;
          } catch (e) {
            console.log(e);

            const firstParagraph = error.toString().split("\n")[0];

            // Logging the extracted details
            console.error("Message:", firstParagraph);
          }

          let web3TotalGasCost, web3TotalGasCostUSD;
          try {
            // const amountOutEstimate = await contract.callStatic.estimateAmountOut(amountIn)

            const now = new Date();
            const oneMinuteFromNow = new Date(now.getTime() + 60000); // Add 60,000 milliseconds (1 minute)
            const unixTimestamp = Math.floor(oneMinuteFromNow.getTime() / 1000); // Convert to UNIX timestamp

            //console.log("now ",now," one min from now ",unixTimestamp);

            console.log(
              "tx params | pair",
              pairAddress,
              "  max out ",
              bestOptionOut.toString(),
              //  / Math.pow(10,pairDecimals),
              "amount in ",
              bestOptionIn.toString(),
              // / Math.pow(10,ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS),
              " deadline ",
              unixTimestamp
            );

            const maxToSendWithSlippage = calculateWithSlippage(bestOptionIn);

            // Specify the function and its arguments
            const functionName = "swapExactAmountOut";
            //console.log("config wallet", CONFIG.WALLET);
            const poolFromAddress = CONFIG.WALLET;
            const args = [
              pairAddress,
              //ADDRESS[CHAINNAME].SWAPPER,
              poolFromAddress,
              bestOptionOut,
              maxToSendWithSlippage,
              unixTimestamp,
            ];
            //console.log("args",args)
            // Encode the function call
            const data = CONTRACTS.LIQUIDATIONROUTERSIGNER[
              CHAINNAME
            ].interface.encodeFunctionData(functionName, args);

            const poolOutFormatted = maxToSendWithSlippage / 1e18;
            const maxOutFormatted = bestOptionOut / Math.pow(10, pairDecimals);

            const prizeTokenValue = poolOutFormatted * prizeTokenPrice;
            const outValue = maxOutFormatted * pairOutPrice;
             
/*
console.log("paraswap params",
CHAINID,CONFIG.WALLET,
            pairOutAsset,pairDecimals,bestOptionOut.toString(),ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS
)
            const paraswap = await ParaswapQuote(CHAINID,CONFIG.WALLET,
pairOutAsset,pairDecimals,bestOptionOut.toString(),ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS,ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS)
console.log("paraswap amt returned",paraswap.priceRoute.destAmount)            
console.log("paraswap data",paraswap.txParams.data)
console.log("paraswap router",paraswap.txParams.to)
*/


            console.log(
              "out value $" +
                outValue.toFixed(2) +
                " in value $" +
                prizeTokenValue.toFixed(2) +
                " gross $" +
                (outValue - prizeTokenValue).toFixed(2)
            );

if (!CONFIG.SWAPPERS?.[CHAINNAME] || CONFIG.SWAPPERS[CHAINNAME].length === 0) {

            if (maxToSendWithSlippage.gt(walletPrizeTokenBalance)) {
              console.log(
                "not enough prize token to estimate and send liquidation"
              );
              continue;
            }}

            //if (outValue - profitThreshold < prizeTokenValue) {

// todo 1% hardcoded loss impact to check actual pricing instead of coingecko
            if((outValue*1.11)- profitThreshold < prizeTokenValue) { 
             console.log("not profitable...");
            } else {
              const gasBudgetUSD = outValue - prizeTokenValue - profitThreshold;
              // console.log("gas budget USD", gasBudgetUSD);
              const gasBudgetETH = ethers.BigNumber.from(
                parseInt((gasBudgetUSD / ethPrice) * 1e18).toString()
              );
              const profitThresholdETH = ethers.BigNumber.from(
                parseInt((profitThreshold / ethPrice) * 1e18).toString()
              );
              console.log("profit thrshold ETH",profitThresholdETH.toString())
              console.log("gas budget in ETH", gasBudgetETH.toString());
              //console.log(" no vault?", noVault);
if(pairIsUniV2){console.log("UNIV2 flash strategy")

await UniFlashSwap(pairAddress,bestOptionOut,gasBudgetETH)

}else{
              if (
                CONFIG.SWAPPERS?.[CHAINNAME]?.length > 0 &&
                vaultDepositToken.toLowerCase() !==
                  ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS.toLowerCase()
              ) {
                console.log(
                  "Swapppppper",
                  pairAddress,
                  vaultAddress,
                  pairOutAsset,
                  bestOptionOut.toString(),
                  maxToSendWithSlippage,
                  outValue,
                  prizeTokenValue,
                  gasBudgetETH
                );
                //const quote = await Get1inchQuote(pairOutAsset,ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS,bestOptionOut.toString())

                //async function Swapper(pairAddress,vaultAddress,depositTokenAddress,amtOut,amtIn,gasBudget){
                if (noVault) {
// best option

const swapGo = await OutAndBackBestOption(
                    pairAddress,
                    pairOutAsset,
                    pairDecimals,
                    bestOptionOut,
                    maxToSendWithSlippage,
                    profitThresholdETH
                  )
// paraswap
/*
const swapGo = await OutAndBackParaswap(
                    pairAddress,
                    pairOutAsset,
                    pairDecimals,
                    bestOptionOut,
                    maxToSendWithSlippage,
		    profitThresholdETH
                  )
*/
// 1 inch
/*
                  const swapGo = await OutAndBack(
                    pairAddress,
                    pairOutAsset,
                    bestOptionOut,
                    maxToSendWithSlippage,
                    gasBudgetETH
                  );*/
                } else {

// 1 inch
/*
                  const swapGo = await LapThePool(
                    pairAddress,
                    vaultAddress,
                    pairOutAsset,
                    bestOptionOut,
                    maxToSendWithSlippage,
                    gasBudgetETH
                  );

*/
// paraswap

/*const paraswapGo = await LapThePoolParaswap(
pairAddress,
                    vaultAddress,
                    pairOutAsset,
                    pairDecimals,
                    bestOptionOut,
                    maxToSendWithSlippage,
                    profitThresholdETH
)
*/
const  bestOptionGo = await LapThePoolBestOption(
pairAddress,
                    vaultAddress,
                    pairOutAsset,
                    pairDecimals,
                    bestOptionOut,
                    maxToSendWithSlippage,
                    profitThresholdETH
)
// 1 inch
/*
                  const swapGo = await LapThePool(
                    pairAddress,
                    vaultAddress,
                    pairOutAsset,
                    bestOptionOut,
                    maxToSendWithSlippage,
                    gasBudgetETH
                  );*/
                }
              } 
else if (vaultDepositToken.toLowerCase() ===
                  ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS.toLowerCase()){
console.log("prize token exchange")
await PrizeSwim(pairAddress,
  vaultAddress,
  bestOptionOut,
  maxToSendWithSlippage,
  profitThresholdETH)
}
else {
                // calculate total gas cost in wei
                /*web3TotalGasCost = await web3GasEstimate(
              data,
              CHAINID,
              poolFromAddress,
              ADDRESS[CHAINNAME].LIQUIDATIONROUTER
            );*/
                const method = functionName;
                web3TotalGasCost = await GasEstimate(
                  CONTRACTS.LIQUIDATIONROUTERSIGNER[CHAINNAME],
                  method,
                  args,
                  CONFIG.PRIORITYFEE
                );

                console.log(
                  "Gas Estimate " + Number(web3TotalGasCost) / 1e18 + " ETH"
                );
                web3TotalGasCostUSD =
                  (Number(web3TotalGasCost).toFixed(2) * ethPrice) / 1e18;
                //console.log("Real Gas Estimate through Web3: $" + web3TotalGasCostUSD.toFixed(2))

                /*const poolOutFormatted = maxToSendWithSlippage / 1e18;
            const maxOutFormatted = bestOptionOut / Math.pow(10, pairDecimals);

            const prizeTokenValue = poolOutFormatted * prizeTokenPrice;
            const outValue = maxOutFormatted * pairOutPrice;
              */
                // const gasCouldBe = web3TotalGasCostUSD * 5.3
                const gasCouldBe = web3TotalGasCostUSD * 0.2;

                //console.log("gas could BE $",gasCouldBe.toFixed(4))
                //console.log("out value",outValue)
                //console.log("greater than zero??",outValue - (prizeTokenValue +gasCouldBe))

                const profit = outValue - prizeTokenValue - web3TotalGasCostUSD;
                const totalCost = prizeTokenValue + web3TotalGasCostUSD;

                console.log(
                  poolOutFormatted.toFixed(4),
                  prizeTokenSymbol + " ($",
                  prizeTokenValue.toFixed(2),
                  ") for ",
                  maxOutFormatted.toFixed(4),
                  " ",
                  pairOutSymbol,
                  " ($",
                  outValue.toFixed(2),
                  ") = $",
                  profit.toFixed(2),
                  " profit after $",
                  web3TotalGasCostUSD,
                  " in est gas cost"
                );

                if (
                  profit < profitThreshold ||
                  totalCost * profitPercentage > outValue
                ) {
                  console.log(
                    "not meeting profit threshold of $",
                    profitThreshold,
                    " AND > ",
                    (profitPercentage * 100).toFixed(0),
                    "%"
                  );
                  continue;
                }
                console.log("ok we got enough profit, lets go");

                //return // BREAK BEFORE SENDING SWAP
                let txReceipt;
                if (maxToSendWithSlippage.gt(walletPrizeTokenBalance)) {
                  console.log("not enough prize token to send liquidation");
                  continue;
                }
                let swapCheck;
                try {
                  // check that swap conditions are as expected before sending
                  swapCheck =
                    await contractWSigner.callStatic.computeExactAmountIn(
                      bestOptionOut
                    );
                } catch (e) {
                  console.log(e);
                  swapCheck = ethers.BigNumber.from(0);
                }
                if (swapCheck.gt(bestOptionIn)) {
                  console.log(
                    "swap conditions have changed. need to recalculate."
                  );
                  continue;
                }
                // else{console.log("swap check",swapCheck.toString(),"best option in",bestOptionIn.toString())}
                try {
                  tx = await CONTRACTS.LIQUIDATIONROUTERSIGNER[
                    CHAINNAME
                  ].swapExactAmountOut(
                    pairAddress,
                    CONFIG.WALLET,
                    bestOptionOut,
                    maxToSendWithSlippage,
                    unixTimestamp,
                    { maxPriorityFeePerGas: "1000001", gasLimit: "700000" }
                  );
                  /*
                  tx = await CONTRACTS.LIQUIDATIONROUTERSIGNER[
                CHAINNAME
                ].swapExactAmountOut(
                pairAddress,
                ADDRESS[CHAINNAME].SWAPPER,
                bestOptionOut,
                maxToSendWithSlippage,
                unixTimestamp,
                { maxPriorityFeePerGas: "1000011",    gasLimit: "700000" }
                );*/

                  txReceipt = await tx.wait();

                  // subtract max amount sent from balance (todo replace with actual instead of max for accuracy)
                  walletPrizeTokenBalance = walletPrizeTokenBalance.sub(
                    maxToSendWithSlippage
                  );
                } catch (e) {
                  console.log(e);
                  break;
                }
                console.log(section("---- liquidated tx complete -------"));
                console.log("liquidated tx", txReceipt.transactionHash);

                //return // RETURN AFTER SWAP to only send 1 in testing

                const L2transactionCost =
                  Number(txReceipt.gasUsed * txReceipt.effectiveGasPrice) /
                  1e18;

                const [gasSpent,totalTransactionCost] = await getAlchemyReceipt(txReceipt.transactionHash)
                totalGasSpent+=gasSpent
                // more parsing than getting
                const logs = GetLogs(txReceipt, ABI.LIQUIDATIONPAIR);
                let poolSpent, amountReceived;
                logs.forEach((log) => {
                  if (log.name === "SwappedExactAmountOut") {
                    const args = log.args;
                    console.log(section("--- swapped log ---"));
                    // console.log("account in ", args.account);
                    poolSpent = args.amountIn;
                    amountReceived = args.amountOut;
                    totalPoolSpent += poolSpent;
                    assetsReceived.push({
                      asset: pairOutSymbol,
                      amount: ethers.utils.formatUnits(
                        args.amountOut,
                        pairDecimals
                      ),
                    });

                    console.log("received ", args.amountOut.toString());
                  }
                });

                // File path
                const dataFilePath = "./data/liquidator-history.json";

                // Initialization
                let fileData = [];
                if (fs.existsSync(dataFilePath)) {
                  try {
                    fileData = JSON.parse(
                      fs.readFileSync(dataFilePath, "utf-8")
                    );
                    /*console.log(
                "Initial data read from file:",
                JSON.stringify(fileData, null, 2)
              );*/
                  } catch (error) {
                    console.error("Error reading or parsing file data:", error);
                  }
                } else {
                  console.log(
                    `File at path ${dataFilePath} does not exist. Starting with empty data.`
                  );
                }

                // Logging each property before constructing newData

                const newData = {
                  txHash: txReceipt.transactionHash,
                  gasEstimateETH: web3TotalGasCost.toString(),
                  gasCostETH: totalTransactionCost,
                  amountReceived: amountReceived.toString(),
                  amountReceivedSymbol: pairOutSymbol,
                  amountReceivedDecimals: pairDecimals,
                  amountSent: poolSpent.toString(),
                  gasUsed: txReceipt.gasUsed.toString(),
                  poolPrice: prizeTokenPrice,
                  pairOutPrice: pairOutPrice,
                  ethPrice: ethPrice,
                  date: Date.now(),
                };
                /*console.log("new data for file write", newData);
              console.log(
                "New data to be added:",
                JSON.stringify(newData, null, 2)
              );*/

                fileData.push(newData);

                try {
                  fs.writeFileSync(
                    dataFilePath,
                    JSON.stringify(fileData, null, 2),
                    "utf-8"
                  );
                  console.log(
                    `Data successfully written to file at ${dataFilePath}.`
                  );
                } catch (error) {
                  console.error("Error writing data to file:", error);
                }
              }
            }}
          } catch (e) {
            // Extracting the primary error message
            const firstParagraph = e.toString().split("\n")[0];

            // Logging the extracted details
            console.error("Message:", firstParagraph);
            if (e.args && e.args.length) {
              for (let i = 0; i < e.args.length; i++) {
                console.log(`arg[${i}] ->`, e.args[i].toString());
              }
            }
          }
        }
      }
    }

    console.log("");
    if (totalPoolSpent > 0) {
      console.log(section("------ liquidation summary -------"));
      console.log("total gas spent ", totalGasSpent);
      console.log("total pool spent ", totalPoolSpent);
      // receivedString = ""
      // assetsReceived.forEach(asset=>receivedString+=asset.symbol + asset.amount + " , ")
      console.log(assetsReceived);
      console.log(
        "-------------------------------------------bot will run again in " +
          parseInt(minTimeInMilliseconds / 60000) +
          "min - " +
          parseInt(maxTimeInMilliseconds / 60000) +
          "min------------ "
      );
    } else {
      console.log(section("No liquidations completed"));
      console.log(
        "-------------------------------------------bot will run again in " +
          parseInt(minTimeInMilliseconds / 60000) +
          "min - " +
          parseInt(maxTimeInMilliseconds / 60000) +
          "min------------ "
      );
    }
  } else {
    console.log("liquidations are off while draw is being awarded");
  }
}

function executeAfterRandomTime(minTime, maxTime) {
  // Calculate a random time between minTime and maxTime
  const randomTime = minTime + Math.random() * (maxTime - minTime);

  setTimeout(() => {
    go(); // Execute your function

    // Recursively call the function to continue the cycle
    executeAfterRandomTime(minTime, maxTime);
  }, randomTime);
}



const calculateWithSlippage = (amount, slippageBps = slippage) => {
  // Convert basis points to a multiplier.
  // For example, 0.5% slippage is 50 basis points.
  const multiplier = ethers.BigNumber.from(10000 + slippageBps) // 10000 basis points = 100%
    .mul(ethers.constants.WeiPerEther)
    .div(10000);

  // Apply the multiplier to the amount
  const amountWithSlippage = amount
    .mul(multiplier)
    .div(ethers.constants.WeiPerEther);

  return amountWithSlippage;
};

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
// go once
go();

// go randomly after
executeAfterRandomTime(minTimeInMilliseconds, maxTimeInMilliseconds);
const LiquidateNow = async () => {
  go();
};

module.exports = LiquidateNow;
