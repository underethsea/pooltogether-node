async function vaultEvent(client, chainName) {
    const { ethers } = require("ethers");
    const { ADDRESS } = require("./src/constants/toucanAddress.js");
    const { ABI } = require("./src/constants/toucanAbi.js");
    const { sendVaultToDiscord } = require("./sendMessages.js");
    const { PROVIDERS } = require("./src/constants/providers.js")
    const { DISCORDADDRESS }= require("./src/constants/discordAddress.js")
 const pooltimeTesting = true
    const provider = PROVIDERS[chainName];
    const newVaultAddress = ADDRESS[chainName].VAULTFACTORY;
    const newVaultAbi = ABI.VAULTFACTORY;

    const newVaultContract = new ethers.Contract(newVaultAddress, newVaultAbi, provider);


newVaultContract.on("*", async (vaultName) => {
    try {
        console.log("NewVaultCreated event received:");
        console.log("Vault Name:", vaultName);

        const txHash = vaultName.transactionHash;
        console.log("Transaction hash: ", vaultName.transactionHash);

        const name = vaultName.args[3];
        console.log("Vault Name: ", vaultName.args[3]);

        const etherscanLink = `${ADDRESS[chainName].ETHERSCAN}/tx/${txHash}`;
        console.log("Etherscan Link:", etherscanLink);

        const transaction = await provider.getTransaction(txHash);
        const sender = transaction.from;
        console.log("Created By:", sender);

        const address = vaultName.args[0];
        console.log("Address: ", vaultName.address);

        // Send message to Discord
        sendVaultToDiscord(client, DISCORDADDRESS.POOLTOGETHER, name, etherscanLink, sender, address, chainName);
 if(pooltimeTesting){sendVaultToDiscord(client, DISCORDADDRESS.POOLTIME, name, etherscanLink, sender, address, chainName)} 
   } catch (error) {
        console.error("Error handling NewVaultCreated event:", error);
    }
});
}

module.exports = vaultEvent;

