const fs = require('fs');
const path = require('path');
require('../env-setup');
const { ethers } = require('ethers');
const { PROVIDERS } = require('../constants/providers');
const { ADDRESS } = require('../../constants/address.js');
const fetch = require('node-fetch'); // Added node-fetch for API requests

const wethAddresses = {
  OPTIMISM: ADDRESS.OPTIMISM.PRIZETOKEN.ADDRESS,
  ARBITRUM: ADDRESS.BASE.PRIZETOKEN.ADDRESS,
  BASE: ADDRESS.BASE.PRIZETOKEN.ADDRESS,
  // Add other chains as needed
};

const coingeckoOverrides = [
  {
    pair: '0x0b15b1d434f86eCaa83d14398C8Db6d162F3921e', // Replace with actual LP address
    token0CoingeckoId: 'liquity-usd', // Coingecko ID for token0
  },
  // Add more overrides as needed
];

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
      .map(vault => ({ chainName,
        asset: vault.UNDERLYINGLP ? vault.UNDERLYINGLP : vault.ASSET // Use UNDERLYINGLP if it exists, otherwise ASSET
      }))
  );
}
const cacheFilePath = path.join(__dirname, '../data/univ2TokenCache.json');

// Load cache from file
function loadCache() {
  try {
    const data = fs.readFileSync(cacheFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

// Save cache to file
function saveCache(cache) {
  fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2), 'utf8');
}

// Function to fetch LP price in WETH with cache
async function uniV2LPPriceInWeth(lpAddress, wethAddress, chainName) {
  const provider = PROVIDERS[chainName];
  //console.log(`Using provider for chain: ${chainName}`);
 // console.log(`LP Address: ${lpAddress}`);
  const pairContract = new ethers.Contract(lpAddress, uniswapV2PairAbi, provider);
 // console.log(`Pair contract created successfully for ${lpAddress}`);
 
  const cache = loadCache();
  const normalizedLpAddress = lpAddress.toLowerCase();

  let token0Address, token1Address, reserve0, reserve1, totalSupply;

  // Check cache first
  if (cache[normalizedLpAddress]) {
    ({ token0Address, token1Address } = cache[normalizedLpAddress]);
    console.log(`Using cached data for ${lpAddress}`);

    // Fetch reserves and total supply
    [reserve0, reserve1, totalSupply] = await Promise.all([
      pairContract.getReserves().then(res => res[0]),
      pairContract.getReserves().then(res => res[1]),
      pairContract.totalSupply()
    ]);
  } else {
    try {
      console.log(`Fetching data for ${lpAddress}`);
      const [reserves, token0, token1, supply] = await Promise.all([
        pairContract.getReserves(),
        pairContract.token0(),
        pairContract.token1(),
        pairContract.totalSupply()
      ]);

      reserve0 = reserves[0];
      reserve1 = reserves[1];
      totalSupply = supply;
      token0Address = token0;
      token1Address = token1;

      // Cache the token0 and token1 addresses
      cache[normalizedLpAddress] = { token0Address, token1Address };
      saveCache(cache);
    } catch (error) {
      console.error(`Failed to fetch price for ${lpAddress} on ${chainName}:`, error);
      return null;
    }
  }

  // Check for Coingecko override
  const override = coingeckoOverrides.find(override => override.pair.toLowerCase() === lpAddress.toLowerCase());
  if (override) {
    try {
      console.log(`Fetching Coingecko price for ${override.token0CoingeckoId}`);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${override.token0CoingeckoId}&vs_currencies=eth`
      );
      const data = await response.json();
      const token0PriceInWETH = data[override.token0CoingeckoId]?.eth;

      if (!token0PriceInWETH) {
        console.error(`Failed to fetch Coingecko price for ${override.token0CoingeckoId}`);
        return null;
      }

      // Use the Coingecko price to calculate the LP price
      return calculatePriceWithOverride(token0PriceInWETH, reserve0, reserve1, totalSupply);
    } catch (error) {
      console.error(`Error fetching Coingecko price for ${override.token0CoingeckoId}:`, error);
      return null;
    }
  }

  // If no override, fallback to standard WETH-based pricing
  return calculatePrice(token0Address, token1Address, reserve0, reserve1, totalSupply, wethAddress);
}

// Helper function to calculate the price
function calculatePrice(token0Address, token1Address, reserve0, reserve1, totalSupply, wethAddress) {
  /*console.log(`Debugging calculatePrice:`);
  console.log(`Token0 address: ${token0Address}`);
  console.log(`Token1 address: ${token1Address}`);
  console.log(`Reserve0: ${reserve0.toString()}`);
  console.log(`Reserve1: ${reserve1.toString()}`);
  console.log(`Total supply: ${totalSupply.toString()}`);
  console.log(`WETH address: ${wethAddress}`);*/
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
}

function calculatePriceWithOverride(token0PriceInWETH, reserve0, reserve1, totalSupply) {
  const scaledToken0PriceInWETH = ethers.BigNumber.from(
    (token0PriceInWETH * 1e18).toFixed(0) // Scale and convert to string
  );

  const token0ValueInWETH = scaledToken0PriceInWETH.mul(reserve0);
  const totalValueInWETH = token0ValueInWETH.add(reserve1);
  const pricePerLPTokenInWETH = totalValueInWETH
    .div(totalSupply);

  return ethers.utils.formatUnits(pricePerLPTokenInWETH.mul(2), 18);
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

module.exports = { FindAndPriceUniv2Assets, uniV2LPPriceInWeth };

// testing
// FindAndPriceUniv2Assets().then(ok => console.log(ok));
/*async function testUniV2LPPriceInWeth() {
  const lpAddress = '0x0b15b1d434f86eCaa83d14398C8Db6d162F3921e'; // Your test LP address
  const wethAddress = wethAddresses.OPTIMISM; // Adjust the chain if needed
  const chainName = 'BASE'; // Adjust the chain if needed

  const price = await uniV2LPPriceInWeth(lpAddress, wethAddress, chainName);
  console.log(`LP Price in WETH: ${price}`);
}

testUniV2LPPriceInWeth();
*/
