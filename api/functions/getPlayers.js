const axios = require("axios");

async function makeGraphQlQuery(subgraphURL, chainId, prizePool = "") {
    const maxPageSize = 900;
    let lastId = "";
    let results = [];

    while (true) {
        let queryString;
//console.log(prizePool.toLowerCase(),"prize pool")
//console.log("subraph",subgraphURL)
console.log(prizePool.toLowerCase() !== "0xe32e5e1c5f0c80bd26def2d0ea5008c107000d6a")
        if (prizePool.toLowerCase() !== "0xe32e5e1c5f0c80bd26def2d0ea5008c107000d6a") {
            queryString = `{
                accounts(first: ${maxPageSize}, where: { id_gt: "${lastId}" }) {
                    id
                    prizeVault { id }
                    user { address }
                    delegateBalance
                    balance
                    
                }
            }`;
        } else { 
            queryString = `{
                accounts(first: ${maxPageSize}, where: { id_gt: "${lastId}" }) {
                    id
                    vault { id }
                    user { address }
                    delegateBalance
                    balance
                }
            }`;
        }

        let data;
        try {
    const response = await axios.post(subgraphURL, { query: queryString });
            data = response.data;
        } catch (error) {
            console.error("GraphQL query error:", error);
            break;
        }

        results.push(...data.data.accounts);

//console.log("now results length",results.length)
        const numberOfResults = data.data.accounts.length;
        if (numberOfResults < maxPageSize) {
            break;
        }
        lastId = data.data.accounts[data.data.accounts.length - 1].id;
    }
    return results;
}

async function getPlayers(chain, prizePool = "", subgraph) {
try{    let poolers = await makeGraphQlQuery(
        subgraph,
        //prizePool ? CONFIG[chain][prizePool] : CONFIG[chain].TWABSUBGRAPH,
        chain,
        prizePool
    );
    const vaultsMap = new Map();

    poolers.forEach((pooler) => {
        const vaultAddress = prizePool.toLowerCase() !== "0xe32e5e1c5f0c80bd26def2d0ea5008c107000d6a" ? pooler.prizeVault?.id : pooler.vault?.id
        const vault = prizePool ? vaultAddress : pooler.id.split("-")[0];
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
//console.log("get players is returning",allVaults.length,"length","[0]",allVaults[0],"[1]",allVaults[1])
    return allVaults;
}catch(e){console.log(e)}
}

module.exports.GetPlayers = getPlayers;
