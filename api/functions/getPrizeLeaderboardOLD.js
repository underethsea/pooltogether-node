const pgp = require("pg-promise")();
const { dbFinal } = require('./dbConnection.js'); // Ensure this path is correct for your project setup


async function PrizeLeaderboard( prizepools) {
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
                prizepool = ANY($1::TEXT[]) AND payout::numeric > 0
            GROUP BY
                p
            ORDER BY
                won DESC
            LIMIT
                1000;
        `;

        const result = await dbFinal.any(query, [ prizepools.map(p => p.toLowerCase())]);
        console.log("PrizeLeaderboard query executed successfully, returning ", result.length, "results.");
        return result;
    } catch (error) {
        console.error("Error executing PrizeLeaderboard query:", error);
        throw error; // Rethrow or handle error as needed
    }
}




module.exports = PrizeLeaderboard

PrizeLeaderboard(["0xF35fE10ffd0a9672d0095c435fd8767A7fe29B55".toLowerCase()])
