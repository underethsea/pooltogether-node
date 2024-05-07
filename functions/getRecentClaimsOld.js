
const {ADDRESS} = require("../constants/address")
const {PROVIDERS} = require("../constants/providers")
const {CONFIG} = require("../constants/config")
const {CONTRACTS} = require("../constants/contracts")
const {TOPICS} = require("../constants/events")
const {GetChainName} = require("../constants/address")

const GetRecentClaims = async (chain=CONFIG.CHAINID,startBlock=-50000,toBlock="latest") => {
// console.log("claims for chain",chain," name ",GetChainName(chain))

    const claimFilter = {
      address: ADDRESS[GetChainName(chain)].PRIZEPOOL,
      topics: [
        TOPICS.CLAIMEDPRIZE,
      ],
      fromBlock: startBlock,
      toBlock: toBlock,
    };
  
    const claimLogs = await PROVIDERS[GetChainName(chain)].getLogs(
      claimFilter,
      startBlock,
      toBlock
    );

//console.log("claim logs",claimLogs)  
    const decodedClaimLogs = claimLogs.map((claim, index) => {
      const decodedLog =
        CONTRACTS.PRIZEPOOL[GetChainName(chain)].interface.parseLog(claim);
//console.log("decoded claim",decodedLog)      
return {
        drawId: decodedLog.args.drawId,
        vault: decodedLog.args.vault.toLowerCase(),
        winner: decodedLog.args.winner.toLowerCase(),
        tier: decodedLog.args.tier,
        index: decodedLog.args.prizeIndex,
        hash: claim.transactionHash.toLowerCase(),
        block: claim.blockNumber,
	payout: decodedLog.args.payout,
        fee: decodedLog.args.fee,
        miner: decodedLog.args.claimRewardRecipient.toLowerCase(),

      };
    });
  
    return decodedClaimLogs;
  }
  module.exports = {GetRecentClaims}

