const { loadChainConfig, getChainConfig } = require('./chains');
const { ethers } = require('ethers');

const EXPECTED_PONG_BACK = 60000; // 1 minute
const KEEP_ALIVE_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
let MAX_TIERS_CALCULATE = 7
// Assuming the chain name/id is the first argument, default to 'OPTIMISM' if not provided
const chainKey = process.argv[2] || '';

try {
  // Load the configuration with the provided chainKey or default
  loadChainConfig(chainKey);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`);
  process.exit(1);
}

const CHAINNAME = getChainConfig().CHAINNAME;
const CHAINID = getChainConfig().CHAINID;

const { Alchemy, Network } = require('alchemy-sdk');
require('./env-setup');

const fs = require('fs');
const path = require('path');
const { ADDRESS } = require("./constants/address");
const { CONTRACTS } = require("./constants/contracts");
const { TOPICS } = require("./constants/events");
const { AddClaim } = require("./functions/dbDonkey.js");
const { DiscordNotifyClaimPrize, SendMessageToChannel } = require("./functions/discordAlert.js");
const { PrizeCalcToDb } = require("./functions/prizeCalcToDb.js");

const prizepool = ADDRESS[CHAINNAME].PRIZEPOOL;
const lockFilePath = path.join(__dirname, 'calc.lock');
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mapping CHAINNAME to Alchemy SDK Network
const alchemyNetworkMap = {
  BASE: Network.BASE_MAINNET,
  OPTIMISM: Network.OPT_MAINNET,
  SCROLL: Network.SCROLL_MAINNET,
  ARBITRUM: Network.ARB_MAINNET,
  ETHEREUM: Network.ETH_MAINNET,
  GNOSIS: Network.GNOSIS_MAINNET,
  SCROLL: Network.SCROLL_MAINNET,
  WORLD: Network.WORLDCHAIN_MAINNET
};

// Determine Alchemy Network based on CHAINNAME
const alchemyNetwork = alchemyNetworkMap[CHAINNAME];
if (!alchemyNetwork) {
  console.error(`No Alchemy network mapping found for chain: ${CHAINNAME}`);
  process.exit(1);
}

// Configure Alchemy
const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_KEY,
  network: alchemyNetwork
});

// Define filters for events
const FILTERS = {
  DRAWAWARDED: {
    address: ADDRESS[CHAINNAME].PRIZEPOOL,
    topics: [TOPICS.DRAWAWARDED]
  },
  CLAIMEDPRIZE: {
    address: ADDRESS[CHAINNAME].PRIZEPOOL,
    topics: [TOPICS.CLAIMEDPRIZE]
  },
};

// Event listeners using Alchemy SDK
async function listen() {
  console.log("Listening for award and claim events using Alchemy SDK");
  await SendMessageToChannel("1225048554708406282", "Listening test");

  // Listen for DRAWAWARDED events
  alchemy.ws.on(FILTERS.DRAWAWARDED, async (drawCompletedEvent) => {
    console.log("Draw awarded event", drawCompletedEvent);

    try {
      await SendMessageToChannel("1225048554708406282", `Draw awarded on ${CHAINNAME}`);
    } catch (e) {
      console.log("Error sending msg to Discord for draw event:", e);
    }

    // Trigger PrizeCalcToDb function (delayed)
    setTimeout(async () => {
      await startCalculation(CHAINID, drawCompletedEvent);
    }, 60000);
  });

  // Listen for CLAIMEDPRIZE events
  alchemy.ws.on(FILTERS.CLAIMEDPRIZE, async (claimEvent) => {
    try {
  //    console.log("Claimed prize event", claimEvent);

      const decodedLog = CONTRACTS.PRIZEPOOL[CHAINNAME].interface.parseLog(claimEvent);
      const args = decodedLog.args;
      const claim = {
        network: CHAINID,
        drawId: args.drawId,
        vault: args.vault.toLowerCase(),
        winner: args.winner.toLowerCase(),
        tier: args.tier,
        index: args.prizeIndex,
        payout: args.payout,
        fee: args.claimReward,
        miner: args.claimRewardRecipient.toLowerCase(),
        hash: claimEvent.transactionHash.toLowerCase(),
        block: claimEvent.blockNumber,
        chainName: CHAINNAME
      };

      // Add the claim to the database
      await AddClaim(CHAINID, prizepool, claim);

      // Notify Discord if there was a payout
      if (claim.payout.gt(0)) {
        await DiscordNotifyClaimPrize(claim, prizepool);
      }
    } catch (error) {
      console.log("Error handling claimed prize event:", error);
    }
  });
}

// Function for performing calculations after a draw is awarded
async function startCalculation(chainId, drawCompletedEvent) {
  const maxRetries = 120;
  const retryDelay = 60000;
  const lockTimeout = 30 * 60 * 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {

if (fs.existsSync(lockFilePath)) {
  const lockTime = fs.readFileSync(lockFilePath, 'utf8');
  const lockDate = new Date(parseInt(lockTime, 10));
  const currentDate = new Date();

  const skipLockCheck = [480,10].includes(chainId); // Add other chainIds here if needed

  if (!skipLockCheck && currentDate - lockDate <= lockTimeout) {
    console.log(`Calculation in progress. Attempt ${attempt} failed. Retrying in 1 minute...`);
    await delay(retryDelay);
    continue;
  }

  if (!skipLockCheck) {
    console.log('Lock file is older than 30 minutes. Proceeding with calculation.');
  } else {
    console.log('Bypassing lock file timeout check for chain', chainId);
  }
}


    fs.writeFileSync(lockFilePath, Date.now().toString());
    let multicallAddress = null;
    if (chainId === 534352 || chainId === 100 || chainId === 480) {
      multicallAddress = "0xcA11bde05977b3631167028862bE2a173976CA11";
    }
if(CHAINID === 480){MAX_TIERS_CALCULATE=6}
    try {
      // Run prize calculations and update the DB
      await PrizeCalcToDb(
        chainId,
        drawCompletedEvent.blockNumber,
        MAX_TIERS_CALCULATE,
        true,
        undefined,
        multicallAddress
      );

      console.log("DB updated.");
      fs.unlinkSync(lockFilePath);
      return;
    } catch (error) {
      console.error('Error during calculation:', error);
      fs.unlinkSync(lockFilePath);
      return;
    }
  }

  console.log('Max retries reached. Calculation did not start.');
}

listen();
