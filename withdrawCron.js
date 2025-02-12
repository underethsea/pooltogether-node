const { loadChainConfig, getChainConfig } = require("./chains");

const chainKey = process.argv[2] || "";

try {
  // Load the configuration with the provided chainKey or default
  loadChainConfig(chainKey);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`);
  process.exit(1);
}

const CHAINNAME = getChainConfig().CHAINNAME;

require("dotenv").config();
const ethers = require("ethers");
const { GasEstimate } = require("./utilities/gas");
const { PROVIDERS } = require("./constants/providers")
const { CONFIG } = require("./constants/config")

// Configuration Variables

// scroll
/*const CHECK_INTERVAL_MINUTES = 120; // Interval to run the script (in minutes)
const WITHDRAW_THRESHOLD = ethers.utils.parseEther("0.0075"); // Minimum balance to trigger withdrawal
const GAS_COST_THRESHOLD = ethers.utils.parseEther("0.00002"); // Maximum gas cost to allow withdrawal
const VAULT_ADDRESS = "0xfeb0fe9850aba3a52e72a8a694d422c2b47a5888"; // Replace with your Vault address
*/
// gnosis

const CHECK_INTERVAL_MINUTES = 120; // Interval to run the script (in minutes)
const WITHDRAW_THRESHOLD = ethers.utils.parseEther("50"); // Minimum balance to trigger withdrawal
const GAS_COST_THRESHOLD = ethers.utils.parseEther("0.000002"); // Maximum gas cost to allow withdrawal
const VAULT_ADDRESS = "0xbb7e99abccce01589ad464ff698ad139b0705d90"; // Replace with your Vault address


// Retrieve wallet and private key from .env
const WALLET_ADDRESS = process.env.WALLET;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
let PRIORITYFEE = CONFIG.PRIORITYFEE
if (CHAINNAME === "GNOSIS") {
  PRIORITYFEE = "1.5";
}
let PRIORITYFEEPARSED = ethers.utils.parseUnits(PRIORITYFEE, 9).toString();
// ABI for withdraw function
const WITHDRAW_ABI = [
  "function withdraw(uint256 assets, address receiver, address owner,uint256 maxShares) external returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"

];

async function simulateAndWithdraw() {
  try {
    console.log("Starting withdrawal check...");
    console.log(`Retry interval: ${CHECK_INTERVAL_MINUTES} minutes`);
    console.log(`Withdrawal threshold: ${ethers.utils.formatEther(WITHDRAW_THRESHOLD)} ETH`);
    console.log(`Gas cost threshold: ${ethers.utils.formatEther(GAS_COST_THRESHOLD)} ETH`);
    const provider = PROVIDERS[CHAINNAME]
    //const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL); // Add your RPC URL to .env
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const vaultContract = new ethers.Contract(VAULT_ADDRESS, WITHDRAW_ABI, signer);

    // Check wallet balance in the vault
    const walletBalance = await vaultContract.balanceOf(WALLET_ADDRESS);
    console.log("Wallet balance in vault:", ethers.utils.formatEther(walletBalance));

    // Check if wallet balance exceeds the withdrawal threshold
    if (walletBalance.lt(WITHDRAW_THRESHOLD)) {
      console.log("Balance is below the withdrawal threshold. Skipping...");
      return;
    }
console.log(walletBalance.toString(), WALLET_ADDRESS, WALLET_ADDRESS, walletBalance)
    // Simulate the withdrawal to estimate gas cost
console.log("getting gas est")
const gasEstimate = await GasEstimate(
      vaultContract,
      "withdraw",
      [walletBalance.toString(), WALLET_ADDRESS, WALLET_ADDRESS, walletBalance.toString()],
      CONFIG.PRIORITYFEE
    );
//    const gasCost = gasEstimate.mul(await provider.getGasPrice());
  //  console.log("Estimated gas cost (ETH):", ethers.utils.formatEther(gasCost));

    // Check if the gas cost is within the acceptable threshold
    if (gasEstimate.gt(GAS_COST_THRESHOLD)) {
      console.log("Gas cost exceeds the threshold. Skipping...");
      return;
    }

    // Perform the withdrawal
    const vaultWithSigner = vaultContract.connect(signer);
    const tx = await vaultWithSigner.withdraw(walletBalance, WALLET_ADDRESS, WALLET_ADDRESS, walletBalance, {
      gasLimit: 800000, // Adjust gas limit as needed
                             maxPriorityFeePerGas: PRIORITYFEEPARSED,
      });
    console.log("Withdrawal transaction sent:", tx.hash);

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log("Withdrawal confirmed:", receipt.transactionHash);
  } catch (error) {
    console.error("Error during withdrawal:", error);
  }
}

// Run the script periodically
setInterval(simulateAndWithdraw, CHECK_INTERVAL_MINUTES * 60 * 1000);
simulateAndWithdraw();
