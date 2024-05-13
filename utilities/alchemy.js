const { Network, Alchemy } = require("alchemy-sdk");
const sdk = require('api')('@alchemy-docs/v1.0#5duyw41qlfsv71w0');
require('dotenv').config(); // Adjust the path as needed to load your .env file
const { getChainConfig } = require('../chains');


const CHAINNAME = getChainConfig().CHAINNAME;
const CHAINID = getChainConfig().CHAINID;

/*
ARB_GOERLI
ARB_MAINNET
ARB_SEPOLIA
ASTAR_MAINNET
BASE_GOERLI
BASE_MAINNET
BASE_SEPOLIA
ETH_GOERLI
ETH_MAINNET
ETH_SEPOLIA
MATIC_AMOY
MATIC_MAINNET
MATIC_MUMBAI
OPT_GOERLI
OPT_MAINNET
OPT_SEPOLIA
POLYGONZKEVM_MAINNET
POLYGONZKEVM_TESTNET
ZKSYNC_MAINNET
ZKSYNC_SEPOLIA*/

// console.log("chain name??", `"${CHAINNAME}"`);  // Including quotes might reveal hidden spaces
// console.log("Type of CHAINNAME:", typeof CHAINNAME); // Check the type to ensure it's a string
// console.log("Serialized CHAINNAME:", JSON.stringify(CHAINNAME)); // Can reveal hidden characters

const chainToNetworkMap = {
  "OPTIMISM": Network.OPT_MAINNET,
  "OPSEPOLIA": Network.OPT_SEPOLIA,
  "BASESEPOLIA": Network.BASE_SEPOLIA,
  "BASE": Network.BASE_MAINNET,
  "ARBITRUM": Network.ARB_MAINNET,
  "ARBSEPOLIA": Network.ARB_SEPOLIA
};

let net = chainToNetworkMap[CHAINNAME];
// if (!net) {
//   console.log("NETWORK NOT FOUND FOR ALCHEMY RECEIPT API");
// }


// Optional Config object, but defaults to demo api-key and eth-mainnet.
const settings = {
  apiKey: process.env.ALCHEMY_KEY, // Replace with your Alchemy API Key.
  network: net, // Replace with your network.
};

const alchemy = new Alchemy(settings);

async function AlchemyGas() {
  try {
    const gasPrice = await alchemy.core.getGasPrice();
    console.log("alchemy gas price", gasPrice / 1e9);
    return gasPrice;
  } catch (error) {
    console.error("Error fetching gas price:", error);
    throw error; // Propagate the error
  }
}

//Required installation: npm install api --save
async function AlchemyTransactionReceipt(hash) {
  return new Promise((resolve, reject) => {
    sdk.ethGettransactionreceiptOptimism({
      id: 1,
      jsonrpc: '2.0',
      params: [hash], // Pass the hash variable directly
      method: 'eth_getTransactionReceipt'
    }, { apiKey: process.env.ALCHEMY_KEY })
      .then(({ data }) => {
        resolve(data); // Resolve the Promise with the data
      })
      .catch(err => {
        reject(err); // Reject the Promise with an error if there's an issue
      });
  });
}

module.exports = { AlchemyGas, AlchemyTransactionReceipt };
