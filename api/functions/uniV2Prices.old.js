require('../env-setup');
const { ethers } = require('ethers');
const { PROVIDERS } = require('../constants/providers');
const { ADDRESS } = require('../../constants/address.js');
const { Multicall } = require('../utilities/muliticall.js')
const wethAddresses = {
  OPTIMISM: ADDRESS.OPTIMISM.PRIZETOKEN.ADDRESS,
  ARBITRUM: '',
  BASE: '',
  // Add other chains as needed
};

const uniswapV2PairAbi = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function totalSupply() external view returns (uint)'
];

// Function to find all UNIV2 assets
function findUniv2Assets(addresses) {
  return Object.entries(addresses).flatMap(([chainName, chainData]) =>
    chainData.VAULTS
      .filter(vault => vault.UNIV2 === true)
      .map(vault => ({ chainName, asset: vault.ASSET }))
  );
}

// Function to fetch LP price in WETH
async function uniV2LPPriceInWeth(lpAddress, wethAddress, chainName) {
  const provider = PROVIDERS[chainName];
  const pairContract = new ethers.Contract(lpAddress, uniswapV2PairAbi, provider);

console.log("trying to get univ2 price")
  try {
    const [[reserve0, reserve1], token0Address, token1Address, totalSupply] = await Promise.all([
      pairContract.getReserves(),
      pairContract.token0(),
      pairContract.token1(),
      pairContract.totalSupply()
    ]);

console.log("got token0 address",token0Address)
    let wethReserve;

    if (token0Address.toLowerCase() === wethAddress.toLowerCase()) {
      wethReserve = reserve0; // BigNumber
    } else if (token1Address.toLowerCase() === wethAddress.toLowerCase()) {
      wethReserve = reserve1; // BigNumber
    } else {
      return 'No WETH in this pair';
    }

    // Increase precision by multiplying wethReserve by a large factor before division
    const totalValueInWETH = wethReserve.mul(ethers.BigNumber.from('2')); // Calculating total value
    const pricePerLPTokenInWETH = totalValueInWETH.mul(ethers.BigNumber.from('1000000000000000000')).div(totalSupply); // Scale up to maintain precision

    return ethers.utils.formatUnits(pricePerLPTokenInWETH, 18);
  } catch (error) {
    console.error(`Failed to fetch price for ${lpAddress} on ${chainName}:`, error);
    return null;
  }
}

// Main function to find and price all UNIV2 assets
async function FindAndPriceUniv2Assets() {
  const univ2Assets = findUniv2Assets(ADDRESS);

  const results = await Promise.all(
    univ2Assets.map(async ({ chainName, asset }) => {
      // Ensure the asset address is lowercase before querying the price
      const normalizedAsset = asset.toLowerCase();
      const price = await uniV2LPPriceInWeth(normalizedAsset, wethAddresses[chainName], chainName);
      return { chainName, asset: normalizedAsset, price };
    })
  );

  // Format the results in the desired structure
  const formattedResults = results
    .filter(result => result.price !== null) // Filter out assets with null prices
    .reduce((acc, { chainName, asset, price }) => {
      if (!acc[chainName]) {
        acc[chainName] = {};
      }
      // Use the normalized asset address as the key
      acc[chainName][asset] = price;
      return acc;
    }, {});

  return formattedResults; // Directly return the object instead of mapping it into an array
}

/*
findAndPriceUniv2Assets()
  .then(results => console.log('Results:', JSON.stringify(results, null, 2)))
  .catch(err => console.error(err));
*/
module.exports = { FindAndPriceUniv2Assets, uniV2LPPriceInWeth };
