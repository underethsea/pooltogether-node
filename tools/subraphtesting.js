const fetch = require('node-fetch');

const endpoint = 'https://api.studio.thegraph.com/proxy/63100/pt-v5-optimism/version/latest/';

const queryWithCondition = (skip) => `
{
  users(where: { accounts_: { delegateBalance_gt: 0 } }, first: 100, skip: ${skip}) {
    address
    accounts {
      delegateBalance
    }
  }
}`;

const queryWithoutCondition = (skip) => `
{
  users(first: 100, skip: ${skip}) {
    address
    accounts {
      delegateBalance
    }
  }
}`;

const fetchGraphQL = async (query) => {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    // Check if the response is OK before parsing
    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error(`Response body: ${errorBody}`);
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const responseBody = await response.json();
    return responseBody.data.users;
  } catch (error) {
    console.error("Error fetching GraphQL:", error);
    throw error; // Re-throw to propagate the error
  }
};

const checkDelegateBalances = async () => {
  const usersWithCondition = await fetchAllUsers(queryWithCondition);
  const usersWithoutCondition = await fetchAllUsers(queryWithoutCondition);

  console.log(`Number of users with delegateBalance > 0: ${usersWithCondition.length}`);
  console.log(`Number of users without condition: ${usersWithoutCondition.length}`);
};

checkDelegateBalances();
