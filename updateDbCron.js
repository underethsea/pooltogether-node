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
const fs = require("fs");
const path = require("path");

const { ethers } = require('ethers');
const { ABI } = require('./constants/abi');
const { PROVIDERS } = require('./constants/providers');
const { TOPICS } = require('./constants/events');
const { ADDRESS } = require('./constants/address');
const { AddClaim } = require('./functions/dbDonkey');
const { SendMessageToChannel, DiscordNotifyClaimPrize } = require('./functions/discordAlert');
const { DB } = require("./functions/dbConnection");
const { PrizeCalcToDb } = require("./functions/prizeCalcToDb");

const MAX_TIERS_CALCULATE = CHAINNAME === "WORLD" ? 6 :7;
console.log("calculating ",MAX_TIERS_CALCULATE,"tiers")
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
if(ADDRESS[CHAINNAME].MULTICALL){
PrizeCalcToDb(
  CHAINID,                         // chainId
  "latest",                   // block
  MAX_TIERS_CALCULATE,                          // maxTiersToCalculate
  true,                       // debug
  1000,                        // multicallBatchSize
  ADDRESS[CHAINNAME].MULTICALL // multicallAddress
);
}else{       
 await PrizeCalcToDb(CHAINID, "latest", MAX_TIERS_CALCULATE, true);}
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
    let eightHoursOfBlocks = 150000; // Assuming ~2 secs per block + buffer 
    if(CHAINNAME ==="WORLD"){eightHoursOfBlocks = parseInt(eightHoursOfBlocks/6)}
    if (CHAINNAME==="ARBITRUM"){eightHoursOfBlocks *= 10}
 if(CHAINNAME === "BASE"){eightHoursOfBlocks=24000}
const fromBlock = getLastBlock(CHAINNAME) || (currentBlock - eightHoursOfBlocks);
let events;
  try {
    events = await contract.queryFilter({
      address: ADDRESS[CHAINNAME].PRIZEPOOL,
      topics: [TOPICS.CLAIMEDPRIZE]
    }, fromBlock, currentBlock);
  } catch (error) {
    console.error(`Failed to fetch claim events for ${CHAINNAME}:`, error);
    return; // Don't write block number if fetch fails
  }
   


    if (events.length > 0) {
        
console.log(events.length, "claim events");
  setLastBlock(CHAINNAME, currentBlock);

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
  setLastBlock(CHAINNAME, currentBlock);
}

let lastClaimCheckTime = 0;

async function main() {
  const provider = PROVIDERS[CHAINNAME];
  const currentBlock = await provider.getBlockNumber();
  const now = Date.now();

  // Run prize calc — even if it throws, don't stop
  try {
    await checkDrawPrizeCalc(currentBlock);
  } catch (error) {
    console.error("Prize calculation failed:", error);
    await SendMessageToChannel("1225048554708406282", `❌ Prize calc failed on ${CHAINNAME}`);
  }

  // Always try to run claim check if enough time has passed
  if (now - lastClaimCheckTime >= 8 * 60 * 60 * 1000) {
    try {
      await checkClaimedPrizeEvents(currentBlock);
      lastClaimCheckTime = now;
    } catch (error) {
      console.error("Claim check failed:", error);
      await SendMessageToChannel("1225048554708406282", `❌ Claim check failed on ${CHAINNAME}`);
    }
  }

  scheduleNextRun();
}

const LAST_BLOCK_FILE = path.join(__dirname, "lastBlockDbCron.json");

function getLastBlock(chainName) {
  try {
    const data = fs.readFileSync(LAST_BLOCK_FILE, "utf-8");
    const json = JSON.parse(data);
    return json[chainName] || null;
  } catch (err) {
    return null;
  }
}

function setLastBlock(chainName, blockNumber) {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(LAST_BLOCK_FILE, "utf-8"));
  } catch (e) {
    // file may not exist yet
  }
  data[chainName] = blockNumber;
  fs.writeFileSync(LAST_BLOCK_FILE, JSON.stringify(data, null, 2));
}


function scheduleNextRun() {
    setTimeout(main, 4 * 60 * 60 * 1000); // Schedule next run in 4 hours
}

// Initial run
main().catch(console.error);

