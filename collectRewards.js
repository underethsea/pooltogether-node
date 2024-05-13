//const { EstimateOptimismGasCost } = require('./optimismGas');
const { getChainConfig } = require("./chains");
const { CONTRACTS } = require("./constants/contracts");
const { CONFIG } = require("./constants/config");
//const { web3GasEstimate } = require("./utilities/web3");
const { ADDRESS } = require("./constants/address");
const { GasEstimate } = require("./utilities/gas");

const maxGas = 20;
const minClaim = CONFIG.MINTOCLAIM;
const CLAIM_COST_AS_PERCENTAGE = CONFIG.CLAIM_COST_AS_PERCENTAGE; // 2 = 2%

const CHAINNAME = getChainConfig().CHAINNAME;

async function CollectRewards(prizeTokenPrice, ethPrice) {
  PRIZEPOOL_CONTRACT = CONTRACTS.PRIZEPOOLWITHSIGNER[CHAINNAME];
  try {
    // Get the balance of claim rewards
    const awardsBalance = await CONTRACTS.PRIZEPOOL[CHAINNAME].rewardBalance(
      process.env.WALLET
    );
    console.log(
      "Awards Balance:",
      awardsBalance.toString(),
      " ",
      (parseInt(awardsBalance) / 1e18).toFixed(4),
      " " + ADDRESS[CHAINNAME].PRIZETOKEN.SYMBOL + " ($",
      (parseInt(awardsBalance) / 1e18) * prizeTokenPrice,
      ")"
    );
    if (parseInt(awardsBalance) / 1e18 < minClaim) {
      console.log("not enough rewards accumulated to claim...(", minClaim, ")");
    } else {
      //console.log(parseInt(awardsBalance)/1e18)
      //console.log("min",minClaim)
      //return
      /*
    // Create an Ethereum transaction
    const transaction = {
      to: '0x93146d9978d286EE085ba68eE1786a0b6EDA64EC', 
      value: ethers.utils.parseEther('1.0'), // Adjust the amount as needed
      
gasLimit: 21000, // Adjust the gas limit as needed
      gasPrice: ethers.utils.parseUnits('1', 'gwei'), // Adjust the gas price as needed
    };

    // Call the function to estimate gas costs
    const gasEstimates = await EstimateOptimismGasCost(transaction);

    // Use the gas estimates as needed
    const gasCost = ethers.utils.formatUnits(gasEstimates.totalCost, 18);
    console.log('Total Cost:', gasEstimates.totalCost.toString(), " ", gasCost, " eth @ 1650 = $", (gasCost * 1650).toFixed(4));
    // console.log('L1 Cost:', gasEstimates.l1Cost.toString());
    // console.log('L2 Cost:', gasEstimates.l2Cost.toString());

*/

      /*


    // Estimate gas limit for withdrawClaimRewards
    const estimatedGasLimit = await PRIZEPOOL_CONTRACT.estimateGas.withdrawRewards(CONFIG.WALLET, awardsBalance);
    // console.log("estimated gas limit",estimatedGasLimit)
    // Prepare the transaction
    let approveTxUnsigned = await PRIZEPOOL_CONTRACT.populateTransaction.withdrawRewards(CONFIG.WALLET, awardsBalance);
    approveTxUnsigned.chainId = CHAINID;
    approveTxUnsigned.gasLimit = estimatedGasLimit.mul(110).div(100);
    approveTxUnsigned.gasPrice = await PROVIDERS[CHAINNAME].getGasPrice();
    const mainnetGas = await PROVIDERS.MAINNET.getGasPrice();
   
if(mainnetGas/1e9 > maxGas) {
console.log("gas too high (",(mainnetGas/1e9).toFixed(2),"gwei)")
return}
console.log("gas not too high");return
    approveTxUnsigned.nonce = await PROVIDERS[CHAINNAME].getTransactionCount(CONFIG.WALLET);
    const gasCostEstimate = await EstimateOptimismGasCost(approveTxUnsigned.nonce)
    const totalCost = ethers.utils.formatUnits(gasCostEstimate.totalCost, 18);
    console.log('Total Cost:', gasCostEstimate.totalCost.toString(), " ", totalCost, " eth @ ",ethPrice", = $", (totalCost * ethPrice).toFixed(4));
    console.log(approveTxUnsigned)
    //console.log("gas limit",approveTxUnsigned.gasLimit)
    //console.log("gas price",approveTxUnsigned.gasPrice.toString())
    // console.log("made it")
*/

      const functionName = "withdrawRewards";
      const args = [CONFIG.WALLET, awardsBalance];

      // Encode the function call
      const data = PRIZEPOOL_CONTRACT.interface.encodeFunctionData(
        functionName,
        args
      );

      // calculate total gas cost in wei
      const web3TotalGasCost = await GasEstimate(
        PRIZEPOOL_CONTRACT,
        functionName,
        args,
        CONFIG.PRIORITYFEE
      );

      const web3TotalGasCostUSD = (Number(web3TotalGasCost) * ethPrice) / 1e18;

      console.log("Gas Estimate: $" + web3TotalGasCostUSD.toFixed(2)) +
        " |  " +
        web3TotalGasCost.toString() +
        " wei";

      if (
        web3TotalGasCostUSD >
        ((parseInt(awardsBalance) / 1e18) *
          prizeTokenPrice *
          CLAIM_COST_AS_PERCENTAGE) /
          100
      ) {
        console.log("gas cost to claim rewards is too high");
      } else {
        //console.log("ready to claim but returning for testing");return
        // Sign and send the transaction
        const submittedTx = await PRIZEPOOL_CONTRACT.withdrawRewards(
          CONFIG.WALLET,
          awardsBalance,
          { maxPriorityFeePerGas: "1000011" }
        );
        const receipt = await submittedTx.wait();

        if (receipt.status === 0) {
          throw new Error("Approve transaction failed");
        }

        // console.log('Transaction Receipt:', receipt);
        console.log(
          "claimed",
          ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS,
          " awards! tx hash ",
          receipt.transactionHash
        );
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

//CollectRewards(3300,3300);
module.exports = { CollectRewards };
