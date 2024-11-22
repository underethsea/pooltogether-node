// Load the chain configuration first
const { loadChainConfig, getChainConfig } = require("./chains");

// Get the chain from the command line argument
const chain = process.argv[2] || "";

try {
  // Load the configuration for the provided chain
  loadChainConfig(chain);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`);
  process.exit(1);
}

const CHAINNAME = getChainConfig().CHAINNAME;
const CHAINID = getChainConfig().CHAINID;

// Now import the required modules
const { ethers } = require('ethers');
const { ABI } = require('./constants/abi');
const { PROVIDERS } = require('./constants/providers');
const { TOPICS } = require('./constants/events');
const { ADDRESS } = require('./constants/address');

async function fetchClaimedPrizeEvents() {
    const provider = PROVIDERS[CHAINNAME];
    const contract = new ethers.Contract(ADDRESS[CHAINNAME].PRIZEPOOL, ABI.PRIZEPOOL, provider);
    const eightHoursOfBlocks = 45500; // Assuming ~2 secs per block + buffer

    try {
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = currentBlock - eightHoursOfBlocks;

        console.log(`Querying events from block ${fromBlock} to ${currentBlock} on ${CHAINNAME}.`);

        const events = await contract.queryFilter({
            address: ADDRESS[CHAINNAME].PRIZEPOOL,
            topics: [TOPICS.CLAIMEDPRIZE]
        }, fromBlock, 'latest');

        if (events.length > 0) {
            console.log(`${events.length} claim events found`);

            events.forEach((claim) => {
                const decodedLog = contract.interface.parseLog(claim);
                const transactionHash = claim.transactionHash.toLowerCase();
                const payoutAmount = ethers.utils.formatEther(decodedLog.args.payout);

                console.log(`Transaction Hash: ${transactionHash}`);
                console.log(`Payout Amount: ${payoutAmount} ETH`);
                console.log('------------------------------');
            });
        } else {
            console.log(`No ClaimedPrize events found on ${CHAINNAME}.`);
        }
    } catch (error) {
        console.error("Error fetching claim events:", error);
    }
}

fetchClaimedPrizeEvents().catch(console.error);
