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
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const responseBody = await response.json();
  return responseBody.data.users;
};

const fetchAllUsers = async (queryGenerator) => {
  let allUsers = [];
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const users = await fetchGraphQL(queryGenerator(skip));
    allUsers = allUsers.concat(users);
    skip += 100;
    hasMore = users.length === 100;
  }

  return allUsers;
};

const checkDelegateBalances = async () => {
  const usersWithCondition = await fetchAllUsers(queryWithCondition);
  const usersWithoutCondition = await fetchAllUsers(queryWithoutCondition);

  console.log(`Number of users with delegateBalance > 0: ${usersWithCondition.length}`);
  console.log(`Number of users without condition: ${usersWithoutCondition.length}`);
};

checkDelegateBalances();
