const { ADDRESS } = require("../constants/canaryAddress")
const fetch = require("cross-fetch")


 async function FetchPriceForAsset  (
  geckoIDs, 
  denomination= "usd"
)  {

  // Convert single geckoID to an array for uniform processing
  const geckoIDsArray = Array.isArray(geckoIDs) ? geckoIDs : [geckoIDs];
  
  const coingeckoUrl =
    `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIDsArray.join(",")}&vs_currencies=${denomination}`;
  
  const response = await fetch(coingeckoUrl);
  const data = await response.json();

  // Map over the geckoIDs to extract the price information
  const prices = geckoIDsArray.map((id) => {
    if (!data[id] || !data[id][denomination]) {
      throw new Error(`Failed to fetch price data for ${id}`);
    }
    return {
      geckoID: id,
      price: data[id][denomination]
    };
  });

  // If the original input was a single string, return a single object, else return an array
  return Array.isArray(geckoIDs) ? prices : prices[0];
};


 async function FetchPricesForChain  (chain, denomination) {
  // console.log("prices for chain",chain)
  // console.log("address constant",ADDRESS[chain].VAULTS)
  const geckoIDs = ADDRESS[chain].VAULTS.map(vault => vault.GECKO);
  const coingeckoUrl =
    `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIDs.join(",")}&vs_currencies=${denomination}`;
// console.log("gecko",coingeckoUrl)
  const response = await fetch(coingeckoUrl);
  const data = await response.json();

  const prices = ADDRESS[chain].VAULTS.map(vault => {
    return {
      vaultAddress: vault.VAULT,
      assetSymbol: vault.ASSETSYMBOL,
      price: data[vault.GECKO][denomination],
    };
  });
  return prices;
};


// export async function FetchTokenPrices(denomination: string): Promise<TokenPrice[]> {
//   let data;

//   try {
//     const ids = COINGECKO_TICKERS.map(ticker => ticker.id).join(",");
//     const coingeckoUrl =
//     `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${denomination}`;

//     const response = await fetch(coingeckoUrl);

//     if (!response.ok) {
//       throw new Error("Failed to fetch from CoinGecko");
//     }

//     data = await response.json();
//   } catch (error) {
//     console.error("Error fetching token prices from CoinGecko:", error);
//     console.log("Fetching token prices from CoinMarketCap...");

//     const coinmarketcapSymbols = COINGECKO_TICKERS.map(ticker => ticker.symbol.toUpperCase()).join(",");
//     const coinmarketcapUrl =
//       `https://api.coinmarketcap.com/data/pricemulti?fsyms=${coinmarketcapSymbols}&tsyms=${denomination}`;

//     const response = await fetch(coinmarketcapUrl);
//     if (!response.ok) {
//       console.log("Failed to fetch token prices from CoinMarketCap");
//       return [];
//     }

//     data = await response.json();
//   }

//   // Construct the tokenPrices array
//   const tokenPrices: TokenPrice[] = COINGECKO_TICKERS.map(ticker => {
//     return {
//       symbol: ticker.symbol,
//       price: data[ticker.id] ? data[ticker.id][denomination] : data[ticker.symbol.toUpperCase()][denomination]
//     };
//   });

//   return tokenPrices;
// }

module.exports = { FetchPriceForAsset, FetchPricesForChain };
