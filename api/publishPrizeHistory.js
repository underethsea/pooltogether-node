require('../env-setup');
const pgp = require("pg-promise")(/* initialization options */);
/*
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
const dbFinally = pgp(cnFinal);
*/

async function PublishPrizeHistory(chainId, prizePool, dbFinal) {
    try {
        let claims = {};
        const queryString = "SELECT * from draws WHERE network=$1 and prizepool=$2";
const queryResults = await dbFinal.any(queryString, [chainId,prizePool.toLowerCase()]);
const modifiedArray = queryResults.map(({ network,prizeindices, periodseconds, id, grandprizeperiod, tiers, ...rest }) => rest);

//console.log(modifiedArray)
return modifiedArray
}catch(e){console.log(e)}
}
//PublishPrizeHistory(10)
module.exports = { PublishPrizeHistory };
