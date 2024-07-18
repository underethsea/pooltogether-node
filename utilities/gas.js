require("../env-setup");
const ethers = require("ethers");
const { CONTRACTS } = require("../constants/contracts");
const { PROVIDERS } = require("../constants/providers");
const { CONFIG } = require("../constants/config");
//require('dotenv').config(); // Adjust the path as needed

const { getChainConfig } = require("../chains");

const CHAINNAME = getChainConfig().CHAINNAME;
//const CHAINNAME = "ARBITRUM"
const parseGweiToWei = (num) => ethers.utils.parseUnits(num.toString(), "gwei");
const parseGwei = (num) => ethers.utils.parseUnits(num.toString(), "gwei");

async function GasEstimate(
  contract,
  method,
  args,
  priorityFee,
  options = {},
  gasLimit = 0
) {
  try {
    let feeData, gasEstimate;

//temp base fee log
//const temp = await PROVIDERS[CHAINNAME].getFeeData()
//console.log(temp.lastBaseFeePerGas.toString())

    if (gasLimit > 0) {
      feeData = await PROVIDERS[CHAINNAME].getFeeData();
      //console.log(feeData.
      gasEstimate = ethers.BigNumber.from(gasLimit);
    } else {
      [feeData, gasEstimate] = await Promise.all([
        PROVIDERS[CHAINNAME].getFeeData(),
        contract.estimateGas[method](...args, options),
      ]);
    }

    //console.log("Fee data base fee",feeData.lastBaseFeePerGas.toString())
    //        console.log("gas used estimate", gasEstimate.toString());

    const tx = {
      to: contract.address,
      data: contract.interface.encodeFunctionData(method, args),
      // Include other properties as needed
    };

    // Calculations using BigNumber for accuracy
    const baseFeeWei = feeData.lastBaseFeePerGas;
    console.log("base feee",baseFeeWei/1e9)
    const priorityFeeWei = parseGweiToWei(priorityFee || '0');
    const maxFeeWei = baseFeeWei.add(priorityFeeWei);

    const serialized = ethers.utils.serializeTransaction(tx);
    let l1Fee = ethers.BigNumber.from(0);  // Default to 0 if GASORACLE is not available
if (typeof CONTRACTS !== 'undefined' && CONTRACTS?.GASORACLE?.[CHAINNAME]) {
      l1Fee = await CONTRACTS.GASORACLE[CHAINNAME].getL1Fee(serialized);
   }
    else {
l1Fee = ethers.BigNumber.from(0)}
    //        console.log("l1 fee", ethers.utils.formatEther(l1Fee), "ETH");

    let l2executionFee
    if(CHAINNAME!=="ARBITRUM"){l2executionFee = gasEstimate.mul(maxFeeWei)}
else{l2executionFee = gasEstimate.mul(feeData.gasPrice)}
    //        console.log("l2 fee", ethers.utils.formatEther(l2executionFee), "ETH");

    const totalFee = l2executionFee.add(l1Fee);
    //        console.log("combined", ethers.utils.formatEther(totalFee), "ETH");
    console.log(
      "l1 fee",
      ethers.utils.formatEther(l1Fee),
      "ETH",
      "  l2 fee",
      ethers.utils.formatEther(l2executionFee),
      "ETH",
      "combined",
      ethers.utils.formatEther(totalFee),
      "ETH"
    );
    return totalFee;
  } catch (error) {
    console.error("Error interacting with smart contract:", error);
    throw error; // Rethrow the error to handle it at a higher level
  }
}
/*
async function test() {
    const contract = CONTRACTS.TOKENFAUCET[CHAINNAME];
    const method = "drip";
    const args = ["0x493c7081FAab6e5B2d6b18d9311918580e88c6bF"];
    const baseFee = ".1"; // in Gwei
    const priorityFee = ".1"; // in Gwei

    const totalFee = await GasEstimate(contract, method, args, baseFee, priorityFee);
    console.log("Total gas fee for transaction:", ethers.utils.formatEther(totalFee), "ETH");
    const tx = await CONTRACTS.TOKENFAUCET[CHAINNAME].drip("0x493c7081FAab6e5B2d6b18d9311918580e88c6bF",{maxPriorityFeePerGas: parseGwei(priorityFee) ,
    maxFeePerGas: parseGwei(priorityFee)})

const receipt = await tx.wait()
console.log(receipt.transactionHash)
}
*/
//test();
module.exports = { GasEstimate };
