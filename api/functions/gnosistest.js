const { ethers } = require("ethers");
const { ABI } = require("../../constants/abi");
const { PROVIDERS } = require("../../constants/providers");
const { ADDRESS } = require("../../constants/address");

const CHAIN = "GNOSIS";
const BATCH_SIZE = 100000; // Test with a larger block range
const START_BLOCK = 35938463; // Known starting block for Gnosis

async function fetchLogs(contract, fromBlock, toBlock) {
    try {
        console.log(`Fetching logs from block ${fromBlock} to ${toBlock}...`);
        const logs = await contract.queryFilter(
            contract.filters.PromotionCreated(),
            fromBlock,
            toBlock
        );
        console.log(`Fetched ${logs.length} logs from block ${fromBlock} to ${toBlock}`);
        return logs;
    } catch (error) {
        console.error(`Error fetching logs from block ${fromBlock} to ${toBlock}:`, error.message);
        return [];
    }
}

async function testGnosisLargeBatchFetch() {
    try {
        const provider = PROVIDERS[CHAIN];
        const contractAddress = ADDRESS[CHAIN]?.METAREWARDS;

        if (!contractAddress) {
            console.error(`METAREWARDS address not defined for ${CHAIN}`);
            return;
        }

        const contract = new ethers.Contract(contractAddress, ABI.METAREWARDS, provider);

        // Get the latest block number on Gnosis
        const latestBlock = await provider.getBlockNumber();
        console.log(`Latest block on Gnosis: ${latestBlock}`);

        let totalLogs = [];
        let fromBlock = START_BLOCK;

        while (fromBlock <= latestBlock) {
            const toBlock = Math.min(fromBlock + BATCH_SIZE - 1, latestBlock);
            console.log(`\nTrying to fetch from block ${fromBlock} to ${toBlock} (Batch Size: ${BATCH_SIZE})`);

            const logs = await fetchLogs(contract, fromBlock, toBlock);
            totalLogs = totalLogs.concat(logs);

            // Move to the next batch
            fromBlock = toBlock + 1;

            // Early exit if no logs are found in consecutive large batches
            if (logs.length === 0) {
                console.log(`No logs found in the range ${fromBlock} to ${toBlock}, stopping further attempts.`);
                break;
            }
        }

        console.log(`\n=== Total logs fetched with 100k block range: ${totalLogs.length} ===`);
    } catch (error) {
        console.error("Error during Gnosis log fetching:", error);
    }
}

testGnosisLargeBatchFetch();
