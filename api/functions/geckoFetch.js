const fetch = require("node-fetch");

const fetchLocalPrices = async () => {
    try {
        const result = await fetch("https://poolexplorer.xyz/prices");
        const data = await result.json();

        const currentTime = new Date().getTime();
        const timestamp = new Date(data.timestamp).getTime();
        const timeDifference = (currentTime - timestamp) / 1000;

        if (timeDifference > 20) {
            console.log("Local price data is too stale, using CoinGecko");
            return null;
        }

        return data.geckos;
    } catch (error) {
        console.log("Failed to fetch local prices or data is stale:", error);
        return null;
    }
};

const geckoPrice = async (tokenIDs) => {
    // Convert tokenIDs to an array if it's a single string
    if (!Array.isArray(tokenIDs)) {
        tokenIDs = [tokenIDs];
    }

    // Try fetching from local API first
    let localPrices = await fetchLocalPrices();

    // Check if we have all the required prices from local API
    if (localPrices && tokenIDs.every(id => localPrices[id] !== undefined)) {
        let priceData = {};
        tokenIDs.forEach(tokenID => {
            priceData[tokenID] = parseFloat(localPrices[tokenID]);
            console.log(tokenID, " price ", priceData[tokenID]);
        });

        // If the original input was a single string, return a single value
        if (tokenIDs.length === 1) {
            return priceData[tokenIDs[0]];
        }

        return priceData;
    }

    // If local data is not sufficient, fall back to CoinGecko
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenIDs.join(',')}&vs_currencies=usd`;
    console.log(url);

    try {
        let result = await fetch(url);
        let prices = await result.json();

        let priceData = {};
        tokenIDs.forEach(tokenID => {
            if (prices[tokenID] && prices[tokenID].usd) {
                priceData[tokenID] = parseFloat(prices[tokenID].usd);
            } else {
                priceData[tokenID] = null;
            }
            console.log(tokenID, " price ", priceData[tokenID]);
        });

        // If the original input was a single string, return a single value
        if (tokenIDs.length === 1) {
            return priceData[tokenIDs[0]];
        }

        return priceData;
    } catch (error) {
        console.log(error);
        return tokenIDs.reduce((acc, tokenID) => {
            acc[tokenID] = null; // Assign null for tokens where the price fetch failed
            return acc;
        }, {});
    }
};

module.exports.GeckoPrice = geckoPrice;

// test
async function go(){console.log(await geckoPrice("pooltogether"))}
go();
