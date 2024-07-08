const { InteractionType } = require("discord.js");

module.exports = {
  name: 'interactionCreate',
  execute: async (interaction) => {
    let client = interaction.client;
    if (interaction.type === InteractionType.ApplicationCommand) {
      if (interaction.user.bot) return;
      try {
        const command = client.slashcommands.get(interaction.commandName);
        if (command) {
          await command.run(client, interaction);
        } else {
          await interaction.reply({ content: "Command not found!", ephemeral: true });
        }
      } catch (e) {
        console.error(e);
        await interaction.reply({ content: "There was a problem running the command! Please try again.", ephemeral: true });
      }
    }
  }
};
