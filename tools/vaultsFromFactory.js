// todo logs doesnt work
const { loadChainConfig, getChainConfig } = require("../chains");

const chainKey = process.argv[2] || "";

try {
  // Load the configuration with the provided chainKey or default
  loadChainConfig(chainKey);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`);
  process.exit(1);
}
const CHAINNAME = getChainConfig().CHAINNAME;

const { ethers } = require("ethers");
const { CONTRACTS } = require("../constants/contracts")
const { ADDRESS } = require("../constants/address")
const { ABI } = require("../constants/abi")
const { PROVIDERS } = require("../constants/providers")

async function getNewVaultAddresses(chain) {
  // Define the contract object for the Vault Factory
  const vaultFactory = new ethers.Contract(ADDRESS[chain].VAULTFACTORY,ABI.VAULTFACTORY,PROVIDERS[chain])
  // Define the event signature for NewPrizeVault
  const eventSignature = ethers.utils.id("NewPrizeVault(address,address,address,string,string)");

  // Create a filter for the NewPrizeVault event
  const filter = {
    address: vaultFactory.address,
    topics: [eventSignature]
  };

  // Query the event logs
  const logs = await vaultFactory.provider.getLogs(filter);
console.log(logs)
  // Extract the new vault addresses from the logs
  const newVaultAddresses = logs.map(log => {
    const decodedLog = ethers.utils.defaultAbiCoder.decode(
      ["address", "address", "address", "string", "string"],
      log.data
    );
    return decodedLog[0]; // The first address is the new vault address
  });

  return newVaultAddresses;
}

// Example usage:
async function main() {
  //const chain = "your_chain_here"; // Replace with your chain identifier
  const newVaultAddresses = await getNewVaultAddresses(CHAINNAME);
  console.log(newVaultAddresses);
}

main().catch(console.error);
