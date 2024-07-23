// Import cross-fetch
const fetch = require('cross-fetch');

/**
 * Function to get the price quote from Odos API
 * @param {number} chainId - Chain ID (1 for Mainnet, 10 for Optimism, etc.)
 * @param {string} userAddress - User's Wallet Address
 * @param {string} srcToken - Source Token Address
 * @param {string} amount - Source Token amount in WEI/Raw units
 * @param {string} destToken - Destination Token Address
 * @param {number} slippage - Slippage limit percentage (1 = 1%)
 * @returns {Promise<Object>} - API response containing quote object
 */
async function OdosQuote(chainId, userAddress, srcToken, amount, destToken, slippage=0.3) {
    const quoteUrl = 'https://api.odos.xyz/sor/quote/v2';

    const quoteRequestBody = {
        chainId,
        inputTokens: [
            {
                tokenAddress: srcToken,
                amount: amount
            }
        ],
        outputTokens: [
            {
                tokenAddress: destToken,
                proportion: 1
            }
        ],
        userAddr: userAddress,
        slippageLimitPercent: slippage,
        referralCode: 0,
        disableRFQs: true,
        compact: true,
    };

    try {
        const response = await fetch(quoteUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(quoteRequestBody),
        });

        if (!response.ok) {
            throw new Error(`Error fetching data from Odos API: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

/**
 * Function to assemble the transaction object from Odos API
 * @param {string} userAddress - User's Wallet Address
 * @param {string} pathId - Path ID from the quote response
 * @param {boolean} simulate - Whether to simulate the transaction
 * @returns {Promise<Object>} - API response containing assembled transaction object
 */
async function OdosAssembleTransaction(userAddress, pathId, simulate=false) {
    const assembleUrl = 'https://api.odos.xyz/sor/assemble';

    const assembleRequestBody = {
        userAddr: userAddress,
        pathId,
        simulate,
    };
    try {
        const response = await fetch(assembleUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assembleRequestBody),
        });

        if (!response.ok) {
            throw new Error(`Error assembling transaction from Odos API: ${response.statusText} ${response}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports = {
    OdosQuote,
    OdosAssembleTransaction
};

//OdosAssembleTransaction(0xFB2084dA86B5a2ff931D45Fad2ECE50d5e836F76,"0455d5ce8998f0850445e1ec53be0c8a").then(odos=>console.log(odos))

// Example usage:

/*OdosQuote(10, "0xFB2084dA86B5a2ff931D45Fad2ECE50d5e836F76", 
"0x4200000000000000000000000000000000000042", 
"553164072186604", 
"0x4200000000000000000000000000000000000006")
    .then(quote => {
        console.log(quote);
        return OdosAssembleTransaction("0xFB2084dA86B5a2ff931D45Fad2ECE50d5e836F76"
, quote.pathId);
    })
    .then(transaction => {
        console.log(transaction);
    })
    .catch(error => {
        console.error(error);
    });
*/
