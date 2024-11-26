const axios = require("axios");
const http = require("http");
const https = require("https");

const agent = new https.Agent({ keepAlive: true });

/**
 * Adds a delay for a specified duration.
 * @param {number} ms - Delay duration in milliseconds.
 */
async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Handles HTTP POST with retry logic and adaptive delays.
 * @param {string} url - The URL to send the POST request.
 * @param {Object} payload - The data to send in the request body.
 * @param {number} maxRetries - Maximum number of retry attempts.
 * @param {number} initialDelay - Initial delay before retrying (in ms).
 * @returns {Promise<Object>} - The response data.
 */
async function safeAxiosPost(url, payload, maxRetries = 5, initialDelay = 5000) {
    let retries = 0;
    let delayMs = initialDelay;

    while (retries < maxRetries) {
        try { 
            //console.log(`[${new Date().toISOString()}] Attempting request... Retry: ${retries}`);
            const response = await axios.post(url, payload, {
                timeout: 10000, // 10 seconds timeout
                httpsAgent: agent, // Use keep-alive connections
            });
            //console.log(`[${new Date().toISOString()}] Request succeeded on attempt ${retries + 1}`);
            return response;
        } catch (error) {
            retries++;
           
 console.error(`[${new Date().toISOString()}] Request failed. Attempt ${retries} of ${maxRetries}.`);
 if (error.response) {
        console.error(`[${new Date().toISOString()}] Response status: ${error.response.status}`);
        console.error(`[${new Date().toISOString()}] Response headers:`, error.response.headers);
    } else if (error.request) {
        console.error(`[${new Date().toISOString()}] No response received. Request details:`, {
            method: error.request.method,
            url: error.request.path,
            headers: error.request._headers,
        });
    } else {
        console.error(`[${new Date().toISOString()}] Error setting up request: ${error.message}`);
    }

            if (retries >= maxRetries) {
                console.error(`[${new Date().toISOString()}] Max retries reached. Moving to next query.`);
                throw error;
            }

            console.log(`[${new Date().toISOString()}] Retrying after ${delayMs / 1000}s...`);
            await delay(delayMs + Math.random() * 1000); // Add jitter to delay
            delayMs *= 2; // Exponential backoff
        }
    }
}

/**
 * Makes paginated GraphQL queries and handles rate limits with delays and retries.
 * @param {string} subgraphURL - The subgraph endpoint URL.
 * @param {string} chainId - The chain ID.
 * @param {string} prizePool - The prize pool address.
 * @param {number} delayBetweenRequests - Delay between requests in ms.
 * @returns {Promise<Array>} - The aggregated results from all pages.
 */
async function makeGraphQlQuery(subgraphURL, chainId, prizePool = "", delayBetweenRequests = 200) {
    const maxPageSize = 780;
    let lastId = "";
    let results = [];
    let failureCount = 0;

    while (true) {
        let queryString = `{
            accounts(first: ${maxPageSize}, where: { id_gt: "${lastId}" }) {
                id
                ${
                    prizePool.toLowerCase() !== "0xe32e5e1c5f0c80bd26def2d0ea5008c107000d6a"
                        ? "prizeVault { id }"
                        : "vault { id }"
                }
                user { address }
                delegateBalance
                balance
            }
        }`;

        try { 
            //console.log(`[${new Date().toISOString()}] Fetching data with lastId: ${lastId}`);
            const response = await safeAxiosPost(subgraphURL, { query: queryString });
            const data = response.data;

            results.push(...data.data.accounts);
            const numberOfResults = data.data.accounts.length;
            console.log(`[${new Date().toISOString()}] Fetched ${numberOfResults} results. Total so far: ${results.length}`);

            if (numberOfResults < maxPageSize) {
                console.log(`[${new Date().toISOString()}] No more pages to fetch. Exiting loop.`);
                break;
            }

            lastId = data.data.accounts[data.data.accounts.length - 1].id;
            failureCount = 0; // Reset failure count on success
        } catch (error) {
            failureCount++;
            console.error(`[${new Date().toISOString()}] Query failed. Failure count: ${failureCount}`);
            if (failureCount >= 3) {
                console.error(`[${new Date().toISOString()}] Skipping this query after multiple failures.`);
                break; // Skip to the next page after repeated failures
            }
        }

        const adaptiveDelay = delayBetweenRequests + failureCount * 100; // Increase delay on repeated failures
        //console.log(`[${new Date().toISOString()}] Delaying ${adaptiveDelay}ms before next request...`);
        await delay(adaptiveDelay);
    }

    return results;
}

/**
 * Fetches player data and organizes it by vault.
 * @param {string} chain - The blockchain chain.
 * @param {string} prizePool - The prize pool address.
 * @param {string} subgraph - The subgraph endpoint URL.
 * @returns {Promise<Array>} - Organized player data by vault.
 */
async function getPlayers(chain, prizePool = "", subgraph) {
    try {
        console.log(`[${new Date().toISOString()}] Starting getPlayers...`);
        const poolers = await makeGraphQlQuery(subgraph, chain, prizePool);
        console.log(`[${new Date().toISOString()}] Fetched ${poolers.length} poolers.`);

        const vaultsMap = new Map();

        poolers.forEach((pooler) => {
            const vaultAddress =
                prizePool.toLowerCase() !== "0xe32e5e1c5f0c80bd26def2d0ea5008c107000d6a"
                    ? pooler.prizeVault?.id
                    : pooler.vault?.id;

            const vault = prizePool ? vaultAddress : pooler.id.split("-")[0];
            const address = prizePool ? pooler.user.address : pooler.id.split("-")[1];
            const balance = pooler.delegateBalance;

            if (balance !== "0") {
                let poolersForVault = vaultsMap.get(vault) || [];
                poolersForVault.push({ address: address, balance: balance });
                vaultsMap.set(vault, poolersForVault);
            }
        });

        const allVaults = [];
        vaultsMap.forEach((poolers, vault) => {
            allVaults.push({ vault: vault, poolers: poolers });
        });

        console.log(`[${new Date().toISOString()}] Returning data for ${allVaults.length} vaults.`);
        return allVaults;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in getPlayers:`, error);
        throw error;
    }
}

module.exports.GetPlayers = getPlayers;
