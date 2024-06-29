
const dotenv = require("dotenv").config({path : '../../.env'});
const ethers = require("ethers");
// const { CONFIG }= require("./config")


const goerliEndpoint = "https://eth-goerli.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const mumbaiEndpoint = "https://polygon-mumbai.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const sepoliaEndpoint = "https://eth-sepolia.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const opGoerliEndpoint = "https://opt-goerli.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const opEndpoint =  "https://opt-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const mainnetEndpoint = "https://eth-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const ws_opEndpoint = "wss://opt-mainnet.g.alchemy.com/v2/" +  process.env.ALCHEMY_KEY
const opsepolia_http = "https://sepolia.optimism.io"
const op_http = "https://mainnet.optimism.io"
const baseMainnet = "https://base-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY
const arbitrum = "https://arb-mainnet.g.alchemy.com/v2/"   + process.env.ALCHEMY_KEY
// for v4
const polygonEndpoint = "https://polygon-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_KEY;
const avalancheEndpoint = "https://api.avax.network/ext/bc/C/rpc";



//const mainnetEndpoint = "https://eth.llamarpc.com"

// const WS_PROVIDERS = {
//     OPTIMISM: new ethers.providers.WebSocketProvider(ws_opEndpoint)
// }

const PROVIDERS = {
    MAINNET: new ethers.providers.JsonRpcProvider(mainnetEndpoint),
    // v4 support different naming
    ETHEREUM: new ethers.providers.JsonRpcProvider(mainnetEndpoint),
    ARBITRUM: new ethers.providers.JsonRpcProvider(arbitrum),
    GOERLI: new ethers.providers.JsonRpcProvider(goerliEndpoint),
    MUMBAI: new ethers.providers.JsonRpcProvider(mumbaiEndpoint),
    SEPOLIA: new ethers.providers.JsonRpcProvider(sepoliaEndpoint),
    OPGOERLI: new ethers.providers.JsonRpcProvider(opGoerliEndpoint),
    //OPTIMISM: new ethers.providers.JsonRpcProvider(opEndpoint),   //uncomment when we figure out websockets
    OPTIMISM: new ethers.providers.JsonRpcProvider(op_http),
    OPTIMISMSEPOLIA: new ethers.providers.JsonRpcProvider(opsepolia_http),
    POLYGON: new ethers.providers.JsonRpcProvider(polygonEndpoint),
    AVALANCHE: new ethers.providers.JsonRpcProvider(avalancheEndpoint),
    BASE: new ethers.providers.JsonRpcProvider(baseMainnet)

    // POLYGON: new ethers.providers.JsonRpcProvider(polygonEndpoint),
    // AVALANCHE: new ethers.providers.JsonRpcProvider(
    //     avalancheEndpoint
    // ),
    // ETHEREUM: new ethers.providers.JsonRpcProvider(ethereumEndpoint),
    // OPTIMISM: new ethers.providers.JsonRpcProvider(optimismEndpoint)
}


//console.log("signer",SIGNER)
module.exports = {PROVIDERS}
