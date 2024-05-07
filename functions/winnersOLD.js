const GetTwabPlayers = require("./playersSubgraph.js")
const { CONTRACTS } = require("../constants/contracts.js");
const { CONFIG } = require("../constants/config.js");
const { Multicall } = require("../utilities/multicall.js")

const GetWinners = async (
    chainName,
    numberOfTiers,
    drawId,
    tierTimestamps,
    tiersToClaim,
    prizesForTier,
    block = "latest"
  ) => {

//    console.log("chain name",chainName)
    let totalCalls = 0 
   
    const batchSize = CONFIG.BATCHSIZE
    drawId = parseInt(drawId);
    let winsPerTier = new Array(numberOfTiers + 1).fill(0);
    let winners = [];
  
    // old covalent code
    // const players = await FetchPlayers(chainId, vault);
    // console.log("players ", players.length);
  
    const calls = [];

    // const results = [];
   let playersForTier = []
   
    for (let y = 0; y < numberOfTiers; y++) {
         console.log("tier ",y)
        if (tiersToClaim.length === 0 || tiersToClaim.includes(y)) {

        // check if previous tier has same timestamps and can avoid another fetch
        if (
            y > 0 && tiersToClaim.length > 1 && playersForTier.length > 0 &&
            tierTimestamps[y].startTimestamp.toString() === tierTimestamps[y-1].startTimestamp.toString() &&
            tierTimestamps[y].endTimestamp.toString() === tierTimestamps[y-1].endTimestamp.toString()
          ) {
                console.log("tier ",y," timestamps match tier ",y-1,", reusing ",playersForTier.length,"  poolers")
            }else{

      playersForTier = await GetTwabPlayers(tierTimestamps[y].startTimestamp.toString(),tierTimestamps[y].endTimestamp.toString())
      console.log("fetched ",playersForTier.length," poolers for tier ",y)
        console.log("player 0",playersForTier[0])
            }

            console.log("checking for winners in batches of ",batchSize)
      for (let x = 0; x < playersForTier.length; x++) {

        // check all indexes for each prize tier
        for(let prizeIndex = 0; prizeIndex < prizesForTier[y]; prizeIndex++) {
      const playerAddress = playersForTier[x].address;
      const vault = playersForTier[x].vault
        
        // if (tiersToClaim.length === 0 || tiersToClaim.includes(y)) {
          //console.log("chain name",chainName)
          const call = CONTRACTS.PRIZEPOOL[chainName].isWinner(
            vault,
            playerAddress,
            y,
            prizeIndex,
            {blockTag: block}
          );
/*	
	console.log("calling",vault,
            playerAddress,
            y,
            prizeIndex,"block",block)
  */      
  
          calls.push({
            vault,
            playerAddress,
            y,
            indexWon: prizeIndex,
            call,
          });
  
          if (calls.length === batchSize) {
            const contractCalls = calls.map((callObj) => callObj.call);
            const batchResults = await Multicall(contractCalls);
            totalCalls++; 
  
            for (let i = 0; i < calls.length; i++) {
              const { vault, playerAddress, y , indexWon} = calls[i];
              const didWin = batchResults[i];
  
              // doesnt seem needed to store all players, just winners
              // results.push({
              //   vault,
              //   playerAddress,
              //   y,
              //   prizeIndex,
              //   didWin,
              // });
  
              if (didWin) {
                winsPerTier[y]++;
                let winLog = "batch1 | vault | " + vault + " pooler | " + playerAddress + " won tier " + y + " index " + indexWon;
                console.log(winLog)
                winners.push([vault, playerAddress, y, indexWon]);
              }
            }
  
            calls.length = 0; // Reset the calls array for the next batch
          }
        }
      }
    }
}
  
    if (calls.length > 0) {
      const contractCalls = calls.map((callObj) => callObj.call);
      const remainingResults = await Multicall(contractCalls);
      totalCalls++
  
      for (let i = 0; i < calls.length; i++) {
   
        const { vault, playerAddress, y, indexWon} = calls[i];
        const didWin = remainingResults[i];
  
        // doesn't seem needed for all players, just winners
        // results.push({
        //   vault,
        //   playerAddress,
        //   y,
        //   prizeIndex,
        //   didWin,
        // });
  
        if (didWin) {
          winsPerTier[y]++;
          let winLog = "vault | " + vault + " pooler | " + playerAddress + " won tier " + y + " index " + indexWon;
          console.log(winLog)
          winners.push([vault, playerAddress, y, indexWon]);
        }
      }
    }
    console.log("total rpc calls ",totalCalls)

    console.log("wins per tier summary", winsPerTier);
    return winners;
  }

  module.exports = {GetWinners}
