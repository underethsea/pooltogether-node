const { loadChainConfig, getChainConfig } = require('./chains');

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

// const { CONTRACTS, ADDRESS, PROVIDERS } = require("./constants/index.js")
const { ADDRESS } = require("./constants/address")
const { WS_PROVIDERS, PROVIDERS } = require("./constants/providers")
const { CONTRACTS } = require("./constants/contracts")
const { TOPICS } = require("./constants/events")
//const { PrizeWinsToDb } = require("./functions/prizeWinsToDb.js")
//const LiquidateNow  = require("./liquidator.js")
const { AddClaim } = require("./functions/dbDonkey.js")
const { DiscordNotifyClaimPrize } = require("./functions/discordAlert.js")
//const { DailyReport } = require("./functions/dailyReport")
const chain = CHAINNAME
const chainId = CHAINID
const prizepool = ADDRESS[CHAINNAME].PRIZEPOOL
const {FoundryPrizeWinsToDb} = require("./functions/foundryPrizeWinsToDb.js")

const LISTENPROVIDER = PROVIDERS[chain]

const FILTERS = {
// draw awarded
  DRAWAWARDED: {
    address: ADDRESS[chain].PRIZEPOOL,
    topics: [TOPICS.DRAWAWARDED]
  },
/*
  DRAWCLOSED: {
    address: ADDRESS[chain].PRIZEPOOL,
    topics: ["0x330a72bcfcfc5c9a30ef8bdce22a7499068847d7e5ad7330f3a81fdd1e6e996d"]
},
// old for sepolia
/*  CLAIMEDPRIZE: {
    address: ADDRESS[chain].PRIZEPOOL,
    topics: ["0xc31bc4fb7f1c35cfd7aa34780f09c3f0a97653a70920593b2284de94a4772957"]
  },*/
 CLAIMEDPRIZE: {
    address: ADDRESS[chain].PRIZEPOOL,
    topics: [TOPICS.CLAIMEDPRIZE]
  },
}

async function listen() {
    console.log("listening for complete award and claim events")
     LISTENPROVIDER.on(FILTERS.DRAWAWARDED, (drawCompletedEvent) => {
             console.log("draw completed event", drawCompletedEvent)
		//try{DailyReport()}catch(e){console.log(e)}
setTimeout(() => {
  try {
    FoundryPrizeWinsToDb(chainId, drawCompletedEvent.blockNumber)
      .then((finished) => {
        console.log("db updated");
      });
  } catch (error) {
    console.log(error);
  }
}, 90000);

//try{LiquidateNow()}catch(e){console.log(e)}     
          })
//console.log(WS_PROVIDERS[chain])
    LISTENPROVIDER.on(FILTERS.CLAIMEDPRIZE, (claimEvent) => {
      try {
          // console.log("prize claimed event ", claimEvent)
          const decodedLog =
        CONTRACTS.PRIZEPOOL[chain].interface.parseLog(claimEvent);
//console.log("claim event",decodedLog)        
const args = decodedLog.args
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
          block: claimEvent.blockNumber
        };
        AddClaim(chainId,prizepool,claim).then((finished)=>{})
        
       if(claim.payout.gt(0)){DiscordNotifyClaimPrize(claim,prizepool).then((finished)=>{})}

      }catch(error){console.log(error)}
  })
}

listen()

