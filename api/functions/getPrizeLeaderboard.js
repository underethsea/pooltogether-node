const pgp = require("pg-promise")();
const { dbFinal } = require('./dbConnection.js'); // Ensure this path is correct for your project setup

async function PrizeLeaderboard(network, prizepool) {
    try {
        const query = `
            SELECT
                winner as p,
                COUNT(DISTINCT draw) AS draws,
                COUNT(DISTINCT draw || '-' || vault || '-' || CAST(tier AS TEXT)) AS prizes,
                SUM(payout::NUMERIC) AS won
            FROM
                claims
            WHERE
                network = $1 AND prizepool = $2 and payout::numeric > 0
            GROUP BY
                p
            ORDER BY
                won DESC
            LIMIT
                1000;
        `;

        const result = await dbFinal.any(query, [network, prizepool.toLowerCase()]);
        console.log("PrizeLeaderboard query executed successfully, returning ", result.length, "results.");
        return result;
    } catch (error) {
        console.error("Error executing PrizeLeaderboard query:", error);
        throw error; // Rethrow or handle error as needed
    }
}

module.exports = PrizeLeaderboard

//PrizeLeaderboard()
