const ethers = require("ethers");
const { ABI } = require("./canaryAbi.js");
const { ADDRESS } = require("./canaryAddress.js");
const { PROVIDERS } = require("./providers.js");
// const { CONFIG } = require("./config.js");

let CONFIG = {}
CONFIG.CHAINNAME = "OPTIMISM"
// console.log("chain",CONFIG.CHAINNAME)
console.log("chain",CONFIG.CHAINNAME)

const CONTRACTS = {
  CLAIMER: {
    [CONFIG.CHAINNAME]: new ethers.Contract(
      ADDRESS[CONFIG.CHAINNAME].CLAIMER,
      ABI.CLAIMER,
      PROVIDERS[CONFIG.CHAINNAME]
    ),
  },
  VAULTS: {
    [CONFIG.CHAINNAME]: ADDRESS[CONFIG.CHAINNAME].VAULTS.map((vault) => ({
      LIQUIDATIONPAIR: new ethers.Contract(
        vault.LIQUIDATIONPAIR,
        ABI.LIQUIDATIONPAIR,
        PROVIDERS[CONFIG.CHAINNAME]
      ),
      VAULT: new ethers.Contract(
        vault.VAULT,
        ABI.VAULT,
        PROVIDERS[CONFIG.CHAINNAME]
      ),
    })),
  },
  LIQUIDATIONROUTER: {
    [CONFIG.CHAINNAME]: new ethers.Contract(
      ADDRESS[CONFIG.CHAINNAME].LIQUIDATIONROUTER,
      ABI.LIQUIDATIONROUTER,
      PROVIDERS[CONFIG.CHAINNAME]
    ),
  },
  // LIQUIDATIONPAIRFACTORY: {
  //   [CONFIG.CHAINNAME]: new ethers.Contract(
  //     ADDRESS[CONFIG.CHAINNAME].LIQUIDATIONPAIRFACTORY,
  //     ABI.LIQUIDATIONPAIRFACTORY,
  //     PROVIDERS[CONFIG.CHAINNAME]
  //   ),
  // },
  POOL: {
    [CONFIG.CHAINNAME]: new ethers.Contract(
      ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.ADDRESS,
      ABI.POOL,
      PROVIDERS[CONFIG.CHAINNAME]
    ),
  },
  // TOKENFAUCET: {
  //   [CONFIG.CHAINNAME]: new ethers.Contract(
  //     ADDRESS[CONFIG.CHAINNAME].TOKENFAUCET,
  //     ABI.TOKENFAUCET,
  //     SIGNER
  //   ),
  // },
  PRIZEPOOL: {
    [CONFIG.CHAINNAME]: new ethers.Contract(
      ADDRESS[CONFIG.CHAINNAME].PRIZEPOOL,
      ABI.PRIZEPOOL,
      PROVIDERS[CONFIG.CHAINNAME]
    ),
  },
  RNGRELAYAUCTION: {
    [CONFIG.CHAINNAME]: new ethers.Contract(
      ADDRESS[CONFIG.CHAINNAME].RNGRELAYAUCTION,
      ABI.RNGRELAYAUCTION,
      PROVIDERS[CONFIG.CHAINNAME]
    ),
  }
};

module.exports = { CONTRACTS };


// TESTS
// async function isProviderConnected(provider) {
//   try {
//     // Perform a basic network operation - getting the latest block number
//     const blockNumber = await provider.getBlockNumber();
//     console.log(`Current block number: ${blockNumber}`);
//     return true;
//   } catch (error) {
//     console.error(`Error checking provider connectivity: ${error.message}`);
//     return false;
//   }
// }

// async function getTotalAssetsOfFirstVault() {
//   try {
//     // Assuming CONTRACTS.VAULTS[CONFIG.CHAINNAME][0] is defined and has a VAULT property.
//     const vaultContractInstance = CONTRACTS.VAULTS[CONFIG.CHAINNAME][0].VAULT;
//     const totalAssets = await vaultContractInstance.totalAssets();
//     console.log(`Total assets: ${totalAssets.toString()}`);
//   } catch (error) {
//     console.error(`Error getting total assets from the first vault: ${error.message}`);
//   }
// }

// getTotalAssetsOfFirstVault();


// isProviderConnected(PROVIDERS["OPTIMISM"])
