const fetch = require("cross-fetch");
const { ADDRESS } = require("../constants/address");

const { getChainConfig } = require("../chains");

const CHAINNAME = getChainConfig().CHAINNAME;

const FetchApiPrizes = async (chain, draw, tiersToClaim) => {
  //  console.log("tiers to claim",tiersToClaim)
  try {
    const url =
      "https://poolexplorer.xyz/" +
      chain +
      "-" +
      ADDRESS[CHAINNAME].PRIZEPOOL +
      "-draw" +
      draw;
    //console.log(url)
    const fetchPrizes = await fetch(url);
    const prizesResult = await fetchPrizes.json();
    //console.log("prizes",prizesResult)

    // Filter wins for tiers to claim
    const filteredWins = prizesResult.wins.filter((win) => {
      const tierToClaim = win.t;
      if (tiersToClaim.length === 0) {
        // If tiersToClaim is empty, claim all tiers
        return true;
      } else {
        // Claim specific tiers based on tiersToClaim array
        return tiersToClaim.includes(tierToClaim);
      }
    });

    // Return vault, playeraddress, tier for claim
    const winsToClaim = filteredWins.map((win) => [win.v, win.p, win.t, win.i]);
    return winsToClaim;
  } catch (e) {
    console.log(e);
    return null;
  }
};

module.exports = { FetchApiPrizes };
//testing
//FetchApiPrizes(10,35,[])
