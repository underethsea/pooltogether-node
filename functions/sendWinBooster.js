const { web3GasEstimate } = require("../utilities/web3");
const { PROVIDERS, SIGNER } = require("../constants/providers");
const { ABI } = require("../constants/abi");
const { Multicall } = require("../utilities/multicall");
const ethers = require("ethers");
const { CONFIG } = require("../constants/config");
const { GeckoIDPrices } = require("../utilities/geckoFetch.js");
const { CONTRACTS } = require("../constants/contracts.js");
const { MIN_TO_SEND_CLAIM,MAX_INDICES,PERCENTAGE_CLAIM_COST,MIN_PERCENTAGE_CLAIM_COST,FEE} = CONFIG

MIN_TO_SEND_CLAIM_POOL  = ethers.utils.parseUnits(MIN_TO_SEND_CLAIM)

async function SendWinBooster(claims) {
  console.log("claims in send", claims);
  let prizeTokenPrice;
  let ethPrice;
  try {
    const ethAndPoolPrices = await GeckoIDPrices(["pooltogether", "ethereum"]);
    prizeTokenPrice = ethAndPoolPrices[0];
    ethPrice = ethAndPoolPrices[1];
  } catch (e) {
    console.log("error getting pricing", e);
  }

  const grouperContract = CONTRACTS.WINBOOSTERSIGNER[CONFIG.CHAINNAME];

  if (prizeTokenPrice > 0 && ethPrice > 0) {
    // index of addresses that has their funding balance and max claim per prize
    const addressBalances = await retrieveAndProcessUserBalances(
      claims,
      grouperContract,
      MIN_TO_SEND_CLAIM_POOL
    );

    console.log("claims length", claims.length);

    for (let i = 0; i < claims.length; i++) {

      //TEMP TEMP TEMP block tiers from claims
       if ([1].includes(parseInt(claims[i].tier))) {
         continue;
       }

      let allClaim = claims[i];
      const { onDeckClaims, upToBatClaims } = splitClaims(allClaim, MAX_INDICES);

console.log("on deck claims",onDeckClaims)
console.log("up to bat claims,",upToBatClaims)
let isModified;
      do {
        isModified = false;
        const {
          vault,
          tier,
          tierValue
         
        } = allClaim;
        const {
          winners,
          indices
        } = upToBatClaims
if(indices.flat(Infinity).length>0){
        // fake fee of 100 for estimate purposes only
        const args = [
          vault,
          tier,
          winners,
          indices,
          ethers.BigNumber.from(100),
        ];
        console.log("args", args);
        // Encode the function call
        const data = grouperContract.interface.encodeFunctionData(
          "claim",
          args
        );
await delay(300)
        // Calculate total gas cost in wei
        let web3TotalGasCost = await web3GasEstimate(
          data,
          CONFIG.CHAINID,
          CONFIG.WALLET,
          grouperContract.address
        );
        web3TotalGasCost = web3TotalGasCost.toString();

        console.log(
          "Real Gas Estimate through Web3 (wei): " + web3TotalGasCost
        );

        console.log(
          indices.flat().length,
          " tier ",
          tier,
          " prize/s of ",
          ethers.utils.formatUnits(tierValue, 18),
          " POOL each"
        );
        // Create an ethers BigNumber from the string
        web3TotalGasCost = ethers.BigNumber.from(web3TotalGasCost);
        let feeAsPercent = web3TotalGasCost.mul(FEE).div(100);

        const txCostWithFee = web3TotalGasCost.add(feeAsPercent);
        const txCostWithFeeFormatted = ethers.utils.formatUnits(
          txCostWithFee,
          18
        );
const txCostWithFeeUSD = txCostWithFeeFormatted * ethPrice

const txCostInPool = txCostWithFeeUSD / prizeTokenPrice
   
//   let scaleFactor = 10 ** 10; // Adjust depending on the precision you want
 //  let scaledPoolPrice = Math.round(prizeTokenPrice * scaleFactor); // Convert price to an integer based on desired precision

const txCostWithFeeInPool = ethers.utils.parseUnits(txCostInPool.toString(),18)

//console.log("tx cost with feein pool",txCostWithFeeInPool.toString()," -> ",(txCostWithFeeInPool/1e18).toFixed(10))

        const totalPrizeValue =
          ethers.utils.formatUnits(tierValue, 18) *
          indices.reduce((acc, curr) => acc + curr.length, 0);

        const totalPrizeValueInUSD = totalPrizeValue * prizeTokenPrice;

        console.log("total prize value of claim $",totalPrizeValueInUSD)

const maxAllowedCost = totalPrizeValueInUSD * (PERCENTAGE_CLAIM_COST / 100);
const minAllowedCost = totalPrizeValueInUSD * (MIN_PERCENTAGE_CLAIM_COST / 100);
// Convert the total gas cost to ETH
//console.log("tx cost with fee ",(txCostWithFeeInPool/1e18).toFixed(10)," POOL")
        console.log(
          "cost with fee",
          //txCostWithFeeFormatted,
          " ETH ($",
          txCostWithFeeUSD.toFixed(4),
          ") (",txCostInPool.toFixed(4),"POOL) | MAX Allowed $",maxAllowedCost
        );

if (txCostWithFeeUSD > maxAllowedCost) {
          console.log(
            "POOL value is not greater than gas cost + fee for this claim"
          );
          break; // Exit the do-while loop and move to the next claim
        } else if(txCostWithFeeUSD < minAllowedCost) {
 console.log(
            "POOL value is less MIN_PERCENTAGE_CLAIMCOST"
          );
break;
}else {
          console.log(
            "POOL value is greater than gas cost + fee for this claim"
          );
        }
let costPerPrize = web3TotalGasCost.div(
            ethers.BigNumber.from(indices.flat(Infinity).length)
          );

console.log("COST PER PRIZE",costPerPrize.toString())

let costPerPrizeInPool = txCostWithFeeInPool.div(ethers.BigNumber.from(indices.flat(Infinity).length))
console.log("cost per prize in pool",costPerPrizeInPool.toString()," 0- >",(costPerPrizeInPool/1e18).toFixed(6))

for (let j = 0; j < winners.length; j++) {
    let winner = winners[j];
    let numberOfPrizes = indices[j].length;
if (addressBalances[winner]) {
    console.log(`Winner ${winner} with maxClaimCost of ${(addressBalances[winner].maxClaimCost / 1e18).toFixed(5)} and balance ${(addressBalances[winner].ethBalance / 1e18).toFixed(5)} check`);
    console.log("cost per prize to claim", (costPerPrizeInPool / 1e18).toFixed(5), " POOL");

    // Check if the cost per prize exceeds the winner's max claim fee
    if (addressBalances[winner].maxClaimCost.lt(costPerPrizeInPool)) {
        console.log(`Winner ${winner} with maxClaimCost of ${(addressBalances[winner].maxClaimCost / 1e18).toFixed(5)} can't claim because the cost per prize exceeds their max claim fee.`);
        winners.splice(j, 1);
        indices.splice(j, 1);
        j--; // Adjust index due to splice
        isModified = true;
        continue;
    }
} else {
    console.log(`Winner ${winner} does not have a balance record and cannot claim.`);
    winners.splice(j, 1);
    indices.splice(j, 1);
    j--; // Adjust index due to splice
    isModified = true;
    continue;
}
    // Calculate the maximum number of prizes this winner can afford
    let maxAffordablePrizes = addressBalances[winner].ethBalance.div(costPerPrizeInPool);

    if (maxAffordablePrizes.gte(numberOfPrizes)) {
        // Winner can afford all their prizes, no change needed
        continue;
    }
    if (maxAffordablePrizes.isZero()) {
        // Winner can't afford any prize, remove them
        console.log(`Winner ${winner} with not enough balance ${(addressBalances[winner].ethBalance/1e18).toFixed(5)} can't claim.`);
        winners.splice(j, 1);
        indices.splice(j, 1);
        j--; // Adjust index due to splice
	isModified = true
    } else {
        // Winner can afford some, but not all, of their prizes
        console.log(`Winner ${winner} can only afford ${maxAffordablePrizes.toString()} prizes, adjusting claim.`);
        indices[j] = indices[j].slice(0, maxAffordablePrizes.toNumber());
    	isModified = true
	}
}
/* update could help

for (let j = 0; j < winners.length; j++) {
    let winner = winners[j];

    // Calculate the maximum number of prizes based on ETH balance
    let maxPrizesBasedOnBalance = addressBalances[winner].ethBalance.div(costPerPrize);

    // Calculate the maximum number of prizes based on max claim fee
    let maxPrizesBasedOnClaimFee = addressBalances[winner].maxClaimCost.div(costPerPrize);

    // Determine the actual number of prizes they can claim
    let actualClaimablePrizes = maxPrizesBasedOnBalance.lt(maxPrizesBasedOnClaimFee) ? maxPrizesBasedOnBalance : maxPrizesBasedOnClaimFee;

    if (actualClaimablePrizes.isZero()) {
        // Winner can't afford any prize, remove them
        console.log(`Winner ${winner} can't afford any prize, removing from claims.`);
        winners.splice(j, 1);
        indices.splice(j, 1);
        j--; // Adjust index due to splice
        isModified = true;
    } else {
        // Adjust the claim to the number of prizes they can afford
        console.log(`Winner ${winner} can afford ${actualClaimablePrizes.toString()} prizes, adjusting claim.`);
        indices[j] = indices[j].slice(0, actualClaimablePrizes.toNumber());
        isModified = true;
    }

*/
console.log("indices??",indices.flat(Infinity).length)
if(!isModified && indices.flat(Infinity).length > 0){
        try {
          console.log("sending claim");

          console.log(
            "sending params",
            vault,
            tier,
            winners,
            indices,
            txCostWithFeeInPool.toString()
          );


// CALL STATIC
/*
try{
let txStatic = await grouperContract.callStatic.claim(
            vault,
            tier,
            winners,
            indices,
            txCostWithFee.toString(),
            {
              gasLimit: BigInt(
                380000 + 320000 + 149000 * (indices.flat(Infinity).length - 1)
              ),
              maxPriorityFeePerGas: "1010000",
            }
          );
          let resultStatic = await txStatic.wait();
          console.log("test tx",resultStatic);
    
} catch(e){console.log("error callstatic claim",e)}
*/  
    // return here to not send

// hard check on claim fee being less than prize
// Recalculate the total prize value
const numberOfPrizesBeingClaimed = indices.flat(Infinity).length;
const totalPrizeValueInPoolUnits = tierValue.mul(numberOfPrizesBeingClaimed);

// Convert txCostWithFeeInPool back to a comparable unit if needed
// Assuming txCostWithFeeInPool is in the same unit as tierValue for direct comparison

// Check if the transaction cost exceeds the total prize value
if (txCostWithFeeInPool.gt(totalPrizeValueInPoolUnits)) {
    console.log("Aborting: Transaction cost exceeds the total value of the prizes being claimed.");
    return false; // Abort the sending process
}

try{
          let tx = await grouperContract.claim(
            vault,
            tier,
            winners,
            indices,
            txCostWithFeeInPool,
            {
              gasLimit: BigInt(
                380000 + 320000 + 149000 * (indices.flat(Infinity).length - 1)
              ),
              maxPriorityFeePerGas: "1010000",
            }
          );
          let result = await tx.wait();
          console.log(result.transactionHash);
return true
}catch(e){console.log(e);return false}
          return;
        } catch (e) {
          console.log("error sending tx", e);
        }
}}
      } while (isModified);

     
    }
  } else {
    console.log("pricing error");
  }
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function retrieveAndProcessUserBalances(
  claims,
  grouperContract,
        MIN_TO_SEND_CLAIM_POOL

) {
  const uniqueAddresses = new Set();
  claims.forEach((claim) => {
    claim.winners.forEach((winner) => {
      uniqueAddresses.add(winner);
    });
  });

  const orderedUniqueAddresses = Array.from(uniqueAddresses);
  let calls = [];
  orderedUniqueAddresses.forEach((user) => {
    calls.push(grouperContract.balances(user));
    calls.push(grouperContract.maxFeePerPrize(user));
  });

  const multiCallResult = await Multicall(calls);
  const addressBalances = {};
  let deletedCounter = 0;
let deletedAddresses = []
  orderedUniqueAddresses.forEach((user, index) => {
    const ethBalance = multiCallResult[index * 2];
    const maxClaimCost = multiCallResult[index * 2 + 1];

    if (ethBalance.lt(MIN_TO_SEND_CLAIM_POOL)) {
      deletedCounter++;
deletedAddresses.push(user)
    } else {
      addressBalances[user] = {
        ethBalance,
        maxClaimCost,
      };
    }
  });

  if (deletedCounter > 0) {
    console.log(
      `${deletedCounter} addresses removed for not having enough eth balance to claim`
    );
console.log(deletedAddresses)
  }

  return addressBalances;
}

function splitClaims(originalClaim, maxIndices) {
  let currentIndexCount = 0;
  let onDeckClaims = { winners: [], indices: [] };
  let upToBatClaims = { winners: [], indices: [] };

  for (let i = 0; i < originalClaim.winners.length; i++) {
    let winner = originalClaim.winners[i];
    let winnerIndices = originalClaim.indices[i];
    let remainingIndices = maxIndices - currentIndexCount;

    if (currentIndexCount + winnerIndices.length <= maxIndices) {
      // Add entire winner and indices to upToBatClaims
      upToBatClaims.winners.push(winner);
      upToBatClaims.indices.push(winnerIndices);
      currentIndexCount += winnerIndices.length;
    } else {
      // Split indices for the current winner
      let indicesToKeep = winnerIndices.slice(0, remainingIndices);
      let indicesToSend = winnerIndices.slice(remainingIndices);

      // Update upToBatClaims and onDeckClaims
      if (indicesToKeep.length > 0) {
        upToBatClaims.winners.push(winner);
        upToBatClaims.indices.push(indicesToKeep);
      }

      onDeckClaims.winners.push(winner);
      onDeckClaims.indices.push(indicesToSend);

      break; // Stop processing as maxIndices is reached
    }
  }

  // Remove processed winners and their indices from originalClaim
  originalClaim.winners = originalClaim.winners.slice(upToBatClaims.winners.length);
  originalClaim.indices = originalClaim.indices.slice(upToBatClaims.indices.length);

  return { upToBatClaims, onDeckClaims };
}


module.exports = { SendWinBooster };
