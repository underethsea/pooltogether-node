const pgp = require("pg-promise")(/* initialization options */);
require('../../env-setup');
const cn = {
    host: "localhost",
    port: 5432,
    database: "v5",
    user: "pooltogether",
    password: process.env.PASSWORD,
};
const db = pgp(cn);

const cnFinal = {
    host: "localhost",
    port: 5432,
    database: "v5final",
    user: "pooltogether",
    password: process.env.PASSWORD,
};
//const dbFinal = pgp(cnFinal);


async function GetClaims(chainId, prizePool, dbFinal) {
    try {
        let claims = {};
        const queryString = "SELECT * from claims WHERE network=$1 and prizepool=LOWER($2)";

        // Decide which DB to use based on the prizePool value
        const currentDB = (prizePool === "") ? db : dbFinal;

        const queryResults = await currentDB.any(queryString, [chainId,prizePool]);
      
        queryResults.forEach((claim) => {
            if (!claims[claim.draw]) {
                claims[claim.draw] = { claimsList: [] }; // Initialize the `claimsList` property
            }
            const forApi = {
                v: claim.vault,
                w: claim.winner,
                t: claim.tier,
                p: claim.payout,
                m: claim.miner,
                f: claim.fee,
                i: claim.index
            };
            claims[claim.draw].claimsList.push(forApi);
        });
      
        for (const drawNumber in claims) {
            const drawQueryString = "SELECT network, tiervalues from draws where draw=$1";
            const drawQueryResults = await currentDB.any(drawQueryString, [drawNumber]);
            let tiers = {};
            drawQueryResults.forEach((network) => {
                tiers[network.network] = network.tiervalues;
            });
            claims[drawNumber].tiers = tiers;
        }
      
        return claims;
    } catch (error) {
        console.log("GetClaims error:", error);
    }  
}
  
module.exports = { GetClaims };
