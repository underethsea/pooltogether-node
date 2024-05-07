const fetch = require('node-fetch');
const { CONTRACTS } = require('../constants/contracts');
const { CONFIG} = require('../constants/config');
const { ADDRESS } = require('../constants/address');
const { Multicall } = require("../utilities/multicall");
const BATCH_SIZE = 100; // 0 = no batching

async function verifyWinners(network, prizePool, drawId) {
  const url = `https://poolexplorer.xyz/${network}-${prizePool}-draw${drawId}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    const wins = data.wins;
    let batchCalls = [];
    let falseCount = 0;

    for (let win of wins) {
      for (let index of win.i) {
        // Prepare the contract call for Multicall or individual execution
        const contract = CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME];
        const call = () => contract.isWinner(win.v, win.p, win.t, index);

        if (BATCH_SIZE === 0) {
          // Execute call individually
          try{const result = await call();
          if (result) {
            console.log(`ok: Individual call for winner ${win.p} tier ${win.t} index ${index}`);
          } else {
            console.log(`FALSE: Individual call for winner ${win.p} tier ${win.t} index ${index}`);
            falseCount++;
          }}catch(e){console.log(`${e}`);console.log(`FALSE: Individual call for winner  ${win.p} tier ${win.t} index ${index}`);falseCount++}
        } else {
          // Add to batch for Multicall
          batchCalls.push(call);

          // Check if we reached the BATCH_SIZE or end of data, then execute
          if (batchCalls.length === BATCH_SIZE || (win === wins[wins.length - 1] && index === win.i[win.i.length - 1])) {
            // Execute batch calls
            const results = await Multicall(batchCalls.map(call => call()));
            // Process results
            results.forEach((result, resultIndex) => {
              if (result) {
//                console.log(`ok: Batch ${Math.ceil((falseCount + resultIndex + 1) / BATCH_SIZE)}, Call ${resultIndex + 1}`);
              } else {
                console.log(`FALSE: Batch ${Math.ceil((falseCount + resultIndex + 1) / BATCH_SIZE)}, Call ${resultIndex + 1}`);
                falseCount++;
              }
            });
            // Reset batchCalls for the next batch
            batchCalls = [];
          }
        }
      }
    }

    if (falseCount === 0) {
      console.log("All winners verified successfully.");
    } else {
      console.log(`${falseCount} verifications failed.`);
    }
  } catch (error) {
    console.error(`Error fetching or processing data: ${error}`);
  }
}

// Example usage
async function go (){

const drawId = await CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].getLastAwardedDrawId()
await verifyWinners(CONFIG.CHAINID, ADDRESS[CONFIG.CHAINNAME].PRIZEPOOL, drawId);
}
go()
