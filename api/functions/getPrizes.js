const ethers = require("ethers");
const NodeCache = require("node-cache");
const fetch = require("node-fetch");
const { ABI } = require("../constants/abi");
const { PROVIDERS } = require("../../constants/providers");
const { ADDRESS } = require("../../constants/address");

// Initialize NodeCache
const cache = new NodeCache();

async function fetchTokenPriceInETH(geckoId) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=eth`;
  const response = await fetch(url);
  const data = await response.json();
  return data[geckoId]?.eth || 0;
}

async function GetPrizes(chainName, prizepoolAddress, cacheDuration = 600) {
  const cacheKey = `${chainName}-${prizepoolAddress}`;

  // Check if the data is already in the cache
  const cachedData = cache.get(cacheKey);
  if (cachedData) {
    console.log(`Returning cached data for ${cacheKey}`);
    return cachedData;
  }

  const prizepoolContract = new ethers.Contract(prizepoolAddress, ABI.PRIZEPOOL, PROVIDERS[chainName]);

  try {
    const [
      drawPeriodSeconds,
      nextDrawId,
      numberOfTiers,
      firstDrawTime,
    ] = await Promise.all([
      prizepoolContract.drawPeriodSeconds(),
      prizepoolContract.getOpenDrawId(),
      prizepoolContract.numberOfTiers(),
      prizepoolContract.firstDrawOpensAt(),
    ]);

    // Get prize token details from ADDRESS[chainName].PRIZETOKEN
    const { SYMBOL: prizeTokenSymbol, GECKO: geckoId } = ADDRESS[chainName].PRIZETOKEN;

    const prizeTokenContract = new ethers.Contract(ADDRESS[chainName].PRIZETOKEN.ADDRESS, ABI.ERC20, PROVIDERS[chainName]);
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

    let ethPrice = 1; // Default multiplier (for WETH or ETH)
    if (prizeTokenSymbol.toLowerCase() !== "weth") {
      ethPrice = await fetchTokenPriceInETH(geckoId);
    }

    // Convert the prizePoolPrizeBalance to ETH if necessary
    const convertedPrizePoolPrizeBalance = parseFloat(ethers.utils.formatUnits(prizePoolPrizeBalance, 18)) * ethPrice;

    // Correctly convert the tier values to ETH
    tierData = tierData.map(tier => ({
      ...tier,
      value: tier.value * ethPrice, // Multiply each tier's value by the ETH price
      liquidity: tier.liquidity * ethPrice // Convert liquidity as well
    }));

    const data = {
      drawPeriodSeconds,
      nextDrawId,
      firstDrawTime: parseInt(firstDrawTime.toString()),
      numberOfTiers,
      prizePoolPrizeBalance: convertedPrizePoolPrizeBalance.toString(),
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
