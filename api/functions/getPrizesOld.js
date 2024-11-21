const ethers = require("ethers");
const NodeCache = require("node-cache");
const { ABI } = require("../constants/abi");
const { PROVIDERS } = require("../../constants/providers");

// Initialize NodeCache
const cache = new NodeCache();

async function GetPrizes(chainName, prizepoolAddress, cacheDuration = 600) {
  const cacheKey = `${chainName}-${prizepoolAddress}`;
  
  // Check if the data is already in the cache
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Returning cached data for ${cacheKey}`);
    return cachedData;
  }

  const prizepoolContract = new ethers.Contract(prizepoolAddress, ABI.PRIZEPOOLFINAL, PROVIDERS[chainName]);

  try {
    const [
      drawPeriodSeconds,
      nextDrawId,
      numberOfTiers,
      prizetokenAddress
    ] = await Promise.all([
      prizepoolContract.drawPeriodSeconds(),
      prizepoolContract.getOpenDrawId(),
      prizepoolContract.numberOfTiers(),
      prizepoolContract.prizeToken()
    ]);

    const prizeTokenContract = new ethers.Contract(prizetokenAddress, ABI.ERC20, PROVIDERS[chainName]);
    const prizePoolPrizeBalance = await prizeTokenContract.balanceOf(prizepoolAddress);
    
    let tierData = [];
    const multicallData = [];

    const numberOfTotalTiers = Number(numberOfTiers) || 0;
    for (let q = 0; q < numberOfTotalTiers; q++) {
      multicallData.push(prizepoolContract.getTierPrizeSize(q));
      multicallData.push(prizepoolContract.functions['getTierPrizeCount(uint8)'](q));
      multicallData.push(prizepoolContract.getTierRemainingLiquidity(q));
      
      tierData.push({
        tier: q,
        value: 0,
        count: 0,
        liquidity: 0
      });
    }

    const results = await Promise.all(multicallData);

    for (let i = 0; i < numberOfTotalTiers; i++) {
      const index = i * 3;
      tierData[i].value = parseFloat(ethers.utils.formatUnits(results[index], 18));
      tierData[i].count = parseFloat(results[index + 1].toString());
      tierData[i].liquidity = parseFloat(ethers.utils.formatUnits(results[index + 2], 18));
    }

    const data = {
      drawPeriodSeconds,
      nextDrawId,
      numberOfTiers,
      prizePoolPrizeBalance: prizePoolPrizeBalance.toString(),
      tierData
    };

    // Store the result in the cache
    cache.set(cacheKey, data, cacheDuration);

    return data;
  } catch (error) {
    console.error(`Failed to get prizes for ${prizepoolAddress} on ${chainName}:`, error);
    return null;
  }
}

module.exports = { GetPrizes };
