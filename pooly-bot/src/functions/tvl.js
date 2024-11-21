const ethers = require('ethers');
const fetch = require('node-fetch');
const {PROVIDERS} = require('../../../constants/providers')
const {ABI} = require('../constants/toucanAbi')

const fetchJSON = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  return response.json();
};

const groupVaultsByChain = (vaults) => {
  return vaults.reduce((acc, vault) => {
    const chainName = getChainName(vault.c);
    if (!acc[chainName]) {
      acc[chainName] = [];
    }
    acc[chainName].push(vault);
    return acc;
  }, {});
};

const getChainName = (chainId) => {
  switch (chainId) {
    case 10: return 'OPTIMISM';
    case 42161: return 'ARBITRUM';
    case 8453: return 'BASE';
    case 1: return 'ETHEREUM';
    case 534352: return 'SCROLL';
    case 100: return 'GNOSIS';
    // Add other chain IDs as needed
    default: return 'UNKNOWN';
  }
};

const getVaultTotalAssets = async (vault, chainName) => {
  const contract = new ethers.Contract(vault.vault, ABI.VAULT, PROVIDERS[chainName]);
  return contract.totalAssets();
};

const getVaultPrices = (prices, chainName, assetAddress) => {
  if (prices.assets[chainName] && prices.assets[chainName][assetAddress]) {
    return prices.assets[chainName][assetAddress];
  }
  return 0;
};

const Tvl = async () => {
  try {
    const vaults = await fetchJSON('https://poolexplorer.xyz/vaults');
    const overview = await fetchJSON('https://poolexplorer.xyz/overview');
console.log("got jsons")
    const groupedVaults = groupVaultsByChain(vaults);
    const chainTotals = {};

    for (const chainName in groupedVaults) {
console.log("getting chainname",chainName)   
   const chainVaults = groupedVaults[chainName];
      
      const multicallArray = chainVaults.map(vault => getVaultTotalAssets(vault, chainName));
      const totalAssets = await Promise.all(multicallArray);
console.log("total assets",totalAssets)
      let chainTotalUSD = 0;
console.log(totalAssets)      
      totalAssets.forEach((total, index) => {
        const vault = chainVaults[index];
        const price = getVaultPrices(overview.prices, chainName, vault.asset.toLowerCase());
                console.log("getting price for ",vault.asset,vault.symbol,price)
        chainTotalUSD += parseFloat(ethers.utils.formatUnits(total, vault.decimals)) * price;
      });

      chainTotals[chainName] = chainTotalUSD;
    }
return chainTotals

    console.log("Chain Total USD Values:", chainTotals);
  } catch (error) {
    console.error("Error in fetching or processing data:", error);
  }
};

module.exports = {Tvl}
