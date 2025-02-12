require('../env-setup');
const { ethers } = require('ethers');
const { Client, GatewayIntentBits, Partials } = require('discord.js');
console.log("process",process.env)
const client = new Client({
  partials: [Partials.Channel],
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});
const CHECK_INTERVAL_MINUTES = 720; // Define how often to check balances
        const alertChannel = '1225048554708406282'; // Replace with your Discord channel ID

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

// Define the constants for each chain
const chains = {
  SCROLL: {
    rpcEndpoint: `https://rpc.scroll.io`,
    wallet: '0x67CdC1dC837e0d6362bf046E1195C7aCD08Af06d',
    swapper: '0xf152CEC8B04695705772012764D2ABE2e5cbfd38',
    wethAddress: '0x5300000000000000000000000000000000000004',
    alertThreshold: ethers.utils.parseEther("0.015"), // Alert if ETH balance < 0.1
  },
  OPTIMISM: {
    rpcEndpoint: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
    wallet: '0x67CdC1dC837e0d6362bf046E1195C7aCD08Af06d',
    swapper: '0xf152CEC8B04695705772012764D2ABE2e5cbfd38',
    wethAddress: '0x4200000000000000000000000000000000000006',
    alertThreshold: ethers.utils.parseEther("0.015"),
  },
  BASE: {
    rpcEndpoint: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
    wallet: '0x67CdC1dC837e0d6362bf046E1195C7aCD08Af06d',
    swapper: '0xf152CEC8B04695705772012764D2ABE2e5cbfd38',
    wethAddress: '0x4200000000000000000000000000000000000006',
    alertThreshold: ethers.utils.parseEther("0.015"),
  },
  ARBITRUM: {
    rpcEndpoint: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
    wallet: '0x67CdC1dC837e0d6362bf046E1195C7aCD08Af06d',
    swapper: '0xf152CEC8B04695705772012764D2ABE2e5cbfd38',
    wethAddress: '0x82aF49447D8a07e3bd95BD0D56f35241523fBab1',
    alertThreshold: ethers.utils.parseEther("0.015"),
  },
  ETHEREUM: {
    rpcEndpoint: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
    wallet: '0x67CdC1dC837e0d6362bf046E1195C7aCD08Af06d',
    swapper: '0xf152CEC8B04695705772012764D2ABE2e5cbfd38',
    wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    alertThreshold: ethers.utils.parseEther("0.015"),
  },
};

// Discord alert function
async function SendMessageToChannel(channelId, message) {
  try {
    const channel = await client.channels.fetch(channelId, { force: true });
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

// Monitor balances and send alerts
async function monitorBalances() {
  console.log(`Starting balance check at ${new Date().toISOString()}`);

  for (const [chainName, chainInfo] of Object.entries(chains)) {
    const provider = new ethers.providers.JsonRpcProvider(chainInfo.rpcEndpoint);

    try {
      // Check ETH balance
      const walletEthBalance = await provider.getBalance(chainInfo.wallet);
      console.log(`${chainName} - ETH balance: ${ethers.utils.formatEther(walletEthBalance)} ETH`);

      if (walletEthBalance.lt(chainInfo.alertThreshold)) {
        console.log(`${chainName} - ETH balance is below threshold! Fetching additional balances...`);

        // Fetch WETH balance
        const wethContract = new ethers.Contract(chainInfo.wethAddress, ERC20_ABI, provider);
        const walletWethBalance = await wethContract.balanceOf(chainInfo.wallet);
        const swapperWethBalance = await wethContract.balanceOf(chainInfo.swapper);

        // Send alert
        const alertMessage = `
**Alert on ${chainName}**:
- ETH Balance: ${ethers.utils.formatEther(walletEthBalance)} ETH
- Wallet WETH Balance: ${ethers.utils.formatEther(walletWethBalance)} WETH
- Swapper WETH Balance: ${ethers.utils.formatEther(swapperWethBalance)} WETH
        `;
        await SendMessageToChannel(alertChannel, alertMessage);
      }
    } catch (error) {
      console.error(`Error fetching balances on ${chainName}:`, error);
    }
  }

  console.log(`Balance check complete at ${new Date().toISOString()}`);
}

// Schedule the monitor to run periodically
setInterval(monitorBalances, CHECK_INTERVAL_MINUTES * 60 * 1000);

// Run the script immediately
monitorBalances();

// Discord bot login
client.login(process.env.BOT_KEY);
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});
client.on('error', (error) => {
  console.error("Discord client encountered an error:", error);
});
