const fetch = require('node-fetch');

const Prizes = async () => {
  try {
    const response = await fetch('https://poolexplorer.xyz/overview');
    const data = await response.json();
    const prizeData = data.pendingPrize;
    const ethereumPrice = data.prices.geckos.ethereum;

    // Calculate total prize in Ether
    const totalPrize = Object.values(prizeData).reduce((acc, prize) => {
      return acc + parseInt(prize.total) / 1e18;
    }, 0);

    const totalPrizeInDollars = totalPrize * ethereumPrice;

    const sortedPrizes = Object.entries(prizeData).sort(
      ([, a], [, b]) => parseInt(b.total) - parseInt(a.total)
    );

    return {
      ethereumPrice,
      totalPrizeInDollars,
      prizes: sortedPrizes.map(([chain, prizeData]) => {
        const tier0 = prizeData.prizes.tierData.find((tier) => tier.tier === 0);
        const tier1 = prizeData.prizes.tierData.find((tier) => tier.tier === 1);

        return {
          chain,
          totalPrize: parseInt(prizeData.total) / 1e18,
          tier0Prize: tier0 ? tier0.value : null,
          tier1Prize: tier1 ? tier1.value : null,
        };
      }),
    };
  } catch (error) {
    console.error('Error fetching prize data:', error);
    return null;
  }
};

module.exports = Prizes;
