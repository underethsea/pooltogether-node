const axios = require("axios");
const { ADDRESS } = require("../constants/address");
const { getChainConfig } = require("../chains");

const CHAINNAME = getChainConfig().CHAINNAME;

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
            const response = await axios.post(url, payload, {
                timeout: 10000, // 10 seconds timeout
            });
            return response;
        } catch (error) {
            retries++;
            console.error(`[${new Date().toISOString()}] Request failed. Attempt ${retries} of ${maxRetries}.`);

            if (retries >= maxRetries) {
                console.error(`[${new Date().toISOString()}] Max retries reached. Aborting.`);
                throw error;
            }

            console.log(`[${new Date().toISOString()}] Retrying after ${delayMs / 1000}s...`);
            await delay(delayMs + Math.random() * 1000); // Add jitter
            delayMs *= 2; // Exponential backoff
        }
    }
}

/**
 * Makes paginated GraphQL queries with retry logic and adaptive delays.
 * @param {string} subgraphURL - The subgraph endpoint URL.
 * @param {number} startTimestamp - The start timestamp for balance filtering.
 * @param {number} endTimestamp - The end timestamp for balance filtering.
 * @returns {Promise<Array>} - Aggregated results from all pages.
 */
async function makeRobustGraphQlQuery(subgraphURL, startTimestamp, endTimestamp) {
    const maxPageSize = 900;
    let lastId = "";
    let results = [];
    let failureCount = 0;

    while (true) {
        const queryString = `{
            accounts(first: ${maxPageSize}, where: { id_gt: "${lastId}" }) {
                id
                prizeVault { id }
                user { address }
                delegateBalance
                beforeOrAtTierStartTime: balanceUpdates(
                    orderBy: timestamp
                    orderDirection: desc
                    first: 1
                    where: {timestamp_lte: ${startTimestamp}}
                ) {
                    delegateBalance
                }
                beforeOrAtTierEndTime: balanceUpdates(
                    orderBy: timestamp
                    orderDirection: desc
                    first: 1
                    where: {timestamp_lte: ${endTimestamp}}
                ) {
                    delegateBalance
                }
            }
        }`;

        try {
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

        const adaptiveDelay = 200 + failureCount * 100; // Increase delay on repeated failures
        await delay(adaptiveDelay);
    }

    return results;
}

/**
 * Fetches TWAB player data and organizes it into a flat structure.
 * @param {number} startTimestamp - The start timestamp for balance filtering.
 * @param {number} endTimestamp - The end timestamp for balance filtering.
 * @returns {Promise<Array>} - Array of player data (vault, address, balance).
 */
async function GetTwabPlayers(startTimestamp, endTimestamp) {
    try {
        const subgraphURL = ADDRESS[CHAINNAME].PRIZEPOOLSUBGRAPH;

        console.log(`[${new Date().toISOString()}] Starting GetTwabPlayers...`);
        const poolers = await makeRobustGraphQlQuery(subgraphURL, startTimestamp, endTimestamp);
        console.log(`[${new Date().toISOString()}] Fetched ${poolers.length} poolers.`);

        const allPoolers = poolers.map((pooler) => {
            const vault = pooler.prizeVault.id;
            const address = pooler.user.address;
            const balance = pooler.delegateBalance;

            return { vault, address, balance };
        });

        console.log(`[${new Date().toISOString()}] Returning ${allPoolers.length} players.`);
        return allPoolers;
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error in GetTwabPlayers:`, error);
        throw error;
    }
}

module.exports = GetTwabPlayers;
