const { ethers } = require('ethers');
const { SIGNER } = require('../constants/providers')
// Replace with your recipient's address and the amount in wei
const recipientAddress = ''; // Replace with the recipient's address
const amountInWei = ethers.utils.parseEther('0.00001'); // Replace with the amount in ether

async function sendETH() {
  try {
    // Connect to your signer (assuming SIGNER is already configured)

    // Check your wallet's balance
    const balance = await SIGNER.getBalance();
    console.log(`Your wallet's balance: ${ethers.utils.formatEther(balance)} ETH`);

    // Send ETH to the recipient
    const tx = await SIGNER.sendTransaction({
      to: recipientAddress,
      value: amountInWei,
maxPriorityFeePerGas: "1010000"
	
    });

    console.log(`Transaction hash: ${tx.hash}`);
    console.log(`Sent ${ethers.utils.formatEther(amountInWei)} ETH to ${recipientAddress}`);
  } catch (error) {
    console.error('Error sending ETH:', error);
  }
}

sendETH();
