const fetch = require('cross-fetch');

const fetchWinnersJsonFile = async (owner, repo, chain, prizePool, draw) => {
  const path = `winners/vaultAccounts/${chain}/${prizePool}/draw/${draw}/winners.json`;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.content) {
      const decodedContent = JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
      return decodedContent;
    } else {
      console.error("Expected content but received:", data);
      return null;
    }
  } catch (error) {
    console.error("Error fetching JSON file:", error);
    return null;
  }
};

const fetchAndAggregatePrizes = async (data) => {
  const allWins = {};

  for (const [vaultAddress, winners] of Object.entries(data)) {
    winners.forEach(winner => {
      const { user, prizes } = winner;

      for (const [tier, prizeIndices] of Object.entries(prizes)) {
        const key = `${vaultAddress}-${user}-${tier}`;
        if (!allWins[key]) {
          allWins[key] = [];
        }
        allWins[key].push(...prizeIndices);
      }
    });
  }

  const winsToClaim = Object.entries(allWins).map(([key, prizeIndices]) => {
    const [vaultAddress, user, tier] = key.split('-');
    return [vaultAddress, user, tier, prizeIndices];
  });

  return winsToClaim;
};

const FetchG9ApiPrizes = async (chain, prizePool, draw) => {
  try {
    const jsonData = await fetchWinnersJsonFile('GenerationSoftware', 'pt-v5-winners', chain, prizePool.toLowerCase(), draw);
    if (jsonData) {
      const aggregatedPrizes = await fetchAndAggregatePrizes(jsonData);
      console.log(aggregatedPrizes);
      return aggregatedPrizes;
    } else {
      return null;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
};

// Example usage
//FetchG9ApiPrizes(10, "0xf35fe10ffd0a9672d0095c435fd8767a7fe29b55", 99);

module.exports = { FetchG9ApiPrizes };
