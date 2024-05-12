const pgp = require("pg-promise")(/* initialization options */);
const  { db, dbFinal } = require('./dbConnection.js')

async function GetWinners(chainId,prizePool) {
try{
        const currentDB = (prizePool === "") ? db : dbFinal;

    let winners = {};
    const queryString = "SELECT * from wins WHERE network='" + chainId + "' and prizepool=LOWER('"+prizePool+"');";
    console.log(queryString)
    const query = await currentDB.any(queryString);
  
    query.forEach((win) => {
      if (!winners[win.draw]) {
        winners[win.draw] = { wins: [] }; // Initialize the `wins` property
      }
      const forApi = {
        v: win.vault,
        p: win.pooler,
        t: win.tier,
        // n: win.network,
        i: win.prizeindices,
        //c: win.claimedindices || []
      };
      winners[win.draw].wins.push(forApi);
    });
  
    console.log("getWinners: Found winners in", Object.keys(winners).length, "draw(s).");
    for (const drawNumber in winners) {
//console.log(drawNumber)
      const drawQueryString =
        "SELECT network, tiervalues from draws where draw='" + drawNumber + "';";
      const drawQuery = await currentDB.any(drawQueryString);
      let tiers = {};
      drawQuery.forEach((network) => {
        tiers[network.network] = network.tiervalues;
      });
      winners[drawNumber].tiers = tiers;
    }
  
//   console.log("winners length", Object.keys(winners).length);
    return winners;
}catch(error){console.log("getwinnersv5 error",error)}  
}
  
module.exports = { GetWinners };
//GetWinners(10);


