const fetch = require("node-fetch");

const geckoPrice = async (tokenIDs) => {
    // Convert tokenIDs to an array if it's a single string
    if (!Array.isArray(tokenIDs)) {
        tokenIDs = [tokenIDs];
    }

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

        // Otherwise, return an object with prices for all token IDs
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
/*
test
async function go(){console.log(await geckoPrice("pooltogether"))}
go()*/

