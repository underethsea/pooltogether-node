require('../env-setup');
const ethers = require('ethers');
const { CONTRACTS } = require('../constants/contracts');
const { PROVIDERS } = require('../constants/providers');
const { CONFIG } = require('../constants/config');
//require('dotenv').config(); // Adjust the path as needed

const parseGweiToWei = (num) => ethers.utils.parseUnits(num.toString(), 'gwei');
const parseGwei = (num) => ethers.utils.parseUnits(num.toString(),'gwei')

async function GasEstimate(contract, method, args,  priorityFee,  options={},gasLimit=0) {
    try {

let feeData, gasEstimate;

        if (gasLimit > 0) {
            feeData = await PROVIDERS[CONFIG.CHAINNAME].getFeeData();
            gasEstimate = ethers.BigNumber.from(gasLimit);
        } else {
            [feeData, gasEstimate] = await Promise.all([
                PROVIDERS[CONFIG.CHAINNAME].getFeeData(),
                contract.estimateGas[method](...args, options)
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
        const baseFeeWei = feeData.lastBaseFeePerGas
        const priorityFeeWei = parseGweiToWei(priorityFee);
        const maxFeeWei = baseFeeWei.add(priorityFeeWei);

        const serialized = ethers.utils.serializeTransaction(tx);
        let l1Fee = await CONTRACTS.GASORACLE[CONFIG.CHAINNAME].getL1Fee(serialized);
//        console.log("l1 fee", ethers.utils.formatEther(l1Fee), "ETH");
 
        const l2executionFee = gasEstimate.mul(maxFeeWei);
//        console.log("l2 fee", ethers.utils.formatEther(l2executionFee), "ETH");

        const totalFee = l2executionFee.add(l1Fee);
//        console.log("combined", ethers.utils.formatEther(totalFee), "ETH");
console.log("l1 fee", ethers.utils.formatEther(l1Fee), "ETH","  l2 fee", ethers.utils.formatEther(l2executionFee), "ETH",
"combined", ethers.utils.formatEther(totalFee), "ETH")
        return totalFee;
    } catch (error) {
        console.error('Error interacting with smart contract:', error);
        throw error; // Rethrow the error to handle it at a higher level
    }
}
/*
async function test() {
    const contract = CONTRACTS.TOKENFAUCET[CONFIG.CHAINNAME];
    const method = "drip";
    const args = ["0x493c7081FAab6e5B2d6b18d9311918580e88c6bF"];
    const baseFee = ".1"; // in Gwei
    const priorityFee = ".1"; // in Gwei

    const totalFee = await GasEstimate(contract, method, args, baseFee, priorityFee);
    console.log("Total gas fee for transaction:", ethers.utils.formatEther(totalFee), "ETH");
const tx = await CONTRACTS.TOKENFAUCET[CONFIG.CHAINNAME].drip("0x493c7081FAab6e5B2d6b18d9311918580e88c6bF",{maxPriorityFeePerGas: parseGwei(priorityFee) ,
maxFeePerGas: parseGwei(priorityFee)})

const receipt = await tx.wait()
console.log(receipt.transactionHash)
}
*/
//test();
module.exports = {GasEstimate}