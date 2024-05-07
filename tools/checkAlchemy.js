// Setup: npm install alchemy-sdk
const { Network, Alchemy } = require("alchemy-sdk");
const fs = require("fs")
require('dotenv').config()

// Optional Config object, but defaults to demo api-key and eth-mainnet.
const settings = {
  apiKey: process.env.ALCHEMY_KEY, // Replace with your Alchemy API Key.
  network: Network.OPT_MAINNET, // Replace with your network.
};

const alchemy = new Alchemy(settings);

async function AlchemyGas() {
  //const latestBlock = await alchemy.core.getBlockNumber();
  const gasPrice = await alchemy.core.getGasPrice();
  
console.log("alchemy gas price",gasPrice/1e9)
//console.log("The latest block number is", latestBlock);
return gasPrice
}
AlchemyGas()

module.exports = {AlchemyGas}
