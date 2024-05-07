const fetch = require("cross-fetch")

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
  
const GeckoIDPrices = async (geckoIds) => {
    // Ensure geckoIds is always an array
    if (!Array.isArray(geckoIds)) {
        geckoIds = [geckoIds];
    }

    const url =
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=" +
      geckoIds.join(",") +
      "&order=market_cap_desc&price_change_percentage=24h";
   // console.log(url);
  
    try {
      let result = await fetch(url);
      let geckoData = await result.json();
     // console.log(geckoData);
  
      // Create a map to store the prices for each ID
      const pricesMap = new Map();
      for (const data of geckoData) {
        const price = parseFloat(data.current_price);
        pricesMap.set(data.id.toLowerCase(), price);
      }
  
      // Return an array of prices in the same order as the input array
      const prices = geckoIds.map(
        (id) => pricesMap.get(id.toLowerCase())
      );
  
      return prices;
    } catch (error) {
      console.log(error);
    }
};


module.exports = { GeckoPrices , GeckoIDPrices};
