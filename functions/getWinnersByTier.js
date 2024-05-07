const GetTwabPlayers = require("./playersSubgraph.js");
const { CONTRACTS } = require("../constants/contracts.js");
const { CONFIG } = require("../constants/config.js");
const { Multicall } = require("../utilities/multicall.js");

const GetWinnersByTier = async (
  chainName,
  tierToCalc,
  drawId,
  prizesForTier,
  playersForTier,
  block = "latest"
) => {
  let totalCalls = 0;
  const batchSize = CONFIG.BATCHSIZE;
  drawId = parseInt(drawId);
  let winsPerTier = new Array(tierToCalc + 1).fill(0);
  let winners = [];
  const calls = [];

  for (let x = 0; x < playersForTier.length; x++) {
    const playerAddress = playersForTier[x].address;
    const vault = playersForTier[x].vault;

    for (let prizeIndex = 0; prizeIndex < prizesForTier; prizeIndex++) {
      const call = CONTRACTS.PRIZEPOOL[chainName].isWinner(
        vault,
        playerAddress,
        tierToCalc,
        prizeIndex,
        { blockTag: block }
      );

      calls.push({
        vault,
        playerAddress,
        y: tierToCalc,
        indexWon: prizeIndex,
        call,
      });

      if (calls.length === batchSize) {
        const contractCalls = calls.map((callObj) => callObj.call);
        const batchResults = await Multicall(contractCalls);
        totalCalls++;

        for (let i = 0; i < calls.length; i++) {
          const { vault, playerAddress, y, indexWon } = calls[i];
          const didWin = batchResults[i];

          if (didWin) {
            winsPerTier[y]++;
            let winLog =
              "batch1 | vault | " +
              vault +
              " pooler | " +
              playerAddress +
              " won tier " +
              y +
              " index " +
              indexWon;
            console.log(winLog);
            winners.push([vault, playerAddress, y, indexWon]);
          }
        }

        calls.length = 0;
      }
    }
  }

  if (calls.length > 0) {
    const contractCalls = calls.map((callObj) => callObj.call);
    const remainingResults = await Multicall(contractCalls);
    totalCalls++;

    for (let i = 0; i < calls.length; i++) {
      const { vault, playerAddress, y, indexWon } = calls[i];
      const didWin = remainingResults[i];

      if (didWin) {
        winsPerTier[y]++;
        let winLog =
          "vault | " +
          vault +
          " pooler | " +
          playerAddress +
          " won tier " +
          y +
          " index " +
          indexWon;
        console.log(winLog);
        winners.push([vault, playerAddress, y, indexWon]);
      }
    }
  }

  console.log("total rpc calls", totalCalls);
  console.log("wins per tier summary", winsPerTier);
  return winners;
};

module.exports = { GetWinnersByTier };
