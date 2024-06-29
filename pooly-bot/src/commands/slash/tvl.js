const { EmbedBuilder } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { Emoji } = require("../../constants/emoji.js");

const { GetCanaryVaultTvl } = require("../../functions/getCanaryVaultTvl.js")
const { GetToucanVaultTvl } = require("../../functions/getToucanVaultTvl.js")
const { V4ADDRESS } = require("../../constants/v4addresses.js");

const { V4CONTRACTS } = require("../../constants/v4contracts.js");
console.log("emoji",Emoji("usdc"))
// const { MessageEmbed } = require("discord.js");
const Usdc = (amount) => {
  return amount / 1e6;
};
const Commas = (number) => {
  if (number < 1) {
    return number.toFixed(2);
  } else {
    let fixed = number.toFixed();
    return fixed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
};

async function v4tvl() {
  console.log(await V4CONTRACTS.AAVE.POLYGON.balanceOf(V4ADDRESS.POLYGON.YIELDSOURCE))
  let [
    polygonAaveBalance,
    avalancheAaveBalance,
    ethereumAaveBalance,
    optimismAaveBalance,
  ] = await Promise.all([
    V4CONTRACTS.AAVE.POLYGON.balanceOf(V4ADDRESS.POLYGON.YIELDSOURCE),
    V4CONTRACTS.AAVE.AVALANCHE.balanceOf(V4ADDRESS.AVALANCHE.YIELDSOURCE),
    V4CONTRACTS.AAVE.ETHEREUM.balanceOf(V4ADDRESS.ETHEREUM.YIELDSOURCE),
    V4CONTRACTS.AAVE.OPTIMISM.balanceOf(V4ADDRESS.OPTIMISM.YIELDSOURCE),
  ])
  polygonAaveBalance = Usdc(polygonAaveBalance);
  avalancheAaveBalance = Usdc(avalancheAaveBalance);
  ethereumAaveBalance = Usdc(ethereumAaveBalance);
  optimismAaveBalance = Usdc(optimismAaveBalance);
  let total =
    polygonAaveBalance +
    avalancheAaveBalance +
    ethereumAaveBalance +
    optimismAaveBalance;
     let tvl = new EmbedBuilder()

    .setColor("#0099ff")
    .setTitle(" V4 TVL Total " + Emoji("usdc") + " " + Commas(total))
    .setDescription(
      Emoji("polygon") +
        " Polygon " +
        Commas(polygonAaveBalance) +
        "\n" +
        Emoji("ethereum") +
        " Ethereum " +
        Commas(ethereumAaveBalance) +
        "\n" +
        Emoji("avalanche") +
        " Avalanche " +
        Commas(avalancheAaveBalance) +
        "\n" +
        Emoji("optimism") +
        " Optimism " +
        Commas(optimismAaveBalance)
    );
  return tvl;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tvl")
    .setDescription("Protocol Total Value Locked")

    .addStringOption((option) =>
      option
        .setName("version")
        .setDescription("Choose asset for coverage request")
        .addChoices({ name: "v4", value: "v4" }, { name: "canary", value: "canary" }, {name:"v5",value:"toucan"})
        .setRequired(false)
    ),
  run: async (client, interaction) => {
    const user = interaction.user;

    const version =
      interaction.options.getString("version") ?? "No version provided";
    try {
      if (version === "v4") {
     
        const tvlEmbed = await v4tvl();
        const messageId = await interaction.reply({ embeds: [tvlEmbed] });
      }  
      // v5
      else {

let tvl 
let titleText
if (version ==="canary") {
       tvl = await GetCanaryVaultTvl("OPTIMISM")
       titleText = "Canary"}
else{ 
tvl = await GetToucanVaultTvl("OPTIMISM")
titleText = "V5"
}
console.log("title text",titleText)
        console.log("v5 tvl",tvl)


// Calculate the TVL
let totalTVL = tvl.reduce((acc, vault) => acc + vault.value, 0);

// Sort the vaults by value in descending order.
let sortedVaults = [...tvl].sort((a, b) => b.value - a.value);

let topVaults = sortedVaults
  .filter(vault => vault.value > 0)  // Filter out vaults with a value of 0.
  .slice(0, 5);

// Create the embed.
let tvlEmbed = new EmbedBuilder()
  .setColor("#0099ff")
  .setTitle(Emoji("optimism") + " " + titleText + " TVL $"+totalTVL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
  // .setDescription(`TVL $${}`)
  // For each of the top vaults, add a field to the embed, excluding those with a value of zero.
  .addFields(topVaults.map(vault => {
    let name = vault.name.startsWith('Prize') ? vault.name.replace('Prize ', '') : vault.name;
    return {
      name: `${name}`,
      value: `Value: $${vault.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      inline: false // This ensures each vault is on its own line.
    };
  }))
  // .setTimestamp();


        const go = await interaction.reply({ embeds: [tvlEmbed] });
      }
      // }
      //     let embed = new EmbedBuilder().setColor("#ffd200");

      //       embed.setDescription(`Current Capacity for ${capacity.name}`).addFields(
      //         {
      //           name: "ETH",
      //           value: formatEighteen(capacity.availableCapacity[0].amount),
      //           inline: true,
      //         },
      //         {
      //           name: "DAI",
      //           value: formatEighteen(capacity.availableCapacity[1].amount),
      //           inline: true,
      //         }
      //         // { name: 'NXM', value: formatEighteen(capacity.capacity[2].amount),inline: true  },
      //       );

      //     const requestString = `Requesting ${numberWithCommas(
      //       amount
      //     )} ${coverAsset} capacity for ${capacity.name}`;
      //     embed.setTitle(requestString);
      //     embed.setFooter({ text: "Your request has been forwarded to the team" });

      //     // undersea
      //     // const memberID = '662117180158246926'
      //     // brave
      //     // const memberID = '799061525582315520'
      //     const alertMembers = ["662117180158246926", "799061525582315520"];
      //     try {
      //         console.log("alert people length",alertMembers.length)
      //       for (x = 0; x < alertMembers.length; x++) {
      //         let alert = await client.users.send(
      //           alertMembers[x],
      //           `@${user.username} ${requestString}`
      //         );
      //       }

      //       const messageId = await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.log("error on tvl", error);
      interaction.reply("Error requesting tvl");
    }
  },
};
