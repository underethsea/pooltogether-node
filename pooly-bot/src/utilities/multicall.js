const { PROVIDERS } = require( "../constants/providers")
const { MulticallWrapper } = require("ethers-multicall-provider")

async function Multicall(calls, chain) {
  try{
  const provider = MulticallWrapper.wrap(PROVIDERS[chain]);
  
  const results = await Promise.all(calls);
  return (await results).map((result) => result);
  }catch(e){console.log("Error on multicall",e)}
}

module.exports = { Multicall }