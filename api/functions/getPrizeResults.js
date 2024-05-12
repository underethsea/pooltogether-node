const { dbFinal } = require('./dbConnection');
const fs = require('fs');
const path = require('path');


async function fetchData(chainId, prizePool,  lastDraw) {

    console.log(`Fetching prize results from db chainId: ${chainId}, prizePool: ${prizePool} starting from draw: ${lastDraw}`);
    try {
        const query = `
SELECT
    d.draw,
    w.tier,
    d.tiervalues,
    COALESCE(SUM(CARDINALITY(w.prizeindices)), 0) AS total_wins,
    COALESCE(SUM(c.claim_count), 0) AS total_claims
FROM
    draws d
LEFT JOIN
    wins w ON d.draw = w.draw AND w.network = $1 AND LOWER(w.prizepool) = LOWER($3)
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) as claim_count
    FROM
        claims
    WHERE
        claims.draw = w.draw AND claims.network = w.network AND claims.tier = w.tier AND claims.vault = w.vault AND claims.winner = LOWER(w.pooler) AND  LOWER(claims.prizepool) = LOWER(w.prizepool)
) c ON true
WHERE
    d.draw >= $2 AND d.network = $1 AND LOWER(d.prizepool) = LOWER($3)
GROUP BY
    d.draw, w.tier, d.tiervalues
ORDER BY
    d.draw, w.tier;

        `;
//console.log(query,"paramas",chainId, lastDraw, prizePool)
        const result = await dbFinal.any(query, [chainId, lastDraw, prizePool]);
    
    return result;
    } catch (err) {
        console.error('Error fetching data:', err);
        return [];
    }
}
async function GetPrizeResults(chainId, prizePool) {
    const cacheFilePath = path.join(__dirname, '..', 'data', `prizeResultsCache_${chainId}_${prizePool}.json`);

    const startTime = Date.now();
    console.log("Getting prize results -----------------");
    let draws = []; // Initialize draws as an array

    try {
        // Attempt to load existing cache
        if (fs.existsSync(cacheFilePath)) {
            console.log("Cache file found. Loading...");
            const cacheContent = fs.readFileSync(cacheFilePath, 'utf8');
            draws = JSON.parse(cacheContent); // Assuming the cache structure is an array
        } else {
            console.log("No cache file found. Starting fresh.");
        }
    } catch (err) {
        console.error("Error reading from cache:", err);
    }

    const lastDraw = draws.length > 0 ? Math.max(...draws.map(d => d.draw)) : 0;
console.log("last draw in cache file",lastDraw)
    try {
        const rows = await fetchData(chainId, prizePool.toLowerCase(), lastDraw); // Fetch new data starting after the last cached draw
console.log("found ",rows.length,"new draws to include")
        rows.forEach(row => {
            let drawObj = draws.find(d => d.draw === row.draw);
            if (!drawObj) {
                drawObj = { draw: row.draw, tiers: {} };
                draws.push(drawObj);
            }

if (row.tier !== undefined && row.tiervalues && row.total_wins && row.total_claims !== undefined) {
    try {
        if (typeof row.tiervalues[row.tier] !== 'undefined' && row.tiervalues[row.tier] !== null) {
            drawObj.tiers[row.tier] = {
                value: row.tiervalues[row.tier].toString(),
                totalWins: row.total_wins.toString(),
                totalClaims: row.total_claims.toString()
            };
        } else {
            console.log(`Missing tiervalues for tier: ${row.tier} on chainId: ${chainId}`);
        }
    } catch (error) {
        console.error(`Error processing row for tier: ${row.tier} on chainId: ${chainId}`, error);
    }
} else {
    console.log(`One or more required attributes are missing in the row on chainId: ${chainId}`, row);
}

        });

        // Sort draws by draw number if necessary
        // draws.sort((a, b) => a.draw - b.draw); // Uncomment if order is important

        fs.writeFileSync(cacheFilePath, JSON.stringify(draws, null, 2));
        console.log("Cache updated. Total draws processed:", draws.length);
    } catch (err) {
        console.error("Error updating draws:", err);
    }

    const endTime = Date.now();
    console.log(`Operation completed. Total time: ${endTime - startTime}ms`);
    return draws; // Ensure all data is returned
}

module.exports = { GetPrizeResults };

// Example usage
//GetPrizeResults(11155420,"0x9f594BA8A838D41E7781BFA2aeA42702E216AF5a");
//GetPrizeResults(10,"0xe32e5E1c5f0c80bD26Def2d0EA5008C107000d6A");
