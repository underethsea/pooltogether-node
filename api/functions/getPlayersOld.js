const axios = require("axios");
 const CONFIG={11155111:{
    TWABSUBGRAPH:"https://api.studio.thegraph.com/query/50959/pt-v5-twab-control-eth-sepolia/v0.0.1",
    TWABCONTROLLER:"0xB56D699B27ca6ee4a76e68e585999E552105C10f"},
420:{TWABSUBGRAPH:"https://api.studio.thegraph.com/query/41211/pt-v5-op-goerli-twab-control/v0.0.1",
TWABCONTROLLER:"0x1F4823b8254bB008C36961f64D50e5a0e824949C"},
10:{TWABSUBGRAPH:"https://api.studio.thegraph.com/query/41211/pt-v5-optimism-twab-controller/v0.0.1",
TWABCONTROLLER:"0x0D51a33975024E8aFc55fde9F6b070c10AA71Dd9", 
"0xe32e5E1c5f0c80bD26Def2d0EA5008C107000d6A":"https://api.studio.thegraph.com/proxy/50959/pt-v5-op/version/latest/",
}
11155420:{PRIZEPOOLSUBGRAPH:""}
}


async function makeGraphQlQuery(subgraphURL, prizePool = "") {

  const maxPageSize = 900;
  let lastId = "";
  let results = [];

 while (true) {

    const queryString = `{

  accounts(first: ${maxPageSize}, where: { id_gt: "${lastId}" }) {
    id
vault { id }
        user { address }
    delegateBalance
    balance
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



async function getPlayers(chain, prizePool = "") {
  let poolers = await makeGraphQlQuery(
    prizePool ? CONFIG[chain][prizePool] : CONFIG[chain].TWABSUBGRAPH,
    prizePool
  );
console.log("length",poolers.length)
  const vaultsMap = new Map();

  poolers.forEach((pooler) => {
    const vault = prizePool ? pooler.vault.id : pooler.id.split("-")[0];
    const address = prizePool ? pooler.user.address : pooler.id.split("-")[1];
    const balance = pooler.delegateBalance;

if (balance !== "0") {
        let poolersForVault = vaultsMap.get(vault) || [];
        poolersForVault.push({ address: address, balance: balance });
        vaultsMap.set(vault, poolersForVault);
    }

  });

  let allVaults = [];
  vaultsMap.forEach((poolers, vault) => {
    allVaults.push({ vault: vault, poolers: poolers });
  });

  return allVaults;
}

module.exports.GetPlayers = getPlayers;

// test
/*
getPlayers(10,'0xe32e5E1c5f0c80bD26Def2d0EA5008C107000d6A').then(players=>{


const vaultAddress = '0x77935f2c72b5eb814753a05921ae495aa283906b'.toLowerCase();
//const specificAddress = '0xd872b7d4889ab1c7de5a17a7877ca641ad2c3f72'.toLowerCase(); // Replace with the address you want to check
 const specificAddress = '0x56E8d1798f0d33751b4eCF0F09c5C7Dd9FbdD25b'.toLowerCase();
const vaultData = players.find(vault => vault.vault.toLowerCase() === vaultAddress);

if (vaultData) {
  const isAddressAPooler = vaultData.poolers.some(pooler => pooler.address.toLowerCase() === specificAddress);

  if (isAddressAPooler) {
    console.log(`Address ${specificAddress} is a pooler in vault ${vaultAddress}`);
  } else {
    console.log(`Address ${specificAddress} is not a pooler in vault ${vaultAddress}`);
  }
} else {
  console.log(`No data found for vault ${vaultAddress}`);
}})
*/
