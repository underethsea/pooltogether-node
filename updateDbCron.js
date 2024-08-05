const { ethers } = require('ethers');
const { ABI } = require('./constants/abi');
const { PROVIDERS } = require('./constants/providers');
const { TOPICS } = require('./constants/events');
const { ADDRESS } = require('./constants/address');
const { AddClaim } = require('./functions/dbDonkey');
const { SendMessageToChannel, DiscordNotifyClaimPrize } = require('./functions/discordAlert');
const CHAINS = ["OPTIMISM", "ARBITRUM", "BASE"];
const CHAINIDS = {"OPTIMISM":10, "ARBITRUM":42161, "BASE":8453}

async function getMostRecentDrawAwardedEvent(chain, currentBlock) {
    const provider = PROVIDERS[chain];
    const contract = new ethers.Contract(ADDRESS[chain].PRIZEPOOL, ABI.PRIZEPOOL, provider);

    const events = await contract.queryFilter({
        address: ADDRESS[chain].PRIZEPOOL,
        topics: [TOPICS.DRAWAWARDED]
    }, -50000, 'latest'); // Adjust the block range as needed

    if (events.length > 0) {
        const mostRecentEvent = events[events.length - 1];
        console.log(`Most recent DrawAwarded event on ${chain} draw ${mostRecentEvent.args[0]}`);
    } else {
        console.log(`No DrawAwarded events found on ${chain}.`);
    }
}

async function checkClaimedPrizeEvents(chain, currentBlock) {
    const provider = PROVIDERS[chain];
    const contract = new ethers.Contract(ADDRESS[chain].PRIZEPOOL, ABI.PRIZEPOOL, provider);
    const eightHoursOfBlocks = 11500 // Assuming ~2 secs per block 

    const events = await contract.queryFilter({
        address: ADDRESS[chain].PRIZEPOOL,
        topics: [TOPICS.CLAIMEDPRIZE]
    }, currentBlock - eightHoursOfBlocks, 'latest');

    if (events.length > 0) {
        console.log(events.length, "claim events");

        // Parse and map the claim logs
        const claimLogs = events.map((claim) => {
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
                network: CHAINIDS[chain],
                chainName: chain,
            };
        });

        let claimError = 0;
        let claimAdded = 0;

        for (const claim of claimLogs) {
            const result = await AddClaim(CHAINIDS[chain], ADDRESS[chain].PRIZEPOOL, claim);
            if(result === "error") { 
                claimError++;
            }
            if(result === "added") {
                claimAdded++;
            }
            if (claim.payout.gt(0)) {
                await DiscordNotifyClaimPrize(claim, ADDRESS[chain].PRIZEPOOL, chain);
            }
        }
        if(claimError > 0) {      
            await SendMessageToChannel("1225048554708406282", "Claim cron encountered " + claimError + " errors on " + chain);
        }
        if(claimAdded > 0) {
            await SendMessageToChannel("1225048554708406282", "Claim cron added " + claimAdded + " claims on " + chain);
        }
    } else {
        console.log(`No ClaimedPrize events found on ${chain}.`);
    }
}

async function main() {
    for (const chain of CHAINS) {
        const provider = PROVIDERS[chain];
        const currentBlock = await provider.getBlockNumber();
        await checkClaimedPrizeEvents(chain, currentBlock);
    }
    scheduleNextRun();
}

function scheduleNextRun() {
    setTimeout(main, 8 * 60 * 60 * 1000); // Schedule next run in 8 hours
}

// Initial run
main().catch(console.error);
