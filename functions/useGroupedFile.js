// localWinnersReader.js

const fs = require("fs");
const path = require("path");

const fetchAndAggregatePrizes = async (data) => {
  const allWins = {};

  for (const [vaultAddress, winners] of Object.entries(data)) {
    winners.forEach((winner) => {
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
    const [vaultAddress, user, tier] = key.split("-");
    return [vaultAddress, user, tier, prizeIndices];
  });

  return winsToClaim;
};

const FetchG9ApiPrizes = async () => {
  try {
    const filePath = path.join(__dirname, "groupedWinners.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const jsonData = JSON.parse(rawData);

    const aggregatedPrizes = await fetchAndAggregatePrizes(jsonData);
    console.log(aggregatedPrizes);
    return aggregatedPrizes;
  } catch (error) {
    console.error("Error reading or processing groupedWinners.json:", error);
    return null;
  }
};

// Example usage
// FetchG9ApiPrizes();

module.exports = { FetchG9ApiPrizes };
