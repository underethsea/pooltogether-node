
const dotenv = require("dotenv");
const ethers = require("ethers");
dotenv.config();


// const ethereumEndpoint = "https://mainnet.infura.io/v3/" + process.env.ETHEREUM_KEY;

const ethereumEndpoint = "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_KEY;
const optimismEndpoint = "https://opt-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY;
const avalancheEndpoint = "https://rpc.ankr.com/avalanche";
const opSepolia = "https://sepolia.optimism.io"
const PROVIDERS = {
    OPSEPOLIA: new ethers.providers.JsonRpcProvider(opSepolia),
    ETHEREUM: new ethers.providers.JsonRpcProvider(ethereumEndpoint),
    OPTIMISM: new ethers.providers.JsonRpcProvider(optimismEndpoint)
}

module.exports = { PROVIDERS }
