const axios = require("axios");
const { ADDRESS } = require("../constants/address");
const { getChainConfig } = require("../chains");

const CHAINNAME = getChainConfig().CHAINNAME;

async function makeGraphQlQuery(subgraphURL, startTimestamp, endTimestamp) {
  const maxPageSize = 900;
  let lastId = "";
  let results = [];

  while (true) {
    const queryString = `
      query drawQuery($first: Int!, $lastId: String, $startTimestamp: Int!, $endTimestamp: Int!) {
        accounts(first: $first, where: { id_gt: $lastId }) {
          id
          prizeVault {
            id
          }
          user {
            address
          }
          delegateBalance

          mostRecentBalanceUpdateBeforeTimestamp: balanceUpdates(
            orderBy: timestamp
            orderDirection: desc
            first: 1
            where: { timestamp_lte: $startTimestamp }
          ) {
            delegateBalance
          }

          balanceUpdatesBetweenMaxDrawPeriod: balanceUpdates(
            where: { timestamp_gte: $startTimestamp, timestamp_lte: $endTimestamp }
          ) {
            delegateBalance
          }
        }
      }
    `;

    const variables = {
      first: maxPageSize,
      lastId: lastId,
      startTimestamp: startTimestamp,
      endTimestamp: endTimestamp,
    };

    let data;
    try {
      const response = await axios.post(subgraphURL, {
        query: queryString,
        variables: variables,
      });
      data = response.data;
    } catch (error) {
      console.error("GraphQL query error:", error);
      break;
    }

    results.push(...data.data.accounts);

    const numberOfResults = data.data.accounts.length;
    if (numberOfResults < maxPageSize) {
      break;
    }
    lastId = data.data.accounts[data.data.accounts.length - 1].id;
  }
  return results;
}

const filterAccountsWithBalance = (accounts) => {
  return accounts.filter((account) => {
    const balanceUpdatesAboveZeroDuringRange = account.balanceUpdatesBetweenMaxDrawPeriod.filter(
      (update) => {
        return update.delegateBalance > 0;
      },
    );

    return (
      account.mostRecentBalanceUpdateBeforeTimestamp?.[0]?.delegateBalance > 0 ||
      balanceUpdatesAboveZeroDuringRange.length > 0
    );
  });
};

async function GetTwabPlayers(subgraph, startTimestamp, endTimestamp) {
  const poolers = await makeGraphQlQuery(
    subgraph,
    startTimestamp,
    endTimestamp
  );

  const filteredPoolers = filterAccountsWithBalance(poolers);

  const allPoolers = filteredPoolers.map((pooler) => {
    const vault = pooler.prizeVault.id;
    const address = pooler.user.address;
    const balance = pooler.delegateBalance;

    return { vault: vault, address: address, balance: balance };
  });

  return allPoolers;
}

// Test function to run the query for the past 90 days
(async function testGetTwabPlayers() {
  const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60; // 90 days ago in seconds
  const subgraph = "https://api.studio.thegraph.com/query/41211/pt-v5-base/version/latest";

  try {
    const players = await GetTwabPlayers(subgraph, ninetyDaysAgo, now);

    // Create a map to count players per vault
    const vaultCounts = players.reduce((counts, player) => {
      counts[player.vault] = (counts[player.vault] || 0) + 1;
      return counts;
    }, {});

    // Print the counts per vault
    console.log("Players per vault in the last 90 days:");
    for (const [vault, count] of Object.entries(vaultCounts)) {
      console.log(`${vault}: ${count}`);
    }
  } catch (error) {
    console.error("Error running test:", error);
  }
})();
