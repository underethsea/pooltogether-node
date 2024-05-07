const { ethers } = require("ethers");
const { PROVIDERS } = require("../constants/providers.js");
const { CONFIG } = require("../constants/config.js");
const { MulticallWrapper } = require("ethers-multicall-provider");

async function Multicall(calls,chain = CONFIG.CHAINNAME) {
  try{
  const provider = MulticallWrapper.wrap(PROVIDERS[chain]);

  const results = Promise.all(calls);
  return (await results).map((result) => result);
  }catch (error) {
    console.error("Multicall error:", error);
    throw error; // Throw the error to trigger the retry mechanism
  }
}


module.exports = { Multicall };
