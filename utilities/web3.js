require('../env-setup');
const  {Web3, HttpProvider}  = require('web3');
const { OptimismPlugin } = require('@eth-optimism/web3.js-plugin');
const ethers = require('ethers');
const { PROVIDERS } = require('../constants/providers')
const { CONFIG } = require('../constants/config')
//require('dotenv').config(); // Adjust the path as needed


const opEndpoint =  "https://opt-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY

// Create a new Web3 instance with a provider URL
const web3 = new Web3(new HttpProvider(opEndpoint));

web3.registerPlugin(new OptimismPlugin());

async function web3GasEstimate(data, chain, from, to) { 
  try {

    /*
    console.log(
      `Chain: ${chain} \n`,
      `From: ${from} \n`,
      `To: ${to} \n`,
      `Data: ${data} \n`
    )  
    */

    const totalFee = await web3.op.estimateFees({
      chainId: chain,
      data: data,
      value: '0',
      type: 2,
      to: to,
      from: from,
      maxFeePerGas: Web3.utils.toWei('1.01', 'gwei'),
      maxPriorityFeePerGas: Web3.utils.toWei('0.1', 'gwei'),
    });
    
    return totalFee;

  } catch (error) {
    console.error('Error interacting with smart contract:', error);
    throw error; // Rethrow the error to handle it at a higher level
  } 
}

module.exports = { web3GasEstimate };
