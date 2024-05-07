const fs = require('fs');
const { PROVIDERS } =  require( "../constants/providers")
const { ADDRESS, STARTBLOCK }= require( "../constants/address")
const { CONFIG } = require( "../constants/config")
const { CONTRACTS } = require("../constants/contracts")
const { TOPICS } = require("../constants/events")
async function GetClaimEvents(chain) {
    const chainName = CONFIG.CHAINNAME;
    const contracts = CONTRACTS;

    // Function to fetch logs for a given block range
    const fetchLogs = async (fromBlock, toBlock) => {
        const claimFilter = {
            address: ADDRESS[chainName].PRIZEPOOL,
            topics: [
                TOPICS.CLAIMEDPRIZE
            ],
            fromBlock,
            toBlock,
        };

        const claimLogs = await PROVIDERS[chainName].getLogs(claimFilter);
return claimLogs.map(claim => {
            const decodedLog = contracts.PRIZEPOOL[chainName].interface.parseLog(claim);
            const args = decodedLog.args;
            return {
                drawId: args.drawId,
                vault: args.vault,
                winner: args.winner,
                tier: args.tier,
                payout: args.payout,
                fee: args.claimReward,
                feeRecipient: args.claimRewardRecipient,
                index: args.prizeIndex,
                txHash: claim.transactionHash,
		blockNumber: claim.blockNumber, // Accessing the block number
            };
        });
    };

    // Dynamic block range creation
    const startBlock = STARTBLOCK[CONFIG.CHAINNAME].PRIZEPOOL;
    const blockInterval = 50000;
    const currentBlock = await PROVIDERS[chainName].getBlockNumber();
    let blockRanges= []
    console.log("start block",startBlock,"current block",currentBlock);
    for (let fromBlock = startBlock; fromBlock < currentBlock; fromBlock += blockInterval) {
        let toBlock = Math.min(fromBlock + blockInterval - 1, currentBlock);
        blockRanges.push([fromBlock, toBlock]);
    }

    // Create promises for each block range
    const logPromises = blockRanges.map((range) => fetchLogs(...range));

    try {
        // Resolve all promises concurrently
        const allLogs = await Promise.all(logPromises);

        // Combine and flatten logs
        return allLogs.flat();
    } catch (error) {
        console.error("Error fetching logs:", error);
        return [];
    }
}

(async () => {
    try {
        const eventsData = await GetClaimEvents(CONFIG.CHAINID);

        fs.writeFileSync('claimEvents.json', JSON.stringify(eventsData, null, 2));
        console.log('Data written to claimEvents.json');
    } catch (error) {
        console.error('Error:', error);
    }
})();

