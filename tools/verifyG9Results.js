
const fetch = require('node-fetch');
const { CONTRACTS } = require('../constants/contracts');
const { CONFIG } = require('../constants/config');
const { ADDRESS } = require('../constants/address');
const { Multicall } = require("../utilities/multicall");
const BATCH_SIZE = 0; // 0 = no batching

async function verifyWinners(network, prizePool, drawId) {
const url = `https://api.github.com/repos/GenerationSoftware/pt-v5-winners-testnet/contents/winners/vaultAccounts/${network}/${prizePool.toLowerCase()}/draw/${drawId}/winners.json`
console.log(url)
  try {
    const response = await fetch(url);
    const jsonData = await response.json(); // Assuming the new structure directly in `data`
    const content = Buffer.from(jsonData.content, 'base64').toString('utf-8');
    const data = JSON.parse(content)
    let batchCalls = [];
    let falseCount = 0;
    console.log(Object.keys(data),data[0])
    Object.entries(data).forEach(([vaultAddress, users]) => {
      users.forEach(user => {
        Object.entries(user.prizes).forEach(([tier, indices]) => {
          indices.forEach(async (index) => {
            // Prepare the contract call for Multicall or individual execution
            const contract = CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME];
            const call = () => contract.isWinner(user.user, vaultAddress, tier, index);

            if (BATCH_SIZE === 0) {
              // Execute call individually
              try {
                const result = await call();
                if (result) {
                  console.log(`ok: Individual call for winner ${user.user} vault ${vaultAddress} tier ${tier} index ${index}`);
                } else {
                  console.log(`FALSE: Individual call for winner ${user.user} vault ${vaultAddress} tier ${tier} index ${index}`);
                  falseCount++;
                }
              } catch (e) {
                console.log(`${e}`);
                console.log(`FALSE: Individual call for winner ${user.user} vault ${vaultAddress} tier ${tier} index ${index}`);
                falseCount++;
              }
            } else {
              // If batching is needed, this part would need to handle batch logic similarly.
              // Remember to adjust for asynchronous execution within loops if batching is reintroduced.
            }
          });
        });
      });
    });

    if (falseCount === 0) {
      console.log("All winners verified successfully.");
    } else {
      console.log(`${falseCount} verifications failed.`);
    }
  } catch (error) {
    console.error(`Error fetching or processing data: ${error}`);
  }
}

async function go (){

const drawId = await CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].getLastAwardedDrawId()
await verifyWinners(CONFIG.CHAINID, ADDRESS[CONFIG.CHAINNAME].PRIZEPOOL, drawId);
}
go()

