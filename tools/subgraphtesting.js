const fetch = require('node-fetch');
 
//const endpoint = 'https://api.studio.thegraph.com/query/63100/pt-v5-optimism/version/latest/';
const endpoint = "https://api.studio.thegraph.com/query/63100/pt-v5-arbitrum/version/latest"
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
  console.log("Sending query:", query); // Log the query being sent
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    // Check if response status is OK
    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error(`Response body: ${errorBody}`);
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const responseBody = await response.json();

    // Check if the expected data exists
    if (!responseBody.data || !responseBody.data.users) {
      console.error('Unexpected response structure:', JSON.stringify(responseBody, null, 2));
      throw new Error('Unexpected response structure');
    }

    return responseBody.data.users;
  } catch (error) {
    console.error("Error fetching GraphQL:", error);
    throw error;
  }
};

const fetchAllUsers = async (queryGenerator) => {
  let allUsers = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    try {
      const users = await fetchGraphQL(queryGenerator(skip));
      allUsers = allUsers.concat(users);
      skip += 100;
      hasMore = users.length === 100;
    } catch (error) {
      console.error(`Error fetching users at skip=${skip}:`, error.message);
      break; // Stop the loop if there's an error
    }
  }

  return allUsers;
};

const checkDelegateBalances = async () => {
  try {
    console.log("Fetching users with delegateBalance > 0...");
    const usersWithCondition = await fetchAllUsers(queryWithCondition);
    console.log("Fetching all users...");
    const usersWithoutCondition = await fetchAllUsers(queryWithoutCondition);

    console.log(`Number of users with delegateBalance > 0: ${usersWithCondition.length}`);
    console.log(`Number of users without condition: ${usersWithoutCondition.length}`);
  } catch (error) {
    console.error("Error checking delegate balances:", error.message);
  }
};

// Start the process
checkDelegateBalances();
