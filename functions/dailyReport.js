const ethers = require('ethers');
require('../env-setup');
const {CONFIG} = require('../constants/config'); // Adjust path as necessary
const {ABI} = require('../constants/abi'); // Adjust path as necessary
const {PROVIDERS} = require('../constants/providers'); // Adjust path as necessary
const {ADDRESS} = require('../constants/address')
const { Client, Intents, MessageEmbed } = require("discord.js");

const formatPrize = (bigNumber) =>
{
const number = Number(ethers.utils.formatUnits(bigNumber,decimals))
if(number < .0001){return number}else if (number < .01){return number.toFixed(4)}
else if (number < 100){return number.toFixed(2)}else {return number.toFixed(0)}
}
// Discord client setup
const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.once("ready", () => {
  console.log("Discord client is ready!");
});

client.login(process.env.BOT_KEY)
// Initialize contract
const prizePoolContract = new ethers.Contract(
  ADDRESS[CONFIG.CHAINNAME].PRIZEPOOL,
  ABI.PRIZEPOOL,
  PROVIDERS[CONFIG.CHAINNAME]
);

const decimals = ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.DECIMALS
const prizeTokenSymbol = ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.SYMBOL
const startBlock =  "-50000"
const toBlock = 'latest'; // Adjust according to your needs

// Calculate the event signature hash for 'DrawAwarded'
const drawAwardedSignature = "0x60785c409db91938793d3f74013b06843f82ea0588265495b262b016fe5323ae"

async function fetchDrawAwardedLogs() {
  try {
    const currentBlock = await PROVIDERS[CONFIG.CHAINNAME].getBlockNumber();
const drawAwardedFilter = {
  address: ADDRESS[CONFIG.CHAINNAME].PRIZEPOOL,
  topics: [drawAwardedSignature],
  fromBlock: currentBlock-500000,
  toBlock: "latest",
};
    const logs = await PROVIDERS[CONFIG.CHAINNAME].getLogs(drawAwardedFilter);
    // Process logs if needed
    return logs;
  } catch (error) {
    console.error('Error fetching DrawAwarded logs:', error);
    return [];
  }
}

async function findThreeMostRecentDrawsAwarded() {
  const events = await fetchDrawAwardedLogs();
  if (events.length < 3) {
    throw new Error("Not enough draws found. Need at least three draws to proceed.");
  }
  // Assuming the events are in chronological order, with the most recent last
  const mostRecentDraw = events[events.length - 1];
  const thirdLastDraw = events[events.length - 3];
  return { thirdLastDraw, mostRecentDraw };
}

async function findEventsSinceLastDraw(drawBlockNumberStart, drawBlockNumberEnd) {
  const contributeFilter = prizePoolContract.filters.ContributePrizeTokens(null, null, null);
  const contributeEvents = await prizePoolContract.queryFilter(contributeFilter, drawBlockNumberStart, drawBlockNumberEnd);

  const claimedFilter = prizePoolContract.filters.ClaimedPrize(null, null, null, null, null, null, null, null);
  const claimedEvents = await prizePoolContract.queryFilter(claimedFilter, drawBlockNumberStart, "latest");

  let drawIds = new Set(); // Use a Set to track unique drawIds

    // Log each event's drawId and amount contributed
  //  console.log(`ContributePrizeTokens event: drawId=${event.args.drawId}, amount=${event.args.amount.toString()}`);
  //});

/*
  if (drawIds.size > 1) {
    // If there's more than one unique drawId, log a warning
    console.warn("Warning: Multiple drawIds found in ContributePrizeTokens events.");
  } else {
    // If all events have the same drawId, confirm in the log
    console.log(`All ContributePrizeTokens events are for the same drawId: ${Array.from(drawIds)[0]}`);
  }
*/
  return { contributeEvents, claimedEvents};
}


function processClaimedPrizes(claimedEvents) {
  let totalPayout = ethers.BigNumber.from(0);
  let totalFees = ethers.BigNumber.from(0);
  let uniqueTiers = new Set();
  let uniqueWinners = new Set(); // Set to keep track of unique winner addresses

  for (const event of claimedEvents) {
    const { tier, payout, fee, winner } = event.args; 
    totalPayout = totalPayout.add(payout);
    totalFees = totalFees.add(fee);
    uniqueTiers.add(tier);
    uniqueWinners.add(winner); // Add winner address to the set of unique winners
  }

  uniqueTiers = Array.from(uniqueTiers).sort((a, b) => a - b);

  return {
    totalPayout: totalPayout.toString(),
    totalFees: totalFees.toString(),
    uniqueTiers: Array.from(uniqueTiers),
    //uniqueWinners: Array.from(uniqueWinners), // Optionally convert to array if needed for further processing
    uniqueWinners: uniqueWinners.size // The count of unique winners
  };
}

  
async function DailyReport() {
    const { thirdLastDraw, mostRecentDraw } = await findThreeMostRecentDrawsAwarded();

    const drawBlockNumberStart = thirdLastDraw.blockNumber;
    const drawBlockNumberEnd = mostRecentDraw.blockNumber;

    let { contributeEvents, claimedEvents } = await findEventsSinceLastDraw(drawBlockNumberStart, drawBlockNumberEnd);

    // Decode the mostRecentDrawId from the topics and subtract 1 to get draw with finished claims
const mostRecentDrawIdDecoded = ethers.BigNumber.from(mostRecentDraw.topics[1]).sub(1).toString();

    console.log("Most Recent Completed Draw ID:", mostRecentDrawIdDecoded);

    // Filter the events by the most recent draw ID - 1
    contributeEvents = contributeEvents.filter(event => event.args.drawId.toString() === mostRecentDrawIdDecoded);
    claimedEvents = claimedEvents.filter(event => event.args.drawId.toString() === mostRecentDrawIdDecoded);

    // Sum the amounts for ContributePrizeTokens events after filtering
    let totalContributeAmount = ethers.BigNumber.from(0);
    contributeEvents.forEach(event => {
        totalContributeAmount = totalContributeAmount.add(event.args.amount);
    });

    // Proceed with processing the filtered events
    const { totalPayout, totalFees, uniqueTiers, uniqueWinners } = processClaimedPrizes(claimedEvents);

    // Count the number of prize claims and contribute events
    const numberOfPrizeClaims = claimedEvents.length;
    const numberOfContributeEvents = contributeEvents.length;

    const dailyData = {
        drawId: mostRecentDrawIdDecoded,
        totalPayout: totalPayout.toString(),
        totalFees: totalFees.toString(),
        uniqueTiers: Array.from(uniqueTiers),
        numberOfPrizeClaims: numberOfPrizeClaims,
        totalContributeAmount: totalContributeAmount.toString(),
        numberOfContributeEvents: numberOfContributeEvents,
        uniqueWinners: uniqueWinners,
    };

    console.log(`Total Payout: ${dailyData.totalPayout}`);
    console.log(`Total Fees: ${dailyData.totalFees}`);
    console.log(`Unique Tiers Awarded: ${dailyData.uniqueTiers.join(', ')}`);
    console.log(`Number of Prize Claims: ${dailyData.numberOfPrizeClaims}`);
    console.log(`Total Contributed Amount: ${dailyData.totalContributeAmount}`);
    console.log(`Number of Contribute Events: ${dailyData.numberOfContributeEvents}`);
    sendDailyReportToChannel(dailyData).catch(console.error);
}

async function sendDailyReportToChannel(dailyData) {
  // Ensure the client is ready
  if (!client.isReady()) {
    console.log("Discord client not ready, cannot send message.");
    return;
  }

  const embed = new MessageEmbed()
    .setTitle("🏆\u00A0\u200B\u00A0Draw #" + dailyData.drawId + " Prize Report")
    .setColor("#0099ff")
.addFields(
  { name: "Prizes", value: dailyData.numberOfPrizeClaims.toString(), inline: true },
  { name: "\u200B", value: "\u200B", inline: true }, // Dummy field for spacing if needed 
 { name: "Won", value: `${formatPrize(dailyData.totalPayout)} ${prizeTokenSymbol}`, inline: true },
 { name: "Unique Winners", value: dailyData.uniqueWinners.toString(), inline: true }, // Change to inline: true
  { name: "\u200B", value: "\u200B", inline: true }, // Dummy field for spacing if needed
  { name: "Tiers", value: dailyData.uniqueTiers.join(', '), inline: true },
  { name: "Contributions", value: dailyData.numberOfContributeEvents.toString(), inline: true }, // Change to inline: true
  { name: "\u200B", value: "\u200B", inline: true }, // Dummy field for spacing if needed
  { name: "Generated", value: `${formatPrize(dailyData.totalContributeAmount)} ${prizeTokenSymbol}`, inline: true },
)

    const existingChannelId = "932504732818362378"; // test
    const existingChannel = await client.channels.fetch(existingChannelId);
    if (existingChannel) {
        existingChannel.send({ embeds: [embed] }).then(() => {
            console.log("Daily report sent successfully to the existing channel.");
        }).catch(console.error);
    } else {
        console.log("Existing channel not found.");
    }

    // Fetch and send to the ptBotChannel
    const ptBotChannelId = "878246045048520704"; // ptBotChannel ID
    const ptBotChannel = await client.channels.fetch(ptBotChannelId);
    if (ptBotChannel) {
        ptBotChannel.send({ embeds: [embed] }).then(() => {
            console.log("Daily report sent successfully to the ptBotChannel.");
        }).catch(console.error);
    } else {
        console.log("ptBotChannel not found.");
    }
}

//main().catch(console.error);
module.exports = { DailyReport }
