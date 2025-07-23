const { loadChainConfig, getChainConfig } = require("../chains");

const chainKey = process.argv[2] || "";

try {
  loadChainConfig(chainKey);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`);
  process.exit(1);
}

const CHAINNAME = getChainConfig().CHAINNAME;

const { GetRecentClaims } = require("../functions/getRecentClaims.js");
const { AddClaim } = require("../functions/dbDonkey.js");
const { DiscordNotifyClaimPrize } = require("../functions/discordAlert.js");
const { ADDRESS } = require("../constants/address.js");
const { ethers } = require("ethers");
const { PROVIDERS } = require("../constants/providers.js")
const chain = CHAINNAME
const chainId = ADDRESS[chain].CHAINID;
const prizepool = ADDRESS[chain].PRIZEPOOL;

const provider = PROVIDERS[CHAINNAME]

const ONEDRAW_BLOCKS = 40000
const STARTING_DRAW = 345
const ENDING_DRAW = 357

async function insertClaims(chainId, prizePool, fromBlock, toBlock) {
  console.log(`Checking blocks ${fromBlock} to ${toBlock}...`);
  const claims = await GetRecentClaims(chainId, fromBlock, toBlock);
  console.log(`Got ${claims.length} claims`);
if(claims.length> 0){console.log("index 0 draw id",claims[0].drawId ? claims[0].drawId: claims[0])}
  const filteredClaims = claims.filter(
    (claim) => claim.drawId >= STARTING_DRAW && claim.drawId <= ENDING_DRAW
  );

  console.log(`Filtered ${filteredClaims.length}`);

  for (let x = 0; x < filteredClaims.length; x++) {
    filteredClaims[x].network = chainId;
    filteredClaims[x].chainName = CHAINNAME;

    await AddClaim(chainId, prizePool, filteredClaims[x]);

    if (filteredClaims[x].payout.gt(0)) {
      await DiscordNotifyClaimPrize(filteredClaims[x], prizePool);
    }
  }
}

async function run() {
  const latestBlock = await provider.getBlockNumber();
  const chunkSize = Math.round(ONEDRAW_BLOCKS * 0.8); // about 24,000 blocks
  const STARTING_BLOCK = latestBlock - (ENDING_DRAW - STARTING_DRAW) * ONEDRAW_BLOCKS;

  let fromBlock = latestBlock;
  let toBlock = fromBlock - chunkSize + 1;

  while (toBlock > STARTING_BLOCK) {
    await insertClaims(chainId, prizepool, toBlock, fromBlock);

    fromBlock = toBlock - 1;
    toBlock = fromBlock - chunkSize + 1;
  }

  console.log("Done processing all block ranges");
}



run();
