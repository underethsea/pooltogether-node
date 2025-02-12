const { Client, Collection, GatewayIntentBits, Partials, REST, Routes } = require("discord.js");
const { readdirSync } = require("fs");
const dotenv = require("dotenv");
dotenv.config();

const { ADDRESS } = require('./src/constants/toucanAddress.js');
const liquidationEvent = require('./liquidationEvents.js');
const vaultEvent = require('./vaultEvents.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.GuildMember,
    Partials.Reaction,
    Partials.GuildScheduledEvent,
    Partials.User,
    Partials.ThreadMember,
  ],
});

let token = process.env.BOT_KEY;

client.commands = new Collection();
client.slashcommands = new Collection();
client.commandaliases = new Collection();

const rest = new REST({ version: '10' }).setToken(token);

// Command handler
const commands = [];
readdirSync('./src/commands/normal').forEach(async file => {
  const command = await require(`./src/commands/normal/${file}`);
  if (command) {
    client.commands.set(command.name, command);
    commands.push(command.name, command);
    if (command.aliases && Array.isArray(command.aliases)) {
      command.aliases.forEach(alias => {
        client.commandaliases.set(alias, command.name);
      });
    }
  }
});

// Slash command handler
const slashcommands = [];
readdirSync('./src/commands/slash').forEach(async file => {
  const command = await require(`./src/commands/slash/${file}`);
  slashcommands.push(command.data.toJSON());
  client.slashcommands.set(command.data.name, command);
});

client.on("ready", async () => {
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: slashcommands },
    );
  } catch (error) {
    console.error(error);
  }
  console.log(`${client.user.username} Aktif Edildi!`);
});

// Event handler
readdirSync('./src/events').forEach(async file => {
  const event = await require(`./src/events/${file}`);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
});

const chainNames = Object.keys(ADDRESS);

/*chainNames.forEach(chain => {
  liquidationEvent(client, chain);
  vaultEvent(client, chain);
});
*/

// Node.js listeners
process.on("unhandledRejection", e => {
  console.log(e);
});
process.on("uncaughtException", e => {
  console.log(e);
});
process.on("uncaughtExceptionMonitor", e => {
  console.log(e);
});

client.login(token);
