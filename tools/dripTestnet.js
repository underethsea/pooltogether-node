const { loadChainConfig, getChainConfig } = require("../chains");

const chainKey = process.argv[2] || "";

try {
  // Load the configuration with the provided chainKey or default
  loadChainConfig(chainKey);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`);
  process.exit(1);
}


const { CONTRACTS } = require("../constants/contracts");
const { ADDRESS } = require("../constants/address.js");
// const { ethers } = require("ethers")
// const { CONFIG } = require("../constants/config")

const CHAINNAME = getChainConfig().CHAINNAME;

 const prizeToken = ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS
//const prizeToken = "0x45B32D0C3Cf487e11C3b80AF564878bea83cCe67"
// drip POOL to use for liquidating on testnet
   async function drip() {
    console.log("requesting",ADDRESS[CHAINNAME].PRIZETOKEN.SYMBOL," from faucet..")
    try {
      let drip = await CONTRACTS.TOKENFAUCET[CHAINNAME].drip(
prizeToken      );
      let dripReceipt = await drip.wait();
      console.log(prizeToken," dripped to wallet");
      console.log("tx hash ", dripReceipt.transactionHash);
  
    } catch (e) {
      console.log(prizeToken," drip failed.");
      console.log(e);

    }
}
drip()
