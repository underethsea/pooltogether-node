const fetch = require("cross-fetch");

const FetchG9ApiPrizes = async (chain, prizePool, draw) => {
    try {
        const url = `https://raw.githubusercontent.com/GenerationSoftware/pt-v5-draw-results-testnet/main/prizes/${chain}/${prizePool.toLowerCase()}/draw/${draw}/prizes.json`;
        const fetchPrizes = await fetch(url);
        const prizesResult = await fetchPrizes.json();

        // Group wins by vault, winner, and tier
        const groupedWins = {};
        prizesResult.forEach((win) => {
            const key = `${win.vault}-${win.winner}-${win.tier}`;
            if (!groupedWins[key]) {
                groupedWins[key] = [];
            }
            groupedWins[key].push(win.prizeIndex);
        });

        // Convert grouped wins to desired format
        const winsToClaim = Object.entries(groupedWins).map(([key, prizeIndices]) => {
            const [vault, winner, tier] = key.split('-');
            return [vault, winner, tier, prizeIndices];
        });
console.log(winsToClaim)
        return winsToClaim;
    } catch (error) {
        console.log(error);
        return null;
    }
};

module.exports = { FetchG9ApiPrizes };


//example
FetchG9ApiPrizes(11155420,"0x5e1b40e4249644a7d7589d1197ad0f1628e79fb1",10)
