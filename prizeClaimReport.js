const { ethers } = require('ethers');
require('dotenv').config();
const { SendMessageToChannel } = require('./functions/discordAlert.js');

// Set the time (UTC) when the script should run
const RUN_TIME_UTC = { hour: 22, minute: 0, second: 0 };

// Alchemy Endpoints for each network
const ALCHEMY_URLS = {
  BASE: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  OPTIMISM: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  ARBITRUM: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  SCROLL: `https://scroll-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  GNOSIS: `https://gnosis-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
};

// Prize pool contract addresses for each network
const PRIZE_POOL_ADDRESSES = {
  BASE: '0x45b2010d8a4f08b53c9fa7544c51dfd9733732cb',
  OPTIMISM: '0xF35fE10ffd0a9672d0095c435fd8767A7fe29B55',
  ARBITRUM: '0x52e7910c4c287848c8828e8b17b8371f4ebc5d42',
  SCROLL: '0xa6ecd65c3eecdb59c2f74956ddf251ab5d899845',
  GNOSIS: '0x0c08c2999e1a14569554eddbcda9da5e1918120f',
};

// Event topic for `ClaimedPrize`
const EVENT_TOPIC = '0x81d4e3306aa30f56dc9c3949abd8c27539b445f9ef380425f39f3f7114888e4f';

// Currency for payouts by chain
const PAYOUT_CURRENCY = {
  BASE: 'WETH',
  OPTIMISM: 'WETH',
  ARBITRUM: 'WETH',
  SCROLL: 'WETH',
  GNOSIS: 'XDAI',
};

// Discord channel ID for notifications
const DISCORD_CHANNEL_ID = "1314349608096366633";

// Create providers for each network
const providers = Object.keys(ALCHEMY_URLS).reduce((acc, chain) => {
  acc[chain] = new ethers.providers.JsonRpcProvider(ALCHEMY_URLS[chain]);
  return acc;
}, {});

// Format numbers to a maximum of 8 decimals
function formatNumber(value, decimals = 18) {
  return parseFloat(ethers.utils.formatUnits(value, decimals)).toFixed(8);
}

// Fetch prize claims in chunks of 50,000 blocks
async function fetchPrizeClaims(chainName) {
  const provider = providers[chainName];
  const prizePoolAddress = PRIZE_POOL_ADDRESSES[chainName];
  const chunkSize = 50000;

  let toBlock = await provider.getBlockNumber();
  let fromBlock = Math.max(toBlock - chunkSize, 0);

  let highestDrawId = null;
  let allEvents = [];
  let hasLowerDrawId = false;

  while (!hasLowerDrawId) {
    const filter = {
      address: prizePoolAddress,
      topics: [EVENT_TOPIC],
      fromBlock,
      toBlock,
    };

    const logs = await provider.getLogs(filter);

    if (logs.length === 0 && fromBlock > 0) {
      toBlock = fromBlock - 1;
      fromBlock = Math.max(toBlock - chunkSize, 0);
      continue;
    }

    const iface = new ethers.utils.Interface([
      "event ClaimedPrize(address indexed vault, address indexed winner, address indexed recipient, uint24 drawId, uint8 tier, uint32 prizeIndex, uint152 payout, uint96 claimReward, address claimRewardRecipient)",
    ]);

    const events = logs.map(log => {
      const parsed = iface.parseLog(log);
      return {
        drawId: Number(parsed.args.drawId),
        payout: parsed.args.payout.toBigInt(),
        claimReward: parsed.args.claimReward.toBigInt(),
        claimRewardRecipient: parsed.args.claimRewardRecipient,
        tier: Number(parsed.args.tier),
        chain: chainName,
      };
    });

    if (events.length > 0) {
      allEvents.push(...events);

      const currentHighestDrawId = Math.max(...events.map(e => e.drawId));
      if (highestDrawId === null) {
        highestDrawId = currentHighestDrawId;
      }

      hasLowerDrawId = events.some(e => e.drawId < highestDrawId);
    }

    toBlock = fromBlock - 1;
    fromBlock = Math.max(toBlock - chunkSize, 0);

    if (fromBlock === 0) break;
  }

  return allEvents.filter(e => e.drawId === highestDrawId);
}

// Main function
async function main() {
  const allChainEvents = [];

  for (const chainName of Object.keys(providers)) {
    try {
      const chainEvents = await fetchPrizeClaims(chainName);
      if (chainEvents.length > 0) {
        allChainEvents.push(...chainEvents);
      }
    } catch (error) {
      console.error(`Error processing chain ${chainName}:`, error.message);
    }
  }

  if (allChainEvents.length === 0) {
    await SendMessageToChannel(DISCORD_CHANNEL_ID, "No events found across all chains.");
    return;
  }

  const eventsByChain = allChainEvents.reduce((acc, event) => {
    if (!acc[event.chain]) acc[event.chain] = [];
    acc[event.chain].push(event);
    return acc;
  }, {});

  let summary = "Daily Claimed Prize Report:\n";

  for (const chain in eventsByChain) {
    const events = eventsByChain[chain];
    const highestDrawId = Math.max(...events.map(e => e.drawId));
    const totalChainPayout = events.reduce((sum, e) => sum + e.payout, 0n);

    summary += `\n**${chain} (Draw ${highestDrawId}) Total Payout: ${formatNumber(totalChainPayout)} ${PAYOUT_CURRENCY[chain]}**\n`;

    const groupedByRecipient = events.reduce((acc, event) => {
      const recipient = event.claimRewardRecipient.slice(0, 6);
      if (!acc[recipient]) acc[recipient] = { prizes: [], canaries: [] };

      if (event.payout > 0n) {
        acc[recipient].prizes.push(event);
      } else {
        acc[recipient].canaries.push(event);
      }

      return acc;
    }, {});

    for (const [recipient, data] of Object.entries(groupedByRecipient)) {
      if (data.prizes.length > 0) {
        const totalPayout = data.prizes.reduce((sum, e) => sum + e.payout, 0n);
        const totalReward = data.prizes.reduce((sum, e) => sum + e.claimReward, 0n);
        const feePercentage = (Number(totalReward) / Number(totalPayout)) * 100 || 0;

        summary += `  (${recipient}) ${data.prizes.length} Prizes, Payout ${formatNumber(totalPayout)} ${PAYOUT_CURRENCY[chain]}, Fee ${feePercentage.toFixed(2)}%\n`;
      }

      if (data.canaries.length > 0) {
        const totalReward = data.canaries.reduce((sum, e) => sum + e.claimReward, 0n);
        summary += `  (${recipient}) ${data.canaries.length} Canaries, Reward ${formatNumber(totalReward)} ${PAYOUT_CURRENCY[chain]}\n`;
      }
    }
  }

  await SendMessageToChannel(DISCORD_CHANNEL_ID, summary.slice(0, 2000));
}

// Scheduler function
function scheduleScript() {
  const now = new Date();
  const targetTime = new Date();

  targetTime.setUTCHours(RUN_TIME_UTC.hour, RUN_TIME_UTC.minute, RUN_TIME_UTC.second, 0);

  if (now > targetTime) {
    targetTime.setUTCDate(targetTime.getUTCDate() + 1);
  }

  const delay = targetTime - now;

  console.log(`Script scheduled to run in ${delay / 1000} seconds at UTC time ${RUN_TIME_UTC.hour}:${RUN_TIME_UTC.minute}:${RUN_TIME_UTC.second}.`);

  setTimeout(async () => {
    try {
      console.log("Running script...");
      await main();
    } catch (error) {
      console.error("Error during script execution:", error.message);
      await SendMessageToChannel(DISCORD_CHANNEL_ID, `Error: ${error.message}`);
    }

    scheduleScript();
  }, delay);
}

// Start the scheduler
scheduleScript();
