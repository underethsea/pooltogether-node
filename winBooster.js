const { GetRecentClaims } = require("./functions/getRecentClaims.js")
const { ethers } = require('ethers');
const { PROVIDERS, SIGNER } = require('./constants/providers')
const { ABI } = require('./constants/abi')
const { ADDRESS } = require('./constants/address')
const { CONFIG } = require("./constants/config")
const { GetPrizePoolData } = require("./functions/getPrizePoolData.js");
const { FetchApiPrizes } = require("./functions/fetchApiPrizes.js");
const { SendWinBooster } = require("./functions/sendWinBooster.js")
const { CONTRACTS } = require("./constants/contracts.js")

const { MAX_GAS,MAX_CLAIM_INDICES,BLACKLIST,CLAIM_WINDOW_OPEN,CLAIM_WINDOW_CLOSED,RETRY } = CONFIG

function isTimeBetween(startHour, endHour) {
  const date = new Date();
  const currentHour = date.getHours();

  return currentHour >= startHour && currentHour < endHour;
}

async function runClaims() {
if(!isTimeBetween(CLAIM_WINDOW_OPEN,CLAIM_WINDOW_CLOSED)){console.log("not in claim window");return}

const gas = await PROVIDERS["MAINNET"].getGasPrice()
const prizePoolContract = CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME]
if((gas/1e9) <= MAX_GAS){
console.log("gas in range ",(gas/1e9).toFixed(2),"gwei")

const [claimPoolers, prizePoolData] = await Promise.all([
    getClaimPoolers(),
    GetPrizePoolData()
  ]);

  // Destructure prizePoolData to extract the properties
  const {
    lastDrawId, 
    numberOfTiers, 
    tierTimestamps, 
    prizesForTier, 
    maxFee, 
    tierPrizeValues, 
    tierRemainingLiquidites, 
    reserve
  } = prizePoolData;

  // Use claimPoolers and the destructured properties here
  console.log(claimPoolers);

  // console.log("tier values",tierPrizeValues)
  //console.log("tier liquidites",tierRemainingLiquidites)

const isFinalized = await prizePoolContract.isDrawFinalized(lastDrawId)

if(isFinalized){console.log("draw is finalized, waiting for the next draw to be awarded....");return}  


  let [claims, newWinners] = await Promise.all([
    GetRecentClaims(CONFIG.CHAINID),
    GetRecentClaims(CONFIG.CHAINID).then(claims =>
      FetchApiPrizes(
        CONFIG.CHAINID,
        lastDrawId,
        CONFIG.TIERSTOCLAIM,
        claims
      )
    )
  ]);

  // Use claims and newWinners here
  //console.log("using api for winner calculations", { claims, newWinners });



const prizesByTier = countPrizesByTier(newWinners)
console.log("prizes by tier",prizesByTier)
  console.log("winners before removing claims", newWinners.length);
  const {filteredWinsToClaim, unclaimedPrizesPerTier} = removeAlreadyClaimed(newWinners, claims, lastDrawId);
  newWinners = filteredWinsToClaim

console.log("unclaimed prizes per tier",unclaimedPrizesPerTier)
  console.log("winners after removing claims", newWinners.length);
newWinners = removeBlacklistedWinners(newWinners,BLACKLIST)
console.log("winners after removing blacklist", newWinners.length);  
  console.log("claimPoolers", claimPoolers)
//console.log("first 4 of newWinners",newWinners.slice(0,4))

// Check for liquidity issues in each tier
  const tiersWithIssues = checkTierLiquidity(unclaimedPrizesPerTier, tierPrizeValues, tierRemainingLiquidites);
  if (tiersWithIssues.length > 0) {
    console.log("Tiers with liquidity issues:", tiersWithIssues);
  } else {
    console.log("No liquidity issues detected in any tier.");
  }


const claimableList = createClaimableList(claimPoolers,newWinners,tierPrizeValues)

claimableList.sort((a, b) => {
  // First, compare by tier
  if (a.tier < b.tier) return -1;
  if (a.tier > b.tier) return 1;

  // If tiers are equal, compare by the length of indices (in reverse order)
  return b.indices.length - a.indices.length;
});


//console.log("claimable list",claimableList)

const claimServiceSent = await SendWinBooster(claimableList)
if(claimServiceSent){setTimeout(runClaims,30000)}
}else{console.log("gas too high",(gas/1e9).toString())
setTimeout(runClaims, 60000); //60k is 1 min 
}

}


async function getClaimPoolers() {
    // contract = new ethers.Contract(ADDRESS[CONFIG.CHAINNAME].CLAIMSERVICEFACTORY,ABI.CLAIMSERVICEFACTORY,PROVIDERS[CONFIG.CHAINNAME])
    // Fetch the event logs
     const winBoostContract = CONTRACTS.WINBOOSTER[CONFIG.CHAINNAME];     
const filter = winBoostContract.filters.Deposit();
    const logs = await winBoostContract.queryFilter(filter);

// Use a Set to store unique addresses
    const addressSet = new Set(logs.map(log => log.args.user.toLowerCase()));

    // Convert the Set back to an array
    const uniqueAddresses = Array.from(addressSet);

    return uniqueAddresses;

}


/* trying replacement
function removeAlreadyClaimed(winsToClaim, claims, draw) {

  const filteredWinsToClaim = winsToClaim.filter((win) => {
    const [v, p, t] = win;
    return !claims.some(
      (claim) =>
        claim.drawId.toString() === draw.toString() &&
        claim.vault.toLowerCase() === v &&
        claim.winner.toLowerCase() === p &&
        claim.tier === t
    );
  });
  return filteredWinsToClaim;
}
*/

function removeAlreadyClaimed(winsToClaim, claims, draw) {
  const unclaimedPrizesPerTier = {};

  //console.log("Sample winsToClaim:", winsToClaim.slice(0, 2)); // Log first two entries of winsToClaim
  //console.log("Sample claims:", claims.slice(0, 2)); // Log first two entries of claims

  const filteredWinsToClaim = winsToClaim.map(([v, p, t, indices]) => {
    if (!unclaimedPrizesPerTier[t]) {
      unclaimedPrizesPerTier[t] = 0;
    }

    const unclaimedIndices = indices.filter(index => {
      const isClaimed = claims.some(claim => {
        //console.log(`Comparing: DrawID(${claim.drawId.toString()} vs ${draw.toString()}), Vault(${claim.vault.toLowerCase()} vs ${v.toLowerCase()}), Winner(${claim.winner.toLowerCase()} vs ${p.toLowerCase()}), Tier(${claim.tier} vs ${t}), Index(${claim.index} vs ${index})`);
        return claim.drawId.toString() === draw.toString() &&
               claim.vault.toLowerCase() === v.toLowerCase() &&
               claim.winner.toLowerCase() === p.toLowerCase() &&
               claim.tier === t &&
               claim.index === index;
      });

      return !isClaimed;
    });

    unclaimedPrizesPerTier[t] += unclaimedIndices.length;
    return unclaimedIndices.length > 0 ? [v, p, t, unclaimedIndices] : null;
  }).filter(win => win !== null);

  return { filteredWinsToClaim, unclaimedPrizesPerTier };
}

function createClaimableList(claimPoolers, newWinners, tierPrizeValues) {
    const filteredWinners = filterWinners(claimPoolers, newWinners);
    const groupedWinners = groupByVaultAndTier(filteredWinners, tierPrizeValues);
    return groupedWinners; 
}


function filterWinners(claimPoolers, newWinners) {
    const poolersSet = new Set(claimPoolers.map(pooler => pooler.toLowerCase()));
    return newWinners.filter(winner => poolersSet.has(winner[1].toLowerCase()));
}


function groupByVaultAndTier(filteredWinners, tierPrizeValues) {
    const groupedWinners = {};

    filteredWinners.forEach(([vault, owner, tier, indices]) => {
        const key = `${vault}_${tier}`;
        if (!groupedWinners[key]) {
            groupedWinners[key] = {
                vault,
                tier,
                tierValue: tierPrizeValues[tier], // Include tierValue here
                winners: [],
                indices: []
            };
        }


        const ownerIndex = groupedWinners[key].winners.indexOf(owner.toLowerCase());
        if (ownerIndex === -1) {
            groupedWinners[key].winners.push(owner.toLowerCase());
            groupedWinners[key].indices.push(indices);
        } else {
            // Append new indices to the existing array for this winner
            groupedWinners[key].indices[ownerIndex].push(...indices);
        }
    });

    console.log("grouped winners", groupedWinners);

    // Convert the object to an array
    return Object.values(groupedWinners);
}



function splitGroupsByMaxIndices(groupedWinners, tierPrizeValues, MAX_CLAIM_INDICES) {
    const finalArray = [];

    Object.values(groupedWinners).forEach(group => {
        let currentIndices = [];
        let currentWinners = [];

        for (let idx = 0; idx < group.winners.length; idx++) {
            const winner = group.winners[idx];
            const indices = group.indices[idx];

            indices.forEach(index => {
                if (currentIndices.length < MAX_CLAIM_INDICES) {
                    currentIndices.push(index);
                    if (!currentWinners.includes(winner)) {
                        currentWinners.push(winner);
                    }
                } else {
                    finalArray.push({
                        vault: group.vault,
                        tier: group.tier,
                        tierValue: tierPrizeValues[group.tier],
                        winners: [...currentWinners],
                        indices: [...currentIndices]
                    });
                    currentIndices = [index];
                    currentWinners = [winner];
                }
            });
        }

        // Add the last group if it has any indices
        if (currentIndices.length > 0) {
            finalArray.push({
                vault: group.vault,
                tier: group.tier,
                tierValue: tierPrizeValues[group.tier],
                winners: currentWinners,
                indices: currentIndices
            });
        }
    });

    return finalArray;
}








function countPrizesByTier(data) {
  const prizeCounts = {};

  for (const item of data) {
    const tier = item[2];
    const prizeIndices = item[3];
    const numPrizesWon = prizeIndices.length;

    if (!prizeCounts[tier]) {
      prizeCounts[tier] = 0;
    }

    prizeCounts[tier] += numPrizesWon;
  }

  return prizeCounts;
}

function checkTierLiquidity(prizesByTier, tierPrizeValues, tierRemainingLiquidities) {
  const tiersWithIssues = [];

  Object.keys(prizesByTier).forEach(tier => {
    const numPrizes = prizesByTier[tier];
    const prizeValue = tierPrizeValues[tier];
    const remainingLiquidity = tierRemainingLiquidities[tier];
    
    // Calculate total claimable value for this tier
    const totalClaimableValue = numPrizes * prizeValue;

    if (totalClaimableValue > remainingLiquidity) {
      console.log(`Liquidity Issue Detected in Tier ${tier}: Total Claimable Value (${(totalClaimableValue/1e18).toFixed(4)}) exceeds Remaining Liquidity (${(remainingLiquidity/1e18).toFixed(4)})`);
      tiersWithIssues.push(tier);
    }
  });

  return tiersWithIssues;
}

function removeBlacklistedWinners(filteredWinsToClaim, blacklist) {
  return filteredWinsToClaim.filter(win => {
    // Access the winner's address using the .winner property
    const winnerAddress = win[1];
    // Return true for wins whose winner's address is not in the blacklist
    return !blacklist.includes(winnerAddress.toLowerCase());
  });
}
 
runClaims()
const interval = RETRY * 60 * 1000; // Convert minutes to milliseconds

// Set up the interval to run the function
const intervalId = setInterval(runClaims, interval);
