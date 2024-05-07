// Assuming this is in a CommonJS module file
const fs = require('fs');
const BATCH_SIZE = 500; // 0 means no batching.  batching can now be done on the calculator

// Dynamic import of the ES6 module
async function loadES6Module() {
    const module = await import('../foundry-winner-calc/runWinnerCalculation.js');
    return module.default;
}

// Function to split array into batches or return entire array if batchSize is 0
function splitArrayIntoBatches(array, batchSize) {
    // If batchSize is 0, return the entire array as a single batch
    if (batchSize === 0) {
        return [array];
    }

    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
        batches.push(array.slice(i, i + batchSize));
    }
    return batches;
}
// Define a function to run winner calculation for each set of parameters
async function GetFoundryWinnersByVault(playersData,tiers,rpc) {
   
const batchToTier = tiers < 6 ? BATCH_SIZE : tiers === 7 ? parseInt(BATCH_SIZE / 3.5) : parseInt(BATCH_SIZE/ 10)

 try {
        const startTime = new Date();
        const aggregatedResults = [];

        // Load the ES6 module dynamically
        const runWinnerCalculation = await loadES6Module();

        for (const params of playersData) {
            const { vaultAddress, userAddresses } = params;
            // Check if batch processing is required
            if (userAddresses.length > batchToTier) {
                const addressBatches = splitArrayIntoBatches(userAddresses, batchToTier);
                    let batchCounter = 0
                    for (const batch of addressBatches) {
                    batchCounter++
                    console.log("batch",batchCounter,"of ",addressBatches.length)
                    const batchParams = { ...params, userAddresses: batch };
                    const results = await runWinnerCalculation(batchParams,rpc);
                    aggregatedResults.push(...results.winners.map(winner => ({ ...winner, vault: vaultAddress })));
                }
            } else {
                const results = await runWinnerCalculation(params,rpc);
                if (results.winners.length > 0) {
                    aggregatedResults.push(...results.winners.map(winner => ({ ...winner, vault: vaultAddress })));
                }
            }
        }
        const endTime = new Date();
        const elapsedTime = (endTime - startTime) / 1000; // Convert milliseconds to seconds
        console.log(`Total time taken: ${elapsedTime} seconds`);
console.log(aggregatedResults)
        return aggregatedResults;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

module.exports =  GetFoundryWinnersByVault ;
