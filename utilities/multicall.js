const { PROVIDERS } = require("../constants/providers.js");
const { MulticallWrapper } = require("ethers-multicall-provider");

const {getChainConfig } = require('../chains');

const CHAINNAME = getChainConfig().CHAINNAME;

async function Multicall(calls,chain = CHAINNAME) {
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
