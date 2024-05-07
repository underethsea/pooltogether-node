const { CONTRACTS } = require("./constants/contracts");
const { ADDRESS, ADDRESS_AUCTION } = require("./constants/address.js");
const { ethers } = require("ethers")
const { CONFIG } = require("./constants/config")
const { PROVIDERS } = require("./constants/providers")

// approve the spend of POOL on the liquidation router

async function approve() {
  try {
    const gasPrice = await PROVIDERS.MAINNET.getGasPrice()
console.log("gas price",gasPrice)
// return
    console.log("approving max spend of POOL on liquidation router... ")
    let approve = await CONTRACTS.LINKSIGNER.approve(
      ADDRESS_AUCTION.MAINNET.CHAINLINKDIRECTAUCTIONHELPER,
      ethers.constants.MaxUint256,{gasPrice:gasPrice}
    );
    console.log("tx sent, waiting for receipt")
    let approveReceipt = await approve.wait();
    console.log("approved spend of LINK on auction");
    console.log("tx ",approveReceipt.transactionHash)
  } catch (e) {
    console.log("approve of LINK on auction failed");
    console.log(e)

  }
}
approve();
