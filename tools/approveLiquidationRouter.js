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



const { CONTRACTS } = require("../constants/contracts");
const { ADDRESS } = require("../constants/address.js");
const { ethers } = require("ethers")

// approve the spend of POOL on the liquidation router
const prizeTokenSymbol = ADDRESS[CHAINNAME].PRIZETOKEN.SYMBOL
async function approve() {
  try {
    console.log("approving max spend of ",prizeTokenSymbol," on liquidation router... ")
    let approve = await CONTRACTS.PRIZETOKENWITHSIGNER[CHAINNAME].approve(
      ADDRESS[CHAINNAME].LIQUIDATIONROUTER,
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
