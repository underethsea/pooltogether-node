const { Emoji } = require("../../constants/emoji.js");
const { EmbedBuilder } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");
const Prizes = require("../../functions/prizes");

const Commas = (number) => {
  if (typeof number !== 'number') {
    return number;
  }
  if (number < 1) {
    return number.toFixed(2);
  } else {
    let fixed = number.toFixed(2);
    return fixed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
};

const CommasUSD = (number) => {
  if (typeof number !== 'number') {
    return number;
  }
  let fixed = number.toFixed(0);
  return fixed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("prizes")
    .setDescription("Get prize information"),

  run: async (client, interaction) => {
    try {
      const prizeInfo = await Prizes();

      if (!prizeInfo) {
        await interaction.reply("Error fetching prize information.");
        return;
      }

      const { ethereumPrice, totalPrizeInDollars, prizes } = prizeInfo;

      const prizesEmbed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle(`${Emoji("trophy")} Total Prizes ${Commas(totalPrizeInDollars / ethereumPrice)} ETH / $${CommasUSD(totalPrizeInDollars)}`)
        .addFields(
          prizes.flatMap((prize, index) => {
            const fields = [
              {
                name: `${Emoji(prize.chain.toLowerCase())} ${prize.chain}`,
                value: `**Prizes** ${Commas(prize.totalPrize)} ETH / $${CommasUSD(prize.totalPrize * ethereumPrice)}\n**Jackpot** ${prize.tier0Prize !== null ? `${Commas(prize.tier0Prize)} ETH / $${CommasUSD(prize.tier0Prize * ethereumPrice)}` : "N/A"}`,
                inline: false,
              }
            ];
/*            if (index < prizes.length - 1) {
              fields.push({ name: '\u200B', value: '\u200B', inline: false }); // Adding space between chains except for the last one
            }
*/
            return fields;
          })
        );

      await interaction.reply({ embeds: [prizesEmbed] });
    } catch (error) {
      console.error("Error fetching prize information:", error);
      await interaction.reply("Error fetching prize information: " + error.message);
    }
  },
};
