const { EmbedBuilder } = require("discord.js");
const { Emoji } = require("./src/constants/emoji.js");
const { DISCORDADDRESS } = require("./src/constants/discordAddress.js");
const { PROVIDERS } = require("./src/constants/providers.js")
const { ethers } = require("ethers");
const NAMETOID = {
OPTIMISM:10,
ARBITRUM:42161,
ETHEREUM:1,
BASE:8453}

async function sendMessageToDiscord(client, channelId, etherscanLink, sender, tokenOutName, chain) {
    try {
        const channel = await client.channels.fetch(channelId);
        const senderLink = `https://etherscan.io/address/${sender}`;

        // Constructing the embed
        let liquidationEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle(Emoji(chain.toLowerCase()) + " New Liquidation Pair")
            .setDescription(
                `${tokenOutName}\n` +
                `Created by: [${sender.slice(0, 6)}](${senderLink})\n` +
                `[Transaction ↗️](${etherscanLink})`
            );

        console.log("embed", liquidationEmbed);

        await channel.send({ embeds: [liquidationEmbed] });

        console.log("Embed sent to Discord successfully");
    } catch (error) {
        console.log("error generating liquidation embed", error);
    }
}

async function sendVaultToDiscord(client, channelId, name, etherscanLink, sender, address, chainName) {
    try {
        const channel = await client.channels.fetch(channelId);
        const senderLink = `https://etherscan.io/address/${sender}`;
         const pooltimeLink = `https://www.pooltime.app/vault?chain=${NAMETOID[chainName]}&address=${address}`;
        //const pooltimeLink = `https://www.pooltime.app/`
        // Constructing the embed
        let vaultEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle(Emoji(chainName.toLowerCase()) + " New Vault ")
            .setDescription(
                `${name}\n` +
                `Created by: [${sender.slice(0, 6)}](${senderLink})\n` +
                `[Transaction↗](${etherscanLink})\n` +
                `View on: [PoolTime](${pooltimeLink})`
            );

        console.log("embed", vaultEmbed);

        await channel.send({ embeds: [vaultEmbed] });

        console.log("Embed sent to Discord successfully");
    } catch (error) {
        console.log("error generating vault embed", error);
    }
}

module.exports = { sendMessageToDiscord, sendVaultToDiscord };
