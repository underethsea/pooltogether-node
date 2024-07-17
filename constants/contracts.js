const ethers = require("ethers");
const { ABI } = require("./abi.js");
const { ADDRESS, ADDRESS_AUCTION } = require("./address.js");
const { PROVIDERS, MAINNETSIGNER, SIGNER } = require("./providers.js");
const { CHAINS } = require("../chains");
const { getChainConfig } = require("../chains");

const CHAINNAME = getChainConfig().CHAINNAME;
//console.log("contracts chain",CHAINNAME)

const isTestnet = CHAINS[CHAINNAME]?.testnet;
const isOpchain = CHAINS[CHAINNAME]?.opchain
const hasSwapper = ADDRESS?.[CHAINNAME]?.SWAPPER ?? false;
const hasUniFlashLiquidator = ADDRESS[CHAINNAME]?.UNIFLASHLIQUIDATOR ?? false
const hasGasOracle = ADDRESS[CHAINNAME]?.GASORACLE ?? false
const CONTRACTS = {
  /*  WINBOOSTERSIGNER: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].WINBOOSTER,
      ABI.WINBOOSTER,
      SIGNER
    ),
  },
  WINBOOSTER: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].WINBOOSTER,
      ABI.WINBOOSTER,
      PROVIDERS[CHAINNAME]
    ),
  },
  WINBOOSTSIGNER: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].WINBOOST,
      ABI.WINBOOST,
      SIGNER
    ),
  },
  WINBOOST: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].WINBOOST,
      ABI.WINBOOST,
      PROVIDERS[CHAINNAME]
    ),
  },
*/
...(hasUniFlashLiquidator ? {
UNIFLASHLIQUIDATORSIGNER: {
[CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].UNIFLASHLIQUIDATOR,
      ABI.UNIFLASHLIQUIDATOR,
      SIGNER
    ),
}
}: {}),

...(hasSwapper ? {
    SWAPPERSIGNER: {
      [CHAINNAME]: new ethers.Contract(
        ADDRESS[CHAINNAME].SWAPPER,
        ABI.SWAPPER,
        SIGNER
      ),
    }
  } : {}),


  /*  GAS: {
  [CHAINNAME]: new ethers.Contract(
   ADDRESS[CHAINNAME].GAS,
   ABI.OPGAS,
   PROVIDERS[CHAINNAME]
   ),
},*/ 


...(isOpchain && hasGasOracle
  ? {
  GASORACLE: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].GASORACLE,
      ABI.GASORACLE,
      PROVIDERS[CHAINNAME]
    )
  }
}: {} ),
  CLAIMERSIGNER: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].CLAIMERS[0],
      ABI.CLAIMER,
      SIGNER
    ),
  },
  CLAIMER: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].CLAIMERS[0],
      ABI.CLAIMER,
      PROVIDERS[CHAINNAME]
    ),
  },
  VAULTS: {
    [CHAINNAME]: ADDRESS[CHAINNAME].VAULTS.map((vault) => ({
      /*    LIQUIDATIONPAIR: new ethers.Contract(
        vault.LIQUIDATIONPAIR,
        ABI.LIQUIDATIONPAIR,
        PROVIDERS[CHAINNAME]
      ),*/
      VAULT: new ethers.Contract(vault.VAULT, ABI.VAULT, PROVIDERS[CHAINNAME]),
    })),
  },
  LIQUIDATIONROUTER: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].LIQUIDATIONROUTER,
      ABI.LIQUIDATIONROUTER,
      PROVIDERS[CHAINNAME]
    ),
  },
  /*  LIQUIDATIONPAIRFACTORY: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].LIQUIDATIONPAIRFACTORY,
      ABI.LIQUIDATIONPAIRFACTORY,
      PROVIDERS[CHAINNAME]
    ),
  },
*/
  PRIZETOKEN: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS,
      ABI.ERC20,
      PROVIDERS[CHAINNAME]
    ),
  },
  ...(isTestnet
    ? {
        TOKENFAUCET: {
          [CHAINNAME]: new ethers.Contract(
            ADDRESS[CHAINNAME].TOKENFAUCET,
            ABI.TOKENFAUCET,
            SIGNER
          ),
        },
      }
    : {}),
  PRIZEPOOL: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].PRIZEPOOL,
      ABI.PRIZEPOOL,
      PROVIDERS[CHAINNAME]
    ),
  },

  RNG: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].RNG,
      ABI.RNG,
      PROVIDERS[CHAINNAME]
    ),
  },
  DRAWMANAGER: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].DRAWMANAGER,
      ABI.DRAWMANAGER,
      PROVIDERS[CHAINNAME]
    ),
  },
  RNGWITHSIGNER: {
    [CHAINNAME]: new ethers.Contract(ADDRESS[CHAINNAME].RNG, ABI.RNG, SIGNER),
  },
  DRAWMANAGERWITHSIGNER: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].DRAWMANAGER,
      ABI.DRAWMANAGER,
      SIGNER
    ),
  },
  PRIZEPOOLWITHSIGNER: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].PRIZEPOOL,
      ABI.PRIZEPOOL,
      SIGNER
    ),
  },

  PRIZETOKENWITHSIGNER: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS,
      ABI.ERC20,
      SIGNER
    ),
  },

  LIQUIDATIONROUTERSIGNER: {
    [CHAINNAME]: new ethers.Contract(
      ADDRESS[CHAINNAME].LIQUIDATIONROUTER,
      ABI.LIQUIDATIONROUTER,
      SIGNER
    ),
  },
};

module.exports = { CONTRACTS };
