const { EmbedBuilder } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const { Emoji } = require("../../constants/emoji.js");
const { Tvl } = require("../../functions/tvl.js")
const { GetCanaryVaultTvl } = require("../../functions/getCanaryVaultTvl.js");
const { GetToucanVaultTvl } = require("../../functions/getToucanVaultTvl.js");
const { V4ADDRESS } = require("../../constants/v4addresses.js");
const { V4CONTRACTS } = require("../../constants/v4contracts.js");

console.log("emoji", Emoji("usdc"));

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
  console.log(await V4CONTRACTS.AAVE.POLYGON.balanceOf(V4ADDRESS.POLYGON.YIELDSOURCE));
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
  ]);

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
      Emoji("polygon") + " Polygon " + Commas(polygonAaveBalance) + "\n" +
      Emoji("ethereum") + " Ethereum " + Commas(ethereumAaveBalance) + "\n" +
      Emoji("avalanche") + " Avalanche " + Commas(avalancheAaveBalance) + "\n" +
      Emoji("optimism") + " Optimism " + Commas(optimismAaveBalance)
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
        .addChoices(
          { name: "v4", value: "v4" },
          //{ name: "canary", value: "canary" },
          { name: "v5", value: "toucan" }
        )
        .setRequired(false)
    ),
  run: async (client, interaction) => {
    const user = interaction.user;
    const version = interaction.options.getString("version") ?? "No version provided";

    try {
      if (version === "v4") {
        const tvlEmbed = await v4tvl();
        await interaction.reply({ embeds: [tvlEmbed] });
      } else {
        /*let tvl, titleText;

        if (version === "canary") {
          tvl = await GetCanaryVaultTvl("OPTIMISM");
          titleText = "Canary";
        } else {
          tvl = await GetToucanVaultTvl("OPTIMISM");
          titleText = "V5";
        }

        console.log("title text", titleText);
        console.log("v5 tvl", tvl);

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
          .setTitle(Emoji("optimism") + " " + titleText + " TVL $" + totalTVL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
          .addFields(topVaults.map(vault => {
            let name = vault.name.startsWith('Prize') ? vault.name.replace('Prize ', '') : vault.name;
            return {
              name: `${name}`,
              value: `Value: $${vault.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              inline: false // This ensures each vault is on its own line.
            };
          }));

        await interaction.reply({ embeds: [tvlEmbed] });
   */
console.log("v5 tvl fetching")
tvl = await Tvl();
          titleText = "V5";
console.log("v5 tvl")
          // Calculate the total TVL
          let totalTVL = Object.values(tvl).reduce((acc, value) => acc + value, 0);

          // Create the embed.
          let tvlEmbed = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("Total Value Locked (TVL)")
            .setDescription(`Total TVL: $${totalTVL.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`)
            .addFields(Object.entries(tvl).map(([chain, value]) => ({
              name: `${Emoji(chain.toLowerCase())} ${chain}`,
              value: `Value: $${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
              inline: false // This ensures each chain is on its own line.
            })));

          await interaction.reply({ embeds: [tvlEmbed] });
   }
    } catch (error) {
      console.log("error on tvl", error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: "Error requesting TVL" });
      } else {
        await interaction.reply({ content: "Error requesting TVL", ephemeral: true });
      }
    }
  },
};
