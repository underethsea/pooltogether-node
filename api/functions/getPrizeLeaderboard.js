const pgp = require("pg-promise")();
const { dbFinal } = require('./dbConnection.js');
const fetch = require('node-fetch');
const {ADDRESS} = require("../../constants/address")
// Function to get token prices from the Pool Explorer API
async function fetchTokenPrices() {
    try {
        const response = await fetch('https://poolexplorer.xyz/overview');
        const overview = await response.json();
        const geckoPrices = overview?.prices?.geckos || {};
        return geckoPrices;
    } catch (error) {
        console.error('Error fetching token prices:', error);
        throw error;
    }
}

// Convert the payout to ETH if the prize token is not WETH
function convertPayoutToETH(payout, prizeTokenPrice, ethPrice) {
    const payoutBigInt = BigInt(payout);  // Convert payout string to BigInt
    const prizeInEth = (payoutBigInt * BigInt(Math.floor((prizeTokenPrice / ethPrice) * 1e18))) / BigInt(1e18);
    return prizeInEth.toString(); // Return as a string with 18 decimals precision
}

async function PrizeLeaderboard(prizepools) {
    try {
        // Fetch Gecko Prices for prize tokens and Ethereum
        const geckoPrices = await fetchTokenPrices();

        // Fetch all individual wins from the database
        const query = `
            SELECT
                winner as p,
                payout::NUMERIC AS won,
                vault,
                network
            FROM
                claims
            WHERE
                prizepool = ANY($1::TEXT[]) AND payout::numeric > 0;
        `;
        
        const result = await dbFinal.any(query, [prizepools.map(p => p.toLowerCase())]);
        console.log("PrizeLeaderboard query executed successfully, returning ", result.length, "results.");

        // Map winnings by player, adjusted for non-WETH tokens
        const playerWinnings = {};

        result.forEach(row => {
            const chainId = row.network; // Use the chain ID from the `network` column
            const chainName = Object.keys(ADDRESS).find(key => ADDRESS[key].CHAINID === chainId);
            const prizeTokenSymbol = ADDRESS[chainName]?.PRIZETOKEN?.SYMBOL || 'weth';
            let adjustedWon = row.won;

            if (prizeTokenSymbol.toLowerCase() !== 'weth') {
                const prizeTokenGeckoId = ADDRESS[chainName]?.PRIZETOKEN?.GECKO;
                const ethPrice = geckoPrices['ethereum'];
                const prizeTokenPrice = geckoPrices[prizeTokenGeckoId];

                if (prizeTokenPrice && ethPrice) {
                    // Convert the payout to ETH using the fetched prices
                    adjustedWon = convertPayoutToETH(row.won, prizeTokenPrice, ethPrice);
                }
            }

            // Sum the adjusted winnings by player
            if (!playerWinnings[row.p]) {
                playerWinnings[row.p] = {
                    draws: 0,
                    prizes: 0,
                    won: BigInt(0)
                };
            }

            playerWinnings[row.p].draws += 1;  // Increment draw count
            playerWinnings[row.p].prizes += 1;  // Increment prize count
            playerWinnings[row.p].won += BigInt(adjustedWon);  // Sum the winnings
        });

        // Convert the final result to the format expected (strings for BigInt values)
        let finalResult = Object.entries(playerWinnings).map(([player, data]) => ({
            p: player,
            draws: data.draws,
            prizes: data.prizes,
            won: data.won.toString()  // Convert BigInt back to string
        }));
// Sort the final result by the 'won' value (largest first)
finalResult.sort((a, b) => (BigInt(b.won) > BigInt(a.won) ? 1 : -1));

        return finalResult;

    } catch (error) {
        console.error("Error executing PrizeLeaderboard query:", error);
        throw error;
    }
}

// Example function call
/*PrizeLeaderboard(["0xF35fE10ffd0a9672d0095c435fd8767A7fe29B55".toLowerCase()])
    .then(result => console.log(result))
    .catch(error => console.error(error));
*/
module.exports = PrizeLeaderboard;
