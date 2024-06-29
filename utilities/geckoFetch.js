const fetch = require("cross-fetch");

const fetchPoolExplorerPrices = async () => {
  try {
    const result = await fetch("https://poolexplorer.xyz/prices");
    const data = await result.json();
    
    const currentTime = new Date().getTime();
    const timestamp = new Date(data.timestamp).getTime();
    const timeDifference = (currentTime - timestamp) / 1000;
    
    if (timeDifference > 20) {
      console.log("Poolexplorer price data is too stale, using Coingecko");
      return null
    }

    return data.geckos;
  } catch (error) {
    console.log("Failed to fetch PoolExplorer prices or data is stale:", error);
    return null;
  }
};

const GeckoIDPrices = async (geckoIds) => {
  // Ensure geckoIds is always an array
  if (!Array.isArray(geckoIds)) {
    geckoIds = [geckoIds];
  }

  // Try fetching from PoolExplorer first
  let prices = await fetchPoolExplorerPrices();

  // Check if we have all the required prices from PoolExplorer
  if (prices && geckoIds.every(id => prices[id] !== undefined)) {
    return geckoIds.map(id => prices[id]);
  }

  // If PoolExplorer data is not sufficient, fall back to CoinGecko
  const url =
    "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" +
    geckoIds.join(",") +
    "&order=market_cap_desc&price_change_percentage=24h";

  try {
    let result = await fetch(url);
    let geckoData = await result.json();

    // Create a map to store the prices for each ID
    const pricesMap = new Map();
    for (const data of geckoData) {
      const price = parseFloat(data.current_price);
      pricesMap.set(data.id.toLowerCase(), price);
    }

    // Return an array of prices in the same order as the input array
    const pricesFromGecko = geckoIds.map(id => pricesMap.get(id.toLowerCase()));

    return pricesFromGecko;
  } catch (error) {
    console.log(error);
  }
};


const GeckoPrices = async (contractAddresses) => {
    const url =
      "https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=" +
      contractAddresses.join(",") +
      "&vs_currencies=usd";
    //console.log(url);
  
    try {
      let result = await fetch(url);
      let geckoPrices = await result.json();
      //console.log(geckoPrices);
  
      // Create a map to store the prices for each token
      const pricesMap = new Map();
      for (const [contractAddress, data] of Object.entries(geckoPrices)) {
        const price = parseFloat(data.usd);
        pricesMap.set(contractAddress.toLowerCase(), price);
      }
  
      // Return an array of prices in the same order as the input array
      const prices = contractAddresses.map(
        (contractAddress) => pricesMap.get(contractAddress.toLowerCase())
      );
  
      return prices;
    } catch (error) {
      console.log(error);
    }
  };
module.exports = { GeckoIDPrices, GeckoPrices };
