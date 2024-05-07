const {CONTRACTS} = require("../constants/contracts")

const {PROVIDERS } = require("../constants/providers")
const {CONFIG} = require("../constants/config")
const {ADDRESS} = require("../constants/address")
const ethers = require('ethers');

async function getNewFactoryVaultEvents() {
    
    let filter = {
        address: ADDRESS[CONFIG.CHAINNAME].VAULTFACTORY,
        topics: [ "0xf83ead3b6178cebad4ff33b8ae0d5a10c12ce757cb9758b74f619837fc46fbc2" ],  
        fromBlock: -10000000, // replace with start block of factory
        toBlock: 'latest',
    };

    // Query past logs
    const logs = await PROVIDERS[CONFIG.CHAINNAME].getLogs(filter);
    console.log("found ",logs.length," vaults")
    logs.forEach(log => {
const vaultAddressTopic = log.topics[1];
    const vaultAddress = "0x" + vaultAddressTopic.slice(-40);
    console.log(ethers.utils.getAddress(vaultAddress));  // Convert and va
    });

    return logs;
}
getNewFactoryVaultEvents()

