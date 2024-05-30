const { ethers } = require('ethers');
const { PROVIDERS } = require("../constants/providers")
require('../env-setup');
const { GasEstimate } = require("../utilities/gas")

const WETH_ABI = [
  // Only the functions we need
  "function deposit() public payable",
  "function withdraw(uint wad) public",
  "function balanceOf(address owner) public view returns (uint256)"
];

const WETH_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"; // WETH address

async function depositETHToWETH() {
  // Connect to the Ethereum network
  //const provider = new ethers.providers.InfuraProvider('mainnet', 'YOUR_INFURA_PROJECT_ID');
  const provider = PROVIDERS["ARBITRUM"]

  // Create a wallet instance
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Create a contract instance
  const wethContract = new ethers.Contract(WETH_ADDRESS, WETH_ABI, wallet);

  // Define the amount of ETH to deposit (in this case, 0.1 ETH)
  const amount = ethers.utils.parseEther('0.0001');
  const gasEstimate = await GasEstimate(wethContract,"deposit",[])
  console.log(gasEstimate.toString())
 
  // Deposit ETH to get WETH
  const tx = await wethContract.deposit({ value: amount });

  // Wait for the transaction to be mined
  await tx.wait();

  console.log(`Deposited ${ethers.utils.formatEther(amount)} ETH to WETH`);

  // Check WETH balance
  const balance = await wethContract.balanceOf(wallet.address);
  console.log(`WETH Balance: ${ethers.utils.formatEther(balance)} WETH`);
}

depositETHToWETH().catch(console.error);
