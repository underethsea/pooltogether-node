require('dotenv').config(); // Load environment variables from .env
const { ethers } = require('ethers');
const { SendMessageToChannel } = require('./functions/discordAlert'); // Discord notification function

// Alchemy URLs for each chain
const ALCHEMY_URLS = {
  BASE: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  OPTIMISM: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
  ARBITRUM: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
};

// Contract addresses
const CONTRACT_ADDRESSES = {
  BASE: '0x45b2010d8a4f08b53c9fa7544c51dfd9733732cb',
  OPTIMISM: '0xF35fE10ffd0a9672d0095c435fd8767A7fe29B55',
  ARBITRUM: '0x52e7910c4c287848c8828e8b17b8371f4ebc5d42',
};

// Minimal ABI with only the `SwappedExactAmountOut` event
const ABI = [
  "event SwappedExactAmountOut(address indexed sender, address indexed receiver, uint256 amountOut, uint256 amountInMax, uint256 amountIn, bytes flashSwapData)",
];

// Event topic for `SwappedExactAmountOut`
const EVENT_TOPIC = ethers.utils.id(
  "SwappedExactAmountOut(address,address,uint256,uint256,uint256,bytes)"
);

// Discord channel ID for notifications
const DISCORD_CHANNEL_ID = '1314349608096366633';

// Create a provider for each chain
const providers = {
  BASE: new ethers.providers.JsonRpcProvider(ALCHEMY_URLS.BASE),
  OPTIMISM: new ethers.providers.JsonRpcProvider(ALCHEMY_URLS.OPTIMISM),
  ARBITRUM: new ethers.providers.JsonRpcProvider(ALCHEMY_URLS.ARBITRUM),
};

// Listen for events on each chain
async function listenForEvents(chainName) {
  const provider = providers[chainName];
  const contractAddress = CONTRACT_ADDRESSES[chainName];

  console.log(`Listening for SwappedExactAmountOut events on ${chainName}...`);

  provider.on(
    {
      address: contractAddress,
      topics: [EVENT_TOPIC],
    },
    async (log) => {
      try {
        // Decode the log data
        const iface = new ethers.utils.Interface(ABI);
        const decodedLog = iface.parseLog(log);

        const sender = decodedLog.args.sender;
        const amountIn = decodedLog.args.amountIn;

        // Format sender and amountIn
        const formattedSender = sender.slice(0, 6);
        const formattedAmountIn = ethers.utils.formatEther(amountIn);

        // Prepare Discord message
        const message = `${chainName}: ${formattedSender} ${formattedAmountIn}`;
        console.log(`Event detected: ${message}`);

        // Send to Discord
        await SendMessageToChannel(DISCORD_CHANNEL_ID, message);
      } catch (error) {
        console.error(`Error handling event on ${chainName}:`, error);
      }
    }
  );
}

// Start listeners for all chains
async function main() {
  try {
    for (const chainName of Object.keys(providers)) {
      listenForEvents(chainName);
    }
  } catch (error) {
    console.error("Error starting event listeners:", error);
  }
}

main();
