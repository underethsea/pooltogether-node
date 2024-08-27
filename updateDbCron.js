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
const { AddClaim } = require('./functions/dbDonkey');
const { SendMessageToChannel, DiscordNotifyClaimPrize } = require('./functions/discordAlert');
const { DB } = require("./functions/dbConnection");
const { PrizeCalcToDb } = require("./functions/prizeCalcToDb");
const MAX_TIERS_CALCULATE = 6;
const DRAW_AWARD_INTERVAL = 90 * 60 * 1000; // 90 minutes in milliseconds

async function checkDrawPrizeCalc(currentBlock) {
    const provider = PROVIDERS[CHAINNAME];
    const contract = new ethers.Contract(ADDRESS[CHAINNAME].PRIZEPOOL, ABI.PRIZEPOOL, provider);
    const lastAwardedDrawId = await contract.getLastAwardedDrawId();
    const lastAwardedDrawAwardedAt = await contract.lastAwardedDrawAwardedAt();
    const now = Date.now();
    const awardedTime = parseInt(lastAwardedDrawAwardedAt) * 1000; // Convert to milliseconds

    if (now - awardedTime < DRAW_AWARD_INTERVAL) {
        console.log(`Draw ${lastAwardedDrawId} on network ${CHAINID} for prize pool ${ADDRESS[CHAINNAME].PRIZEPOOL.toLowerCase()} was awarded less than 90 minutes ago.`);
        return;
    }

    const drawStatus = await checkDrawEntry(CHAINID, lastAwardedDrawId, ADDRESS[CHAINNAME].PRIZEPOOL.toLowerCase());

    if (drawStatus === "not exists" || drawStatus === "not finished") {
            await SendMessageToChannel("1225048554708406282", "Found missing prize data for "+CHAINNAME)
        await PrizeCalcToDb(CHAINID, "latest", MAX_TIERS_CALCULATE, true);
    }
}

async function checkDrawEntry(network, drawId, prizepool) {
    prizepool = prizepool.toLowerCase();
    try {
        const checkDrawQuery = `
            SELECT * FROM draws 
            WHERE network = $1 
              AND draw = $2 
              AND LOWER(prizepool) = LOWER($3)
        `;
        const drawEntry = await DB.oneOrNone(checkDrawQuery, [network, drawId, prizepool]);

        if (drawEntry) {
            const isFinished = drawEntry.calculated;
            if (isFinished) {
                console.log(`Draw ${drawId} on network ${network} for prize pool ${prizepool} is finished.`);
            } else {
                console.log(`Draw ${drawId} on network ${network} for prize pool ${prizepool} is not finished.`);
            }
            return isFinished ? "finished" : "not finished";
        } else {
            console.log(`Draw ${drawId} on network ${network} for prize pool ${prizepool} does not exist.`);
            return "not exists";
        }
    } catch (error) {
        console.error("Failed to check draw entry:", error);
        return "error";
    }
}

async function checkClaimedPrizeEvents(currentBlock) {
    const provider = PROVIDERS[CHAINNAME];
    const contract = new ethers.Contract(ADDRESS[CHAINNAME].PRIZEPOOL, ABI.PRIZEPOOL, provider);
    const eightHoursOfBlocks = 15500; // Assuming ~2 secs per block + buffer 

    const events = await contract.queryFilter({
        address: ADDRESS[CHAINNAME].PRIZEPOOL,
        topics: [TOPICS.CLAIMEDPRIZE]
    }, currentBlock - eightHoursOfBlocks, 'latest');

    if (events.length > 0) {
        console.log(events.length, "claim events");

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
                network: CHAINID,
                chainName: CHAINNAME,
            };
        });

        let claimError = 0;
        let claimAdded = 0;

        for (const claim of claimLogs) {
            const result = await AddClaim(CHAINID, ADDRESS[CHAINNAME].PRIZEPOOL, claim);
            if(result === "error") { 
                claimError++;
            }
            if(result === "added") {
                claimAdded++;
            }
            if (claim.payout.gt(0)) {
                await DiscordNotifyClaimPrize(claim, ADDRESS[CHAINNAME].PRIZEPOOL, CHAINNAME);
            }
        }
        if(claimError > 0) {      
            await SendMessageToChannel("1225048554708406282", "Claim cron encountered " + claimError + " errors on " + CHAINNAME);
        }
        if(claimAdded > 0) {
            await SendMessageToChannel("1225048554708406282", "Claim cron added " + claimAdded + " claims on " + CHAINNAME);
        }
    } else {
        console.log(`No ClaimedPrize events found on ${CHAINNAME}.`);
    }
}

let lastClaimCheckTime = 0;
async function main() {
    try {
        const provider = PROVIDERS[CHAINNAME];
        const currentBlock = await provider.getBlockNumber();
        
        // Check the awarding part every 2 hours
        await checkDrawPrizeCalc(currentBlock);

        // Get the current time
        const now = Date.now();

        // Check the claiming part every 8 hours
        if (now - lastClaimCheckTime >= 8 * 60 * 60 * 1000) { // 8 hours in milliseconds
            await checkClaimedPrizeEvents(currentBlock);
            lastClaimCheckTime = now; // Update the last run time
        }
    } catch (error) {
        console.error("An error occurred in main:", error);
    } finally {
        scheduleNextRun();
    }
}



function scheduleNextRun() {
    setTimeout(main, 2 * 60 * 60 * 1000); // Schedule next run in 2 hours
}

// Initial run
main().catch(console.error);

