const axios = require('axios');
const fetch = require('cross-fetch');

const listJsonFiles = async (owner, repo, path) => {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  try {
    const response = await axios.get(url);
    return response.data
      .filter(item => item.type === 'file' && item.name.endsWith('.json'))
      .map(file => file.download_url);
  } catch (error) {
    console.error("Error fetching repository contents:", error);
    return [];
  }
};

const fetchAndAggregatePrizes = async (jsonUrls) => {
  const allWins = [];

  for (const url of jsonUrls) {
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.winners) {
        // Extract the vault address from the URL by getting the last part of the path before '.json'
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1]; // Gets the filename part of the URL
        const vaultAddress = fileName.split('.json')[0]; // Removes the '.json' part, leaving only the vault address

        data.winners.forEach(winner => {
          Object.entries(winner.prizes).forEach(([tier, prizeIndices]) => {
            prizeIndices.forEach(prizeIndex => {
              // Include the vault address in the key
              const key = `${vaultAddress}-${winner.user}-${tier}`;
              if (!allWins[key]) {
                allWins[key] = [];
              }
              allWins[key].push(prizeIndex);
            });
          });
        });
      }
    } catch (error) {
      console.error(`Error fetching JSON from ${url}:`, error);
    }
  }

  // Convert grouped wins to the desired format, including the vault address as the first element
  const winsToClaim = Object.entries(allWins).map(([key, prizeIndices]) => {
    const parts = key.split('-');
    const vaultAddress = parts[0];
    const user = parts[1];
    const tier = parts[2];
    return [vaultAddress, user, tier, prizeIndices];
  });

  return winsToClaim;
};

const FetchG9ApiPrizes = async (chain, prizePool, draw) => {
  try {
    const jsonFilesUrl = await listJsonFiles('GenerationSoftware', 'pt-v5-winners-testnet', `winners/vaultAccounts/${chain}/${prizePool.toLowerCase()}/draw/${draw}`);
    const aggregatedPrizes = await fetchAndAggregatePrizes(jsonFilesUrl);

    //console.log(aggregatedPrizes)
    return aggregatedPrizes;
  } catch (error) {
    console.log(error);
    return null;
  }
};


// Example usage
// FetchG9ApiPrizes(11155420,"0x31547d3c38f2f8dc92421c54b173f3b27ab26ebb",15)
module.exports = {FetchG9ApiPrizes}
