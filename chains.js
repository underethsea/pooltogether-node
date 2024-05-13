const { CONFIG } = require('./constants/config');

const CHAINS = {
  OPTIMISM: { name: "Optimism", id: 10, opchain: true },
  ETHEREUM: { name: "Ethereum", id: 1 },
  POLYGON: { name: "Polygon", id: 137 },
  BASESEPOLIA: { name: "BaseSepolia", id: 84532, testnet: true, opchain: true },
  BASE: { name: "Base", id: 8453, opchain: true },
  OPSEPOLIA: {name: "OpSepolia", id: 11155420, testnet: true, opchain: true},
  ARBSEPOLIA: {name: "ArbSepolia", id: 421614, testnet: true}
};

let config = {};

function loadChainConfig(chainKey = CONFIG.CHAINNAME) {
  // Try to find a chain by name first
  let chainConfig = CHAINS[chainKey.toUpperCase()] || Object.values(CHAINS).find(c => c.id === parseInt(chainKey));

  if (!chainConfig) {
    console.error(`Chain not specified: ${chainKey}. Using default from ./constants/config ${CONFIG.CHAINNAME}`);
    chainConfig = CHAINS[CONFIG.CHAINNAME]; // Fallback to the default chain name
  }

  config = {
    CHAINNAME: chainConfig.name.toUpperCase(),
    CHAINID: chainConfig.id
  };
  Object.freeze(config); // Make the config object immutable
console.log(config.CHAINNAME,config.CHAINID)
}

function getChainConfig() {
  return config;
}

module.exports = { loadChainConfig, getChainConfig, CHAINS };
