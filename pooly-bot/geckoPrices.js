const fetch = require("cross-fetch")

const GeckoPrices = async (contractAddresses) => {
    const url =
      "https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=" +
      contractAddresses.join(",") +
      "&vs_currencies=usd";
    console.log(url);
  
    try {
      let result = await fetch(url);
      let geckoPrices = await result.json();
      console.log(geckoPrices);
  
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
  
module.exports = { GeckoPrices };
