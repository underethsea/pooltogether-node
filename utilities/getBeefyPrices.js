const fetch = require('cross-fetch');

async function GetBeefyPrices(lpTokenNames) {
  const url = 'https://api.beefy.finance/vaults';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const vaults = await response.json();
    
    const prices = lpTokenNames.map(tokenName => {
      const lpTokenData = vaults.find(vault => vault.asset === tokenName);
      if (lpTokenData) {
        return { tokenName, price: lpTokenData.oraclePrice };
      } else {
        return { tokenName, price: 'LP token not found' };
      }
    });

    // Log or handle the prices
    console.log(prices);
    return prices; // You can also return this if you need to use the prices elsewhere in your application
  } catch (error) {
    console.error('Failed to fetch LP token prices:', error);
  }
}

// Example usage with multiple LP token names
GetBeefyPrices(['BIFI-MATIC LP', 'ETH-DAI LP']);
