const { Alchemy, Network } = require('alchemy-sdk');

// Load environment variables
require('dotenv').config();

// Mapping CHAINNAME to Alchemy SDK Network
const alchemyNetworkMap = {
  BASE: Network.BASE_MAINNET,
  OPTIMISM: Network.OPT_MAINNET,
  SCROLL: Network.SCROLL_MAINNET,
  ARBITRUM: Network.ARB_MAINNET,
  ETHEREUM: Network.ETH_MAINNET,
  GNOSIS: Network.GNOSIS_MAINNET // <== Add GNOSIS network
};

// Define the chain name
const CHAINNAME = "GNOSIS"; // Change this if testing another chain
const alchemyNetwork = alchemyNetworkMap[CHAINNAME];

if (!alchemyNetwork) {
  console.error(`No Alchemy network mapping found for chain: ${CHAINNAME}`);
  process.exit(1);
}

// Configure Alchemy
const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_KEY,
  network: alchemyNetwork
});

// Define a test event filter (we assume Gnosis supports these events)
const TEST_FILTER = {
  address: "0x0000000000000000000000000000000000000000", // Dummy address (change to actual contract)
  topics: [] // Empty topics to listen to all events
};

// Function to check WebSocket connectivity
async function checkWebSocket() {
  console.log(`Checking Alchemy WebSocket for ${CHAINNAME}...`);

  try {
    // Set a timeout to determine if the connection is responsive
    const timeout = setTimeout(() => {
      console.error("WebSocket connection timed out.");
      process.exit(1);
    }, 10000); // 10 seconds timeout

    // Try to listen to an event
    alchemy.ws.on(TEST_FILTER, async (event) => {
      console.log("WebSocket event received:", event);
      clearTimeout(timeout);
      console.log(`✅ WebSocket works on ${CHAINNAME}!`);
      process.exit(0);
    });

    console.log(`Listening for test events on ${CHAINNAME}...`);
  } catch (error) {
    console.error(`❌ WebSocket failed on ${CHAINNAME}:`, error.message);
    process.exit(1);
  }
}

// Run the check
checkWebSocket();
