// Import cross-fetch
const fetch = require('cross-fetch');

/**
 * Function to get the price route and transaction object from ParaSwap API
 * @param {number} network - Network ID (1 for Mainnet, 10 for Optimism, etc.)
 * @param {string} userAddress - User's Wallet Address
 * @param {string} srcToken - Source Token Address or Symbol
 * @param {number} srcDecimals - Source Token Decimals
 * @param {string} amount - Source Token amount in WEI/Raw units
 * @param {string} destToken - Destination Token Address or Symbol
 * @param {number} destDecimals - Destination Token Decimals
 * @returns {Promise<Object>} - API response containing priceRoute and transaction object
 */
async function ParaswapQuote(network, userAddress, srcToken, srcDecimals, amount, destToken, destDecimals, slippage=100) {
    const apiUrl = 'https://api.paraswap.io/swap';
    const queryParams = new URLSearchParams({
        version: "6.2",
        network: network.toString(),
        userAddress,
        srcToken,
        srcDecimals: srcDecimals.toString(),
        amount,
        destToken,
        destDecimals: destDecimals.toString(),
slippage,
side:"SELL"
    });

    const url = `${apiUrl}?${queryParams.toString()}`;
//console.log(url)
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error fetching data from ParaSwap API: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = ParaswapQuote;
//ParaswapQuote(10,"0xE5860FF1c57DDCEF024Cb43B37b8A20bfE4c9822", "0x4200000000000000000000000000000000000042", 18 ,"553164072186604","0x4200000000000000000000000000000000000006",18).then(go=>{console.log(go)})

