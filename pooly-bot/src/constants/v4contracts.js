const ethers = require("ethers");
const { V4ABI } = require("./v4abi.js");
const {V4ADDRESS} = require("./v4addresses.js")

const { PROVIDERS } = require("./providers.js");
const V4CONTRACTS = {
  BEACON: {
    POLYGON: new ethers.Contract(
      V4ADDRESS.POLYGON.BEACON,
      V4ABI.BEACON,
      PROVIDERS.POLYGON
    ),
    ETHEREUM: new ethers.Contract(
      V4ADDRESS.ETHEREUM.BEACON,
      V4ABI.BEACON,
      PROVIDERS.ETHEREUM
    ),
    AVALANCHE: new ethers.Contract(
      V4ADDRESS.ETHEREUM.BEACON,
      V4ABI.BEACON,
      PROVIDERS.ETHEREUM
    ),
    // AVALANCHE: new ethers.Contract(V4ADDRESS.AVALANCHE.BEACON,V4ABI.BEACON,PROVIDERS.AVALANCHE),
    //  OP AND AVAX HACK - -- - USSES MAINNET BECAUSE OP NO BEACON!!!!!!
    OPTIMISM: new ethers.Contract(
      V4ADDRESS.ETHEREUM.BEACON,
      V4ABI.BEACON,
      PROVIDERS.ETHEREUM
    ),
  },

  TICKET: {
    POLYGON: new ethers.Contract(
      V4ADDRESS.POLYGON.TICKET,
      V4ABI.TICKET,
      PROVIDERS.POLYGON
    ),
    AVALANCHE: new ethers.Contract(
      V4ADDRESS.AVALANCHE.TICKET,
      V4ABI.TICKET,
      PROVIDERS.AVALANCHE
    ),
    ETHEREUM: new ethers.Contract(
      V4ADDRESS.ETHEREUM.TICKET,
      V4ABI.TICKET,
      PROVIDERS.ETHEREUM
    ),
    OPTIMISM: new ethers.Contract(
      V4ADDRESS.OPTIMISM.TICKET,
      V4ABI.TICKET,
      PROVIDERS.OPTIMISM
    ),
  },
  AAVE: {
    POLYGON: new ethers.Contract(
      V4ADDRESS.POLYGON.AAVETOKEN,
      V4ABI.AAVE,
      PROVIDERS.POLYGON
    ),
    AVALANCHE: new ethers.Contract(
      V4ADDRESS.AVALANCHE.AAVETOKEN,
      V4ABI.AAVE,
      PROVIDERS.AVALANCHE
    ),
    ETHEREUM: new ethers.Contract(
      V4ADDRESS.ETHEREUM.AAVETOKEN,
      V4ABI.AAVE,
      PROVIDERS.ETHEREUM
    ),
    OPTIMISM: new ethers.Contract(
      V4ADDRESS.OPTIMISM.AAVETOKEN,
      V4ABI.AAVE,
      PROVIDERS.OPTIMISM
    ),
  },
  AAVEINCENTIVES: {
    POLYGON: new ethers.Contract(
      V4ADDRESS.POLYGON.AAVEINCENTIVES,
      V4ABI.AAVEINCENTIVES,
      PROVIDERS.POLYGON
    ),
    ETHEREUM: new ethers.Contract(
      V4ADDRESS.ETHEREUM.AAVEINCENTIVES,
      V4ABI.AAVEINCENTIVES,
      PROVIDERS.ETHEREUM
    ),
    AVALANCHE: new ethers.Contract(
      V4ADDRESS.AVALANCHE.AAVEINCENTIVES,
      V4ABI.AAVEINCENTIVES,
      PROVIDERS.AVALANCHE
    ),
    OPTIMISM: new ethers.Contract(
      V4ADDRESS.OPTIMISM.AAVEINCENTIVES,
      V4ABI.AAVEINCENTIVESV3,
      PROVIDERS.OPTIMISM
    ),
  },
  PRIZETIER: {
    ETHEREUM: new ethers.Contract(
      V4ADDRESS.ETHEREUM.PRIZETIER,
      V4ABI.PRIZETIERV2,
      PROVIDERS.ETHEREUM
    ),
    AVALANCHE: new ethers.Contract(
      V4ADDRESS.AVALANCHE.PRIZETIER,
      V4ABI.PRIZETIERV2,
      PROVIDERS.AVALANCHE
    ),
    OPTIMISM: new ethers.Contract(
      V4ADDRESS.OPTIMISM.PRIZETIER,
      V4ABI.PRIZETIERV2,
      PROVIDERS.OPTIMISM
    ),
    POLYGON: new ethers.Contract(
      V4ADDRESS.POLYGON.PRIZETIER,
      V4ABI.PRIZETIERV2,
      PROVIDERS.POLYGON
    ),
  },
  AAVEDATA: {
    OPTIMISM: new ethers.Contract(
      V4ADDRESS.OPTIMISM.AAVEDATA,
      V4ABI.AAVEDATA,
      PROVIDERS.OPTIMISM
    ),
    ETHEREUM: new ethers.Contract(
      V4ADDRESS.ETHEREUM.AAVEDATA,
      V4ABI.AAVEDATAV2,
      PROVIDERS.ETHEREUM
    ),
    POLYGON: new ethers.Contract(
      V4ADDRESS.POLYGON.AAVEDATA,
      V4ABI.AAVEDATAV2,
      PROVIDERS.POLYGON
    ),
    AVALANCHE: new ethers.Contract(
      V4ADDRESS.AVALANCHE.AAVEDATA,
      V4ABI.AAVEDATAV2,
      PROVIDERS.AVALANCHE
    ),
  },
};

module.exports = { V4CONTRACTS };
