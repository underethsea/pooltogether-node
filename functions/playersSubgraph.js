const axios = require("axios");
const { CONFIG } = require("../constants/config");
const { ADDRESS } = require("../constants/address");

async function makeGraphQlQuery(subgraphURL, tierStartTime, tierEndTime) {
  const maxPageSize = 900;
  let lastId = "";
  let results = [];
  
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
      where: {timestamp_lte: ${tierStartTime}}
    ) {
      # amount
      delegateBalance
    }
    beforeOrAtTierEndTime: balanceUpdates(
      orderBy: timestamp
      orderDirection: desc
      first: 1
      where: {timestamp_lte: ${tierEndTime}}
    ) {
      # amount
      delegateBalance
      # account{vault { id }}
      #  account{user { address }}
    }
  }
}`

//console.log(queryString)

    let data;
    try {
      const response = await axios.post(subgraphURL, { query: queryString });
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

async function GetTwabPlayers(startTimestamp, endTimestamp) {
  const poolers = await makeGraphQlQuery(
    ADDRESS[CONFIG.CHAINNAME].PRIZEPOOLSUBGRAPH,
    startTimestamp,
    endTimestamp
  );

  const allPoolers = [];
  poolers.forEach((pooler) => {
    let vault, address;
      // New structure
      vault = pooler.prizeVault.id;
      address = pooler.user.address;
       
    const balance = pooler.delegateBalance;
    allPoolers.push({ vault: vault, address: address, balance: balance });
  });
  return allPoolers;
}

module.exports = GetTwabPlayers;
