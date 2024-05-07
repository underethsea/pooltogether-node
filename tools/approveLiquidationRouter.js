
const { CONTRACTS } = require("../constants/contracts");
const { ADDRESS } = require("../constants/address.js");
const { ethers } = require("ethers")
const { CONFIG } = require("../constants/config")

// approve the spend of POOL on the liquidation router
const prizeTokenSymbol = ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.SYMBOL
async function approve() {
  try {
    console.log("approving max spend of ",prizeTokenSymbol," on liquidation router... ")
    let approve = await CONTRACTS.PRIZETOKENWITHSIGNER[CONFIG.CHAINNAME].approve(
      ADDRESS[CONFIG.CHAINNAME].LIQUIDATIONROUTER,
      ethers.constants.MaxUint256
    );
    console.log("tx sent, waiting for receipt")
    let approveReceipt = await approve.wait();
    console.log("approved spend of ",prizeTokenSymbol," on liquidation router");
    console.log("tx ",approveReceipt.transactionHash)
  } catch (e) {
    console.log("approve of ",prizeTokenSymbol," on liquidation router failed");
    console.log(e)

  }
 finally {
    process.exit();
  }
}
approve();
