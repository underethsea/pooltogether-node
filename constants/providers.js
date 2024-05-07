require('../env-setup');
const ethers = require("ethers");
const { CONFIG }= require("./config")

// Check if ALCHEMY_KEY environment variable is missing
if (!process.env.ALCHEMY_KEY) {
  console.error("!!!!!!!!!!!!!!!!!!**************************************************************************      Missing .env  variable: ALCHEMY_KEY");
}

// Check if PRIVATE_KEY environment variable is missing
if (!process.env.PRIVATE_KEY) {
  console.error("!!!!!!!!!!!!!!!!!!!!**************************************************************************      Missing .env variable: PRIVATE_KEY");
} 

// const ethereumEndpoint = "https://mainnet.infura.io/v3/" + process.env.ETHEREUM_KEY;
// const ethereumEndpoint = "https://eth-mainnet.alchemyapi.io/v2/"
// const ethereumEndpoint = "https://eth-mainnet.alchemyapi.io/v2/" + process.env.POLYGON_KEY;
// const polygonEndpoint = "https://polygon-mainnet.g.alchemy.com/v2/" + process.env.POLYGON_KEY;
// const avalancheEndpoint = "https://api.avax.network/ext/bc/C/rpc";
// const avalancheEndpoint = "https://avalanche-mainnet.infura.io/v3/" + process.env.INFURA_KEY;
// const optimismEndpoint = "https://opt-mainnet.g.alchemy.com/v2/" + process.env.POLYGON_KEY;
// const avalancheEndpoint = "https://rpc.ankr.com/avalanche";

const goerliEndpoint = "https://eth-goerli.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const mumbaiEndpoint = "https://polygon-mumbai.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const sepoliaEndpoint = "https://eth-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
//const sepoliaInfura = "https://sepolia.infura.io/v3/" + process.env.INFURA_KEY
const opGoerliEndpoint = "https://opt-goerli.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const opEndpoint =  "https://opt-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const mainnetEndpoint = "https://eth-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const ws_opEndpoint = "wss://opt-mainnet.g.alchemy.com/v2/" +  process.env.ALCHEMY_KEY
//const opSepoliaEndpoint = "https://sepolia.optimism.io"
const opSepoliaEndpoint = "https://opt-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const opSepoliaWebsocketEndpoint = "wss://opt-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
//const mainnetEndpoint = "https://eth.llamarpc.com"

const WS_PROVIDERS = {
    OPSEPOLIA: new ethers.providers.WebSocketProvider(opSepoliaWebsocketEndpoint)
}

const PROVIDERS = {
    MAINNET: new ethers.providers.JsonRpcProvider(mainnetEndpoint),
    OPSEPOLIA: new ethers.providers.JsonRpcProvider(opSepoliaEndpoint),
    GOERLI: new ethers.providers.JsonRpcProvider(goerliEndpoint),
    MUMBAI: new ethers.providers.JsonRpcProvider(mumbaiEndpoint),
    SEPOLIA: new ethers.providers.JsonRpcProvider(sepoliaEndpoint),
    OPGOERLI: new ethers.providers.JsonRpcProvider(opGoerliEndpoint),
    OPTIMISM: new ethers.providers.JsonRpcProvider(opEndpoint),


    // POLYGON: new ethers.providers.JsonRpcProvider(polygonEndpoint),
    // AVALANCHE: new ethers.providers.JsonRpcProvider(
    //     avalancheEndpoint
    // ),
    // ETHEREUM: new ethers.providers.JsonRpcProvider(ethereumEndpoint),
    // OPTIMISM: new ethers.providers.JsonRpcProvider(optimismEndpoint)
}


const wally = new ethers.Wallet(process.env.PRIVATE_KEY,PROVIDERS[CONFIG.CHAINNAME])
const SIGNER = wally.connect(PROVIDERS[CONFIG.CHAINNAME]);
const MAINNETSIGNER = wally.connect(PROVIDERS["MAINNET"])
//console.log("signer",SIGNER)
module.exports = {PROVIDERS, SIGNER , MAINNETSIGNER, WS_PROVIDERS}

