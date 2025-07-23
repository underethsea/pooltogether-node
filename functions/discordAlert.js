require('../env-setup');
const { Client, GatewayIntentBits, Partials } = require("discord.js");
const Discord = require("discord.js");
// const { DISCORDID } = require("./constants/discordId.js")

const pgp = require("pg-promise")();
const ethers = require("ethers");
//const fs = require("fs");
const fetch = require("cross-fetch");
const { ADDRESS } = require("../constants/address");
const { CONFIG } = require("../constants/config");
const { EmbedBuilder } = require("discord.js");

const { getChainConfig } = require('../chains');

const CHAINNAME = getChainConfig().CHAINNAME;

// override for manual draw processing
//const drawToProcess = 663

// test with no public alerts (true)
const testModeNoAlerts = false;

// blackList for addresses to not alert - array of strings!
const tempBlacklist = [];

// user to receive notification that alerts have completed
const userReportsId = "662117180158246926";

const client = new Client({
  partials: [Partials.Channel],
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages],
});

const fourteenUsdc = (amount) => {
  let newNum = amount / 1e14;
  if (newNum < 1) {
    return newNum.toFixed(2);
  } else {
    return newNum.toFixed();
  }
};

const cn = {
  host: "localhost", // server name or IP address;
  port: 5432,
  database: "birdcall",
  user: process.env.USER,
  password: process.env.PASSWORD,
};
const db = pgp(cn);

async function DiscordNotifyClaimPrize(claim, prizepool, chainName) {
const chain = chainName ? chainName : CHAINNAME
  try {
    const subscribers = await db.any(`
      SELECT wallet, discord, label FROM addresses 
      WHERE LOWER(wallet) = LOWER($1)
    `, [claim.winner.toLowerCase()]);

    if (subscribers.length === 0) {
      console.log(`Wallet ${claim.winner} is not subscribed for alerts or doesn't have a Discord ID.`);
      return;
    }

    const payAmount = parseInt(claim.payout) / 1e18;
prizepool = prizepool.toLowerCase()
    const existingClaim = await db.oneOrNone(`
      SELECT 1 FROM v5claims 
      WHERE network = $1 AND block = $2 AND hash = $3 AND draw = $4 AND vault = $5 
      AND winner = $6 AND payout = $7 AND miner = $8 AND fee = $9 AND tier = $10 AND index = $11 AND prizepool = $12

    `, [claim.network, claim.block, claim.hash, claim.drawId, claim.vault, claim.winner, claim.payout, claim.miner, claim.fee, claim.tier, claim.index, prizepool]);



if (!existingClaim) {
  try {
    


for (const subscriber of subscribers) {
      if (subscriber.discord) {
        const labelMessage = subscriber.label ? `${subscriber.label}` : "";
        const message = " 🏆 WINNER " + claim.chainName + " `" +
          subscriber.wallet.substring(0, 6) + "` WON " + payAmount.toFixed(6) + " " +
          ADDRESS[chain].PRIZETOKEN.SYMBOL + " " + labelMessage;

        /*
        console.log("-----------------")
        console.log(claim.network, claim.block, claim.hash, claim.drawId, claim.vault, claim.winner, claim.payout, claim.miner, claim.fee, claim.tier, claim.index, prizepool)
        console.log("telllllling them")
        console.log("----------------")
        */

try {
    await tellUser(subscriber.discord, message);
  } catch (e) {
    console.error(`Failed to alert ${subscriber.discord} (${subscriber.wallet}):`, e);
  }

      } else {
        console.log(`Subscriber ${subscriber.wallet} doesn't have Discord ID.`);
      }
    }

    // After successfully notifying users, insert the claim into the database
    await db.none(`
      INSERT INTO v5claims (network, block, hash, draw, vault, winner, payout, miner, fee, tier, index, prizepool) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [claim.network, claim.block, claim.hash, claim.drawId, claim.vault, claim.winner, claim.payout, claim.miner, claim.fee, claim.tier, claim.index, prizepool.toLowerCase()]);

    console.log(claim.network, "claim added to db, tx ", claim.hash, 
   " winner ", claim.winner, 
   " tier/index ", claim.tier, 
   "/", claim.index, 
   "amt", claim.payout.toString()
    );
  } catch (error) {
    console.error("Failed to alert user or update database:", error);
  }
} else {
  console.log("Claim prev alerted for ", claim.winner, " draw ", claim.drawId, " vault ", claim.vault, " tier ", claim.tier);
}

 

 } catch (error) {
    console.log(error);
  }
}

async function tellUser(user, message) {
  try {
    const discordUser = await client.users.fetch(user, false);
    if (testModeNoAlerts !== true) {
      await discordUser.send(message);
      console.log("Message to user:", user, " Message:", message);
    }
  } catch (error) {
    console.log("Could not alert user:", error);
    throw new Error("Failed to alert user.");  // Propagate the error to be caught in DiscordNotifyClaimPrize
  }
}
/*
async function SendMessageToChannel(channelId, message) {
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      console.error(`Channel with ID ${channelId} not found.`);
      return;
    }
    await channel.send(message);
    console.log(`Message sent to channel ${channelId}: ${message}`);
  } catch (error) {
    console.error(`Failed to send message to channel ${channelId}:`, error);
  }
}
*/
async function SendMessageToChannel(channelId, message) {
  try {
    console.log(`Attempting to fetch channel with ID ${channelId}...`);
//    const channel = await client.channels.fetch(channelId);
const channel = await client.channels.fetch(channelId, { force: true });

    if (!channel) {
      console.error(`Channel with ID ${channelId} not found.`);
      return;
    }

    console.log(`Channel with ID ${channelId} fetched successfully. Attempting to send message...`);
    await channel.send(message);
    console.log(`Message successfully sent to channel ${channelId}: ${message}`);
  } catch (error) {
    console.error(`Failed to send message to channel ${channelId}. Error details:`, error);

    // Additional error details for debugging
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    if (error.requestBody) {
      console.error('Request body:', JSON.stringify(error.requestBody));
    }
    if (error.rawError) {
      console.error('Raw error:', JSON.stringify(error.rawError));
    }
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.status) {
      console.error('HTTP status:', error.status);
    }
  }
}

client.login(process.env.BOT_KEY);
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('error', (error) => {
  console.error("Client encountered an error:", error);
});
client.guilds.cache.forEach(guild => {
  console.log(`Guild: ${guild.name}`);
  guild.channels.cache.forEach(channel => {
    console.log(`Channel: ${channel.name} (ID: ${channel.id})`);
  });
});

module.exports = { SendMessageToChannel, DiscordNotifyClaimPrize };
