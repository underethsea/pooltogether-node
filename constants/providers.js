require('../env-setup');
const ethers = require("ethers");
const {  getChainConfig } = require("../chains");

const CHAINNAME = getChainConfig().CHAINNAME;

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
const gnosisEndpoint = "https://gnosis-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const worldEndpoint = "https://worldchain-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
//const scrollEndpoint = "https://scroll-mainnet-public.unifra.io"
const scrollEndpoint = "https://scroll-mainnet.g.alchemy.com/v2/"  + process.env.ALCHEMY_KEY
const goerliEndpoint = "https://eth-goerli.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const mumbaiEndpoint = "https://polygon-mumbai.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const sepoliaEndpoint = "https://eth-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
//const sepoliaInfura = "https://sepolia.infura.io/v3/" + process.env.INFURA_KEY
//const opGoerliEndpoint = "https://opt-goerli.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const opEndpoint =  "https://opt-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
//const opEndpoint = "https://optimism-mainnet.infura.io/v3/" + process.env.INFURA_KEY
//const opEndpoint =  "https://bitter-wider-reel.optimism.quiknode.pro/"+ process.env.QUICKNODE_KEY
const mainnetEndpoint = "https://eth-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const flashbotsEndpoint = "https://rpc.flashbots.net/"
//const ws_opEndpoint = "wss://opt-mainnet.g.alchemy.com/v2/" +  process.env.ALCHEMY_KEY
//const opSepoliaEndpoint = "https://sepolia.optimism.io"
const opSepoliaEndpoint = "https://opt-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const opSepoliaWebsocketEndpoint = "wss://opt-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const arbEndpoint = "https://arb-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
//const arbEndpoint = "https://arbitrum-mainnet.infura.io/v3/" + process.env.INFURA_KEY
const ws_arbEndpoint = "wss://arbitrum-mainnet.infura.io/ws/v3/" +  process.env.INFURA_KEY
const ws_opEndpoint = "wss://optimism-mainnet.infura.io/ws/v3/" +  process.env.INFURA_KEY
// const baseSepoliaEndpoint = "https://sepolia.base.org"
const baseSepoliaEndpoint = "https://base-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
//const mainnetEndpoint = "https://eth.llamarpc.com"
const arbSepoliaEndpoint = "https://sepolia-rollup.arbitrum.io/rpc"
const baseEndpoint = "https://base-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
//const baseEndpoint = "https://bitter-wider-reel.optimism.quiknode.pro/"+ process.env.QUICKNODE_KEY
//const baseEndpoint = "https://rpc.ankr.com/base/" + process.env.ANKR_KEY
//const baseEndpoint =  "https://base-mainnet.infura.io/v3/" + process.env.INFURA_KEY
//const baseEndpoint = "https://base.llamarpc.com"
const WS_PROVIDERS = {
//    OPSEPOLIA: new ethers.providers.WebSocketProvider(opSepoliaWebsocketEndpoint)

//ARBITRUM: new ethers.providers.WebSocketProvider(ws_arbEndpoint),
//OPTIMISM: new ethers.providers.WebSocketProvider(ws_opEndpoint)
}

const PROVIDERS = {
GNOSIS: new ethers.providers.JsonRpcProvider(gnosisEndpoint),
  SCROLL: new ethers.providers.JsonRpcProvider(scrollEndpoint),
  FLASHBOTS: new ethers.providers.JsonRpcProvider(flashbotsEndpoint),
ETHEREUM:  new ethers.providers.JsonRpcProvider(mainnetEndpoint),
// flashbots
//ETHEREUM:  new ethers.providers.JsonRpcProvider(flashbotsEndpoint),
//ETHEREUM:  new ethers.providers.JsonRpcProvider(mainnetEndpoint),
    MAINNET: new ethers.providers.JsonRpcProvider(mainnetEndpoint),
    OPSEPOLIA: new ethers.providers.JsonRpcProvider(opSepoliaEndpoint),
    //  GOERLI: new ethers.providers.JsonRpcProvider(goerliEndpoint),
    //  MUMBAI: new ethers.providers.JsonRpcProvider(mumbaiEndpoint),
    SEPOLIA: new ethers.providers.JsonRpcProvider(sepoliaEndpoint),
    //  OPGOERLI: new ethers.providers.JsonRpcProvider(opGoerliEndpoint),
    OPTIMISM: new ethers.providers.JsonRpcProvider(opEndpoint),
    BASESEPOLIA: new ethers.providers.JsonRpcProvider(baseSepoliaEndpoint),
    ARBITRUM: new ethers.providers.JsonRpcProvider(arbEndpoint),
    ARBSEPOLIA: new ethers.providers.JsonRpcProvider(arbSepoliaEndpoint),
    BASE: new ethers.providers.JsonRpcProvider(baseEndpoint),
    WORLD: new ethers.providers.JsonRpcProvider(worldEndpoint),
    // POLYGON: new ethers.providers.JsonRpcProvider(polygonEndpoint),
    // AVALANCHE: new ethers.providers.JsonRpcProvider(
    //     avalancheEndpoint
    // ),
    // ETHEREUM: new ethers.providers.JsonRpcProvider(ethereumEndpoint),
    // OPTIMISM: new ethers.providers.JsonRpcProvider(optimismEndpoint)
}


const wally = new ethers.Wallet(process.env.PRIVATE_KEY,PROVIDERS[CHAINNAME])
const SIGNER = wally.connect(PROVIDERS[CHAINNAME]);

const flashbots_wally = new ethers.Wallet(process.env.PRIVATE_KEY,PROVIDERS["FLASHBOTS"])
const SIGNER_FLASHBOTS = flashbots_wally.connect(PROVIDERS["FLASHBOTS"])

const MAINNETSIGNER = wally.connect(PROVIDERS["MAINNET"])
//console.log("signer",SIGNER)
module.exports = {PROVIDERS, SIGNER , MAINNETSIGNER, WS_PROVIDERS, SIGNER_FLASHBOTS}
