const { ethers } = require('ethers');
require('dotenv').config();
const { SendMessageToChannel } = require('./functions/discordAlert.js');

// Time the script should run daily (UTC)
const RUN_TIME_UTC = { hour: 22, minute: 0, second: 0 };

// Alchemy endpoints for each chain
const ALCHEMY_URLS = {
  BASE: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  OPTIMISM: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  ARBITRUM: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  SCROLL: `https://scroll-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  GNOSIS: `https://gnosis-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  WORLD: `https://worldchain-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
};

// Prize pool contract addresses
const PRIZE_POOL_ADDRESSES = {
  BASE: '0x45b2010d8a4f08b53c9fa7544c51dfd9733732cb',
  OPTIMISM: '0xF35fE10ffd0a9672d0095c435fd8767A7fe29B55',
  ARBITRUM: '0x52e7910c4c287848c8828e8b17b8371f4ebc5d42',
  SCROLL: '0xa6ecd65c3eecdb59c2f74956ddf251ab5d899845',
  GNOSIS: '0x0c08c2999e1a14569554eddbcda9da5e1918120f',
  WORLD: '0x99ffb0a6c0cd543861c8de84dd40e059fd867dcf',
};

// Topic hash for ClaimedPrize event
const EVENT_TOPIC = '0x81d4e3306aa30f56dc9c3949abd8c27539b445f9ef380425f39f3f7114888e4f';

// Token symbols per chain
const PAYOUT_CURRENCY = {
  BASE: 'WETH',
  OPTIMISM: 'WETH',
  ARBITRUM: 'WETH',
  SCROLL: 'WETH',
  GNOSIS: 'XDAI',
  WORLD: 'WLD',
};

// Discord channel ID
const DISCORD_CHANNEL_ID = "1314349608096366633";

// Setup providers
const providers = Object.keys(ALCHEMY_URLS).reduce((acc, chain) => {
  acc[chain] = new ethers.providers.JsonRpcProvider(ALCHEMY_URLS[chain]);
  return acc;
}, {});

// Format value to 8 decimal places
function formatNumber(value, decimals = 18) {
  return parseFloat(ethers.utils.formatUnits(value, decimals)).toFixed(8);
}

async function fetchPrizeClaims(chainName) {
  const provider = providers[chainName];
  const prizePoolAddress = PRIZE_POOL_ADDRESSES[chainName];

  const chunkSize = 10000;
  const maxBlockSpan = 50000;

  const iface = new ethers.utils.Interface([
    "event ClaimedPrize(address indexed vault, address indexed winner, address indexed recipient, uint24 drawId, uint8 tier, uint32 prizeIndex, uint152 payout, uint96 claimReward, address claimRewardRecipient)"
  ]);

  const toBlockStart = await provider.getBlockNumber();
  const minBlock = Math.max(toBlockStart - maxBlockSpan, 0);

  let toBlock = toBlockStart;
  let fromBlock = toBlock - chunkSize;
  if (fromBlock < minBlock) fromBlock = minBlock;

  let highestDrawId = null;
  let allEvents = [];

  console.log(`🔍 Fetching prize claims for ${chainName}... scanning blocks ${toBlockStart} → ${minBlock}`);

  while (fromBlock >= minBlock && toBlock >= minBlock) {
    console.log(`  📦 ${chainName}: fetching blocks ${fromBlock} → ${toBlock}`);

    const filter = {
      address: prizePoolAddress,
      topics: [EVENT_TOPIC],
      fromBlock,
      toBlock,
    };

    let logs;
    try {
      logs = await provider.getLogs(filter);
    } catch (err) {
      console.error(`❌ Error fetching logs for ${chainName} [${fromBlock}-${toBlock}]: ${err.message}`);
      break;
    }

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
      console.log(`  ✅ Found ${events.length} events in ${chainName} [${fromBlock}-${toBlock}]`);
      allEvents.push(...events);

      const currentHighestDrawId = Math.max(...events.map(e => e.drawId));
      if (highestDrawId === null) {
        highestDrawId = currentHighestDrawId;
      }
    }

    // Move down to next chunk
    toBlock = fromBlock - 1;
    fromBlock = toBlock - chunkSize;
    if (fromBlock < minBlock) fromBlock = minBlock;

    // Final safety stop
    if (fromBlock < minBlock || toBlock < minBlock) break;
  }

  return allEvents.filter(e => e.drawId === highestDrawId);
}

// Run daily prize summary across all chains
async function main() {
  const allChainEvents = [];

  for (const chainName of Object.keys(providers)) {
    try {
      const chainEvents = await fetchPrizeClaims(chainName);
      if (chainEvents.length > 0) {
        allChainEvents.push(...chainEvents);
      }
    } catch (err) {
      console.error(`Error processing ${chainName}:`, err.message);
    }
  }

  if (allChainEvents.length === 0) {
    await SendMessageToChannel(DISCORD_CHANNEL_ID, "No prize claims found across any chain.");
    return;
  }

  const eventsByChain = allChainEvents.reduce((acc, e) => {
    acc[e.chain] = acc[e.chain] || [];
    acc[e.chain].push(e);
    return acc;
  }, {});

  let summary = "🏆 **Daily Claimed Prize Report** 🏆\n";

  for (const chain in eventsByChain) {
    const events = eventsByChain[chain];
    const drawId = Math.max(...events.map(e => e.drawId));
    const totalPayout = events.reduce((sum, e) => sum + e.payout, 0n);

    summary += `\n**${chain} (Draw ${drawId}) — Total Payout: ${formatNumber(totalPayout)} ${PAYOUT_CURRENCY[chain]}**\n`;

    const grouped = events.reduce((acc, e) => {
      const label = e.claimRewardRecipient.slice(0, 6);
      acc[label] = acc[label] || { prizes: [], canaries: [] };
      (e.payout > 0n ? acc[label].prizes : acc[label].canaries).push(e);
      return acc;
    }, {});

    for (const [recipient, data] of Object.entries(grouped)) {
      if (data.prizes.length > 0) {
        const totalPayout = data.prizes.reduce((sum, e) => sum + e.payout, 0n);
        const totalReward = data.prizes.reduce((sum, e) => sum + e.claimReward, 0n);
        const feePct = (Number(totalReward) / Number(totalPayout)) * 100 || 0;
        summary += `  (${recipient}) ${data.prizes.length} prizes, ${formatNumber(totalPayout)} ${PAYOUT_CURRENCY[chain]}, Fee ${feePct.toFixed(2)}%\n`;
      }
      if (data.canaries.length > 0) {
        const totalReward = data.canaries.reduce((sum, e) => sum + e.claimReward, 0n);
        summary += `  (${recipient}) ${data.canaries.length} canaries, Reward ${formatNumber(totalReward)} ${PAYOUT_CURRENCY[chain]}\n`;
      }
    }
  }

  await SendMessageToChannel(DISCORD_CHANNEL_ID, summary.slice(0, 2000));
}

// Run daily at fixed UTC time
function scheduleScript() {
  const now = new Date();
  const target = new Date();

  target.setUTCHours(RUN_TIME_UTC.hour, RUN_TIME_UTC.minute, RUN_TIME_UTC.second, 0);
  if (now > target) target.setUTCDate(target.getUTCDate() + 1);

  const delay = target - now;

  console.log(`⏱️ Scheduled to run in ${(delay / 1000).toFixed(0)} seconds at ${RUN_TIME_UTC.hour}:${RUN_TIME_UTC.minute} UTC`);

  setTimeout(async () => {
    try {
      console.log("🚀 Running daily prize report...");
      await main();
    } catch (err) {
      console.error("🔥 Script error:", err.message);
      await SendMessageToChannel(DISCORD_CHANNEL_ID, `Script error: ${err.message}`);
    }
    scheduleScript(); // Reschedule next run
  }, delay);
}

// Start scheduler + run once immediately
scheduleScript();
//main().then(() => console.log("🛠️ Manual run complete"));
