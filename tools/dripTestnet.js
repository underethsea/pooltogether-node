const { CONTRACTS } = require("../constants/contracts");
const { ADDRESS } = require("../constants/address.js");
const { ethers } = require("ethers")
const { CONFIG } = require("../constants/config")

const prizeToken = ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.SYMBOL
// drip POOL to use for liquidating on testnet
   async function drip() {
    console.log("requesting",prizeToken," from faucet..")
    try {
      let drip = await CONTRACTS.TOKENFAUCET[CONFIG.CHAINNAME].drip(
        ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.ADDRESS
      );
      let dripReceipt = await drip.wait();
      console.log(prizeToken," dripped to wallet");
      console.log("tx hash ", dripReceipt.transactionHash);
  
    } catch (e) {
      console.log(prizeToken," drip failed.");
      console.log(e);

    }
}
drip()
