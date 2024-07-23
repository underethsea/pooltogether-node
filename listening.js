const { loadChainConfig, getChainConfig } = require('./chains');
const { ethers } = require('ethers');

const EXPECTED_PONG_BACK = 60000; // 1 minute
const KEEP_ALIVE_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

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

const { ADDRESS } = require("./constants/address");
const { WS_PROVIDERS, PROVIDERS } = require("./constants/providers");
const { CONTRACTS } = require("./constants/contracts");
const { TOPICS } = require("./constants/events");
const { AddClaim } = require("./functions/dbDonkey.js");
const { DiscordNotifyClaimPrize, SendMessageToChannel } = require("./functions/discordAlert.js");
const { FoundryPrizeWinsToDb } = require("./functions/foundryPrizeWinsToDb.js");

const chain = CHAINNAME;
const chainId = CHAINID;
const prizepool = ADDRESS[CHAINNAME].PRIZEPOOL;

const fs = require('fs');
const path = require('path');
const lockFilePath = path.join(__dirname, 'calc.lock');

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let LISTENPROVIDER;

if (WS_PROVIDERS[chain]) {
  LISTENPROVIDER = WS_PROVIDERS[chain];
  console.log("Using WebSocket provider");
} else {
  LISTENPROVIDER = PROVIDERS[chain];
  console.log("Using HTTP provider");
}

const FILTERS = {
  DRAWAWARDED: {
    address: ADDRESS[chain].PRIZEPOOL,
    topics: [TOPICS.DRAWAWARDED]
  },
  CLAIMEDPRIZE: {
    address: ADDRESS[chain].PRIZEPOOL,
    topics: [TOPICS.CLAIMEDPRIZE]
  },
};

let pingTimeout = null;
let keepAliveInterval = null;

function startConnection() {
  if (LISTENPROVIDER instanceof ethers.providers.WebSocketProvider) {
console.log("opening web socket")
    LISTENPROVIDER._websocket.on('open', () => {
      console.log('WebSocket connection established');

      keepAliveInterval = setInterval(() => {
        console.log('Checking if the connection is alive, sending a ping');
        LISTENPROVIDER._websocket.ping();

        pingTimeout = setTimeout(() => {
          LISTENPROVIDER._websocket.terminate();
        }, EXPECTED_PONG_BACK);
      }, KEEP_ALIVE_CHECK_INTERVAL);

      listen();
    });

    LISTENPROVIDER._websocket.on('close', () => {
      console.error('The WebSocket connection was closed');
      clearInterval(keepAliveInterval);
      clearTimeout(pingTimeout);
      startConnection();
    });

    LISTENPROVIDER._websocket.on('pong', () => {
      console.log('Received pong, so connection is alive, clearing the timeout');
      clearTimeout(pingTimeout);
    });
  } else {
    listen();
  }
}

async function listen() {
  console.log("Listening for complete award and claim events");

  LISTENPROVIDER.on(FILTERS.DRAWAWARDED, async (drawCompletedEvent) => {
    console.log("Draw completed event", drawCompletedEvent);

    try {
      await SendMessageToChannel("1225048554708406282", "Draw awarded on " + chain);
    } catch (e) {
      console.log("Error sending msg to Discord of draw event:", e);
    }

    setTimeout(async () => {
      await startCalculation(chainId, drawCompletedEvent);
    }, 60000);
  });

  LISTENPROVIDER.on(FILTERS.CLAIMEDPRIZE, (claimEvent) => {
    try {
      const decodedLog = CONTRACTS.PRIZEPOOL[chain].interface.parseLog(claimEvent);
      const args = decodedLog.args;
      const claim = {
        network: chainId,
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
        chainName: chain
      };
      AddClaim(chainId, prizepool, claim).then((finished) => {});

      if (claim.payout.gt(0)) {
        DiscordNotifyClaimPrize(claim, prizepool).then((finished) => {});
      }
    } catch (error) {
      console.log(error);
    }
  });
}

async function startCalculation(chainId, drawCompletedEvent) {
  const maxRetries = 60;
  const retryDelay = 60000;
  const lockTimeout = 30 * 60 * 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (fs.existsSync(lockFilePath)) {
      const lockTime = fs.readFileSync(lockFilePath, 'utf8');
      const lockDate = new Date(parseInt(lockTime, 10));
      const currentDate = new Date();

      if (currentDate - lockDate > lockTimeout) {
        console.log('Lock file is older than 30 minutes. Proceeding with calculation.');
      } else {
        console.log(`Calculation in progress. Attempt ${attempt} failed. Retrying in 1 minute...`);
        await delay(retryDelay);
        continue;
      }
    }

    fs.writeFileSync(lockFilePath, Date.now().toString());

    try {
      console.log('Starting FoundryPrizeWinsToDb calculation...');
      await FoundryPrizeWinsToDb(chainId, drawCompletedEvent.blockNumber);
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

startConnection();
