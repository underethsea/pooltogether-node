const { V4ADDRESS } = require("../../constants/v4addresses.js")
const {Emoji} = require("../../constants/emoji.js")

const { EmbedBuilder } = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

const { V4CONTRACTS } = require("../../constants/canaryContracts.js")
const fetch = require("node-fetch")

async function pool(amount) {
return amount / 1e18;
} 
async function holders(threshold = 0) {
    try{
let responses = await Promise.all([
            fetch("https://poolexplorer.xyz/holders-137"),
            fetch("https://poolexplorer.xyz/holders-1"),
            fetch("https://poolexplorer.xyz/holders-10"),
            fetch("https://poolexplorer.xyz/holders-42161"),
            fetch("https://poolexplorer.xyz/holders-8453")
        ]);

let [polygonHolders, ethereumHolders, optimismHolders, arbitrumHolders, baseHolders] = await Promise.all(responses.map(async (response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        }));

polygonHolders = polygonHolders.data.items
ethereumHolders = ethereumHolders.data.items
optimismHolders = optimismHolders.data.items
arbitrumHolders = arbitrumHolders.data.items
baseHolders = baseHolders.data.items

if(threshold > 0){
polygonHolders = polygonHolders.filter(function isThreshold(num) {
  return (num.balance / 1e18 ) >= threshold;
})
ethereumHolders = ethereumHolders.filter(function isThreshold(num) {
  return (num.balance / 1e18 ) >= threshold;
})
optimismHolders = optimismHolders.filter(function isThreshold(num) {
  return (num.balance / 1e18 ) >= threshold;
})
arbitrumHolders = arbitrumHolders.filter(function isThreshold(num) {
  return (num.balance / 1e18 ) >= threshold;
})
baseHolders = baseHolders.filter(function isThreshold(num) {
  return (num.balance / 1e18 ) >= threshold;
})

}
let thresholdString = threshold > 0 ? " >= " + parseFloat(threshold).toFixed(0) : ""
   let bigList = polygonHolders.concat(ethereumHolders)
   bigList = bigList.concat(optimismHolders)
   bigList = bigList.concat(arbitrumHolders)
   bigList = bigList.concat(baseHolders)

let uniqueObjArray = [
    ...new Map(bigList.map((item) => [item["address"], item])).values(),
];
console.log(uniqueObjArray.length,"  unique holders")
    let holdersEmbed = new EmbedBuilder()

      .setColor("#0099ff")
      .setTitle(" POOL Holders " + thresholdString +
Emoji("poolyAttention") + " ")
      .setDescription(
        Emoji("polygon") +
        " Polygon " +
        Commas(polygonHolders.length) +
        "\n" +
        Emoji("ethereum") +
        " Ethereum " +
        Commas(ethereumHolders.length) +
        "\n" +
        Emoji("optimism") +
        " Optimism " +
        Commas(optimismHolders.length) +
"\n" +
Emoji("arbitrum") +
        " Arbitrum " +
        Commas(arbitrumHolders.length) +
"\n" +
        Emoji("base") +
        " Base " +
        Commas(baseHolders.length) +

"\n" + "\n" +
        Emoji("pool") +
        " Unique " +
        Commas(uniqueObjArray.length)
      );
      console.log("embed",holdersEmbed)
    return holdersEmbed;}catch(error){console.log("error generating holders embed",error)}
  }



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


module.exports = {
  data: new SlashCommandBuilder()
    .setName("holders")
    .setDescription("POOL holders")

    .addStringOption((option) =>
      option
        .setName("threshold")
        .setDescription("Minimum POOL for calculation")
        .setRequired(false)
    ),
    run: async (client, interaction) => {
        let thresholdOption = interaction.options.getString("threshold");
        let threshold = 1; // Default to 1 if no threshold is provided or if it's invalid.
      
        // Check if the threshold option is a valid number greater than 1.
        if (thresholdOption) {
          let parsedThreshold = parseInt(thresholdOption, 10);
          if (!isNaN(parsedThreshold) && parsedThreshold > 1) {
            threshold = parsedThreshold;
          }
        }
      
        try {
          const holdersEmbed = await holders(threshold);
          await interaction.reply({ embeds: [holdersEmbed] });
        } catch (error) {
          console.error("error on holders", error);
          await interaction.reply("Error requesting holders: " + error.message);
        }
      },
      
      
      
     
};

