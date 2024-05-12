const fetch = require('node-fetch');
const logDiscrepancies = true
async function comparePrizeData(chainId, prizePoolAddress, drawNumber) {
    try {
        // Construct URLs for fetching data from GitHub, poolexplorer.xyz, and claims
        const githubUrl = `https://raw.githubusercontent.com/GenerationSoftware/pt-v5-draw-results-mainnet/main/prizes/${chainId}/${prizePoolAddress}/draw/${drawNumber}/prizes.json`;
        const poolexplorerUrl = `https://poolexplorer.xyz/${chainId}-${prizePoolAddress}-draw${drawNumber}`;
        const claimsUrl = `https://poolexplorer.xyz/claims-${chainId}-${prizePoolAddress}-draw${drawNumber}`;

        // Fetch data from GitHub
        let githubPrizes = [];
        try {
            const githubResponse = await fetch(githubUrl);
            if (githubResponse.ok) {
                const githubData = await githubResponse.json();
                githubPrizes = githubData.map(entry => ({
                    vault: entry.vault,
                    winner: entry.winner,
                    tier: entry.tier,
                    prizeIndex: entry.prizeIndex
                }));
            }
        } catch (error) {
            console.error('Error fetching data from GitHub:', error);
        }

        // Fetch data from poolexplorer.xyz
        let poolexplorerPrizes = [];
        try {
            const poolexplorerResponse = await fetch(poolexplorerUrl);
            if (poolexplorerResponse.ok) {
                const poolexplorerData = await poolexplorerResponse.json();
                poolexplorerPrizes = poolexplorerData.wins.flatMap(entry => entry.i.map(prizeIndex => ({
                    vault: entry.v,
                    winner: entry.p,
                    tier: entry.t,
                    prizeIndex: prizeIndex
                })));
            }
        } catch (error) {
            console.error('Error fetching data from poolexplorer.xyz:', error);
        }

        // Fetch claims data from poolexplorer.xyz
        let claimsData = [];
        try {
            const claimsResponse = await fetch(claimsUrl);
            if (claimsResponse.ok) {
                const claimsJson = await claimsResponse.json();
                claimsData = claimsJson.map(claim => ({
                    vault: claim.v,
                    winner: claim.w,
                    tier: claim.t.toString(),
                    prizeIndex: claim.i.toString(),
                }));
            }
        } catch (error) {
            console.error('Error fetching claims data from poolexplorer.xyz:', error);
        }

        // Output results
        console.log(`Draw ${drawNumber}:`);
        console.log('Total prizes reported by GitHub:', githubPrizes.length);
        console.log('Total prizes reported by poolexplorer.xyz:', poolexplorerPrizes.length);

        // Compare prizes and find discrepancies
        const githubSet = new Set(githubPrizes.map(prize => JSON.stringify(prize)));
        const poolexplorerSet = new Set(poolexplorerPrizes.map(prize => JSON.stringify(prize)));

        const githubDiscrepancies = githubPrizes.filter(prize => !poolexplorerSet.has(JSON.stringify(prize)));
        const poolexplorerDiscrepancies = poolexplorerPrizes.filter(prize => !githubSet.has(JSON.stringify(prize)));

        // Output discrepancies
        if(logDiscrepancies){
        console.log(`cabana github has ${githubDiscrepancies.length} prizes that pooltime does not`)
        githubDiscrepancies.forEach(discrepancy => {
            const claimed = claimsData.some(claim =>
                claim.vault === discrepancy.vault &&
                claim.winner === discrepancy.winner &&
                parseInt(claim.tier) === parseInt(discrepancy.tier) &&
                parseInt(claim.prizeIndex) === parseInt(discrepancy.prizeIndex)
            );
            console.log(`  vault ${discrepancy.vault} winner ${discrepancy.winner} tier ${discrepancy.tier} index ${discrepancy.prizeIndex} ${claimed ? 'CLAIMED' : ''}`);
        });
        console.log(`poolexplorer has ${poolexplorerDiscrepancies.length} prizes that cabana github does not`)
        poolexplorerDiscrepancies.forEach(discrepancy => {
            const claimed = claimsData.some(claim =>
                claim.vault === discrepancy.vault &&
                claim.winner === discrepancy.winner &&
                parseInt(claim.tier) === parseInt(discrepancy.tier) &&
                parseInt(claim.prizeIndex) === parseInt(discrepancy.prizeIndex)
            );
            console.log(` vault ${discrepancy.vault} winner ${discrepancy.winner} tier ${discrepancy.tier} index ${discrepancy.prizeIndex} ${claimed ? 'CLAIMED' : ''}`);
        });}
    } catch (error) {
        console.error('Error:', error);
    }
}

// Example usage:
comparePrizeData('10', '0xe32e5e1c5f0c80bd26def2d0ea5008c107000d6a', 152);
const go = async () =>{for(x=1;x<140;x++){
await comparePrizeData('10', '0xe32e5e1c5f0c80bd26def2d0ea5008c107000d6a',x)
}}
//go()
//
