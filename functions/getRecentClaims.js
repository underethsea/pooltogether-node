const { ADDRESS } = require("../constants/address");
const { PROVIDERS } = require("../constants/providers");
const { CONFIG } = require("../constants/config");
const { CONTRACTS } = require("../constants/contracts");
const { TOPICS } = require("../constants/events");
const { GetChainName } = require("../constants/address");

const GetRecentClaims = async (chain = CONFIG.CHAINID, startBlock = -50000, toBlock = "latest", batchSize = 9000) => {
  // console.log("claims for chain", chain, " name ", GetChainName(chain))
  const chainName = GetChainName(chain);

  const provider = PROVIDERS[chainName];
  const contract = CONTRACTS.PRIZEPOOL[chainName];

  // Determine the actual start block if it's relative to the latest

let latestBlock;

// Check if we need to fetch the latest block number for either startBlock or toBlock calculations
if (startBlock < 0 || toBlock === "latest") {
    latestBlock = await provider.getBlockNumber();
}

if (startBlock < 0) {
    // Adjust startBlock based on the latest block number, ensuring it's not negative
    startBlock = Math.max(latestBlock + startBlock, 0);
}

// Use the latest block number if toBlock is "latest", or use the value of toBlock if it's a specific number
   const toBlockNumber = toBlock === "latest" ? latestBlock : toBlock;

  // Split the block range into batches if batchSize is specified and greater than 0
  const ranges = batchSize > 0 ? createBatchRanges(startBlock, toBlockNumber, batchSize) : [[startBlock, toBlockNumber]];

  // Fetch logs in parallel for each batch
  const batchPromises = ranges.map(async ([fromBlock, toBlock]) => {
    const claimFilter = {
      address: ADDRESS[chainName].PRIZEPOOL,
      topics: [TOPICS.CLAIMEDPRIZE],
      fromBlock,
      toBlock,
    };

    const claimLogs = await provider.getLogs(claimFilter);
    return claimLogs.map(claim => {
      const decodedLog = contract.interface.parseLog(claim);
      return {
        drawId: decodedLog.args.drawId,
        vault: decodedLog.args.vault.toLowerCase(),
        winner: decodedLog.args.winner.toLowerCase(),
        tier: decodedLog.args.tier,
        index: decodedLog.args.prizeIndex,
        hash: claim.transactionHash.toLowerCase(),
        block: claim.blockNumber,
        payout: decodedLog.args.payout,
        fee: decodedLog.args.claimReward,
        miner: decodedLog.args.claimRewardRecipient.toLowerCase(),
      };
    });
  });

  const claimLogsBatches = await Promise.all(batchPromises);
  // Flatten the array of batches into a single array
  const decodedClaimLogs = claimLogsBatches.flat();

  return decodedClaimLogs;
};

const createBatchRanges = (start, end, size) => {
  let ranges = [];
  for (let i = start; i < end; i += size) {
    ranges.push([i, Math.min(i + size - 1, end)]);
  }
  return ranges;
};

module.exports = { GetRecentClaims };
