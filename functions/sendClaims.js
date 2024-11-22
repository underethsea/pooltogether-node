const fs = require("fs");

const { CONTRACTS } = require("../constants/contracts");
const { CONFIG } = require("../constants/config");
const { ADDRESS } = require("../constants/address.js");
const { ABI } = require("../constants/abi");
const { PROVIDERS, SIGNER } = require("../constants/providers");
//console.log(ABI.VAULT)
const chalk = require("chalk");
//const ethers = require("ethers");
// const { BuildTxForSwap } = require("../utilities/1inchSwap.js");
const { GetLogs } = require("../utilities/getLogs");
const { AlchemyTransactionReceipt } = require("../utilities/alchemy");
//const { web3GasEstimate } = require("../utilities/web3");
const { GetRecentClaims } = require("./getRecentClaims");
const { GasEstimate } = require("../utilities/gas.js");

const { getChainConfig } = require("../chains");

const NodeCache = require("node-cache");
const { ethers } = require("ethers");

// Initialize the cache with a suitable TTL (e.g., 30 minutes)
const myCache = new NodeCache({ stdTTL: 1800 }); // Cache expires in 30 minutes

const CHAINNAME = getChainConfig().CHAINNAME;
const CHAINID = getChainConfig().CHAINID;

let PRIORITYFEE = CONFIG.PRIORITYFEE;
if (CHAINID === 100) {
  PRIORITYFEE = "1";
}
const PRIORITYFEEPARSED = ethers.utils.parseUnits(PRIORITYFEE, 9);

const section = chalk.hex("#47FDFB");

const {
  MINPROFIT,
  MINPROFITPERCENTAGE,
  // MAXWINNERS,
  MAXINDICES,
  //USESANTA,
  LAST_IN_LINE,
} = CONFIG;

// const PRIZETOKEN_ADDRESS = ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS;
const PRIZETOKEN_SYMBOL = ADDRESS[CHAINNAME].PRIZETOKEN.SYMBOL;

const chalkProfit = (message) => {
  console.log(chalk.green(message));
};

const chalkLoss = (message) => {
  console.log(chalk.red(message));
};

/*
// todo batch claims to CONFIG.BATCHSIZE
const SendClaims = async (
  drawId,
  vaultWins,
  //maxFee,
  prizeTokenPrice,
  ethPrice
) => {
  console.log(
    PRIZETOKEN_SYMBOL + " price $",
    prizeTokenPrice,
    " eth price $",
    ethPrice
  );

  let feeRecipient = CONFIG.WALLET;
  console.log("total wins to claim ", vaultWins.length);
  // console.log("vault wins",vaultWins)

  // Group data by vault and tier
  const groupedData = groupDataByVaultAndTier(vaultWins);
  // console.log(groupedData);


  for (const key in groupedData) {
    const group = groupedData[key];
    let { vault, tier, winners, prizeIndices } = group;
    const claimerContract = await getClaimerContract(vault)


    const { finalWinners, finalPrizeIndices } = processWinnersAndPrizes(
      winners,
      prizeIndices,
      MAXINDICES,
      LAST_IN_LINE
    );
    
    // Now finalWinners and finalPrizeIndices are ready for use, and respect MAXINDICES

    winners = finalWinners;
    prizeIndices = finalPrizeIndices;

    // console.log(winners)
    // console.log(prizeIndices)

// todo look at skippin this and basing it on gas estimate
    let minFeePerPrizeToClaim = await claimerContract.computeFeePerClaim(tier, prizeIndices.flat().length);
    //minFeeToClaim = minFeeToClaim.div(prizeIndices.flat().length)
    //minFeeToClaim = ethers.BigNumber.from(minFeeToClaim); // ensure it's a BigNumber

    //const totalIndices = [].concat(...prizeIndices).length;
    //const totalIndicesBN = ethers.BigNumber.from(totalIndices.toString()); // converting to BigNumber
    //minFeeToClaim = ethers.BigNumber.from(minFeeToClaim.toString());

    // console.log(minFeeToClaim, typeof minFeeToClaim, minFeeToClaim._isBigNumber);

    //minFeeToClaim = minFeeToClaim.div(totalIndicesBN);

    console.log("");
    logTransactionParameters(vault, tier, finalWinners, finalPrizeIndices, feeRecipient, minFeePerPrizeToClaim);

    console.log(section("     ---- profitability -----"));


  

    const { estimatedPrizeTokenReward, estimateNetFromClaims, estimateNetPercentage } =
    await calculateGasAndProfitability(claimerContract, vault, tier, winners, prizeIndices, feeRecipient, minFeePerPrizeToClaim, ethPrice, prizeTokenPrice);
  

    //ETH: ${totalGasCostEther.toFixed(2)}

    //  let txToEstimate = contract.populateTransaction.claimPrizes(vault, tier, winners, prizeIndices, feeRecipient, minFeeToClaim);
    //let estimate = await estimateGas(txToEstimate)

    //console.log(estimateNetFromClaims,">",MINPROFIT)
    logProfitability(estimateNetFromClaims, MINPROFIT, estimateNetPercentage, MINPROFITPERCENTAGE);
    if (
      estimateNetFromClaims > MINPROFIT &&
      estimateNetPercentage > MINPROFITPERCENTAGE
    ) {
      console.log(
        "minimum profit met, estimated net after costs = $",
        estimateNetFromClaims
      );
      console.log(
        "sending claim on vault ",
        vault,
        " for tier ",
        tier,
        " fee recipient",
        feeRecipient,
        " min fee per prize",
        Number(minFeePerPrizeToClaim)
      );
      //console.log("winners ",winners)
      //console.log("prize indices being claimed",prizeIndices)
      console.log();

      //return

      // crop to max indices

let finalWinners = [];
let finalPrizeIndices = [];

let remainingPrizeIndices = prizeIndices; // Track remaining prize indices
let currentTotalIndices = 0;


      for (let i = 0; i < winners.length; i++) {
        const currentIndices = prizeIndices[i];

        // Check if adding the entire list of currentIndices would exceed the max limit
        if (currentTotalIndices + currentIndices.length <= MAXINDICES) {
          finalWinners.push(winners[i]);
          finalPrizeIndices.push(currentIndices);
          currentTotalIndices += currentIndices.length;
        } else {
          // Add as many indices as possible without exceeding the limit
          const remainingSpace = MAXINDICES - currentTotalIndices;
          finalWinners.push(winners[i]);
          finalPrizeIndices.push(currentIndices.slice(0, remainingSpace));
          break; // Exit the loop as we've reached the MAXINDICES limit
        }
      }

      let receipt;

      //return // to not send claims (for testing)

      const recentClaims = await GetRecentClaims(CHAINID, -100000);
      const hasBeenClaimed = checkIfWinHasBeenClaimed(
        drawId,
        recentClaims,
        vault,
        tier,
        finalWinners,
        finalPrizeIndices
      );

      if (hasBeenClaimed) {
        console.log("! Aborted ! Wins recently claimed");
      } else {
        // END SANTA CLAIM PROB REMOVE THIS NOW

        // return
        let tx;
        console.log(
          "sending w gas limit of ",
          700000 + 149000 * (prizeIndices.flat().length - 1),
          "for ",
          prizeIndices.flat().length - 1,
          "prizes"
        );
console.log("RETURNING FOR DEBUG");return;
        try {
          tx = await claimerContract.claimPrizes(
            vault,
            tier,
            finalWinners,
            finalPrizeIndices,
            feeRecipient,
            minFeePerPrizeToClaim,
            {
              gasLimit: BigInt(
                700000 + 149000 * (prizeIndices.flat().length - 1)
              ),
              maxPriorityFeePerGas: PRIORITYFEEPARSED,
            }
          );
          receipt = await tx.wait();
          //console.log("receipt",receipt)
        } catch (e) {
          console.log(e);
        }
      }

if (receipt ){
console.log("got receipt")
//&& receipt.gasUsed !== undefined) {
//  await processReceipt(receipt, ethPrice, prizeTokenPrice);

  // Remove claimed indices and recheck for remaining ones
console.log("prize indices",prizeIndices.flat().length)
console.log("prize ind",prizeIndices)
console.log("finalPrizeIndices",finalPrizeIndices.flat().length)
  remainingPrizeIndices = filterClaimedIndices(prizeIndices, finalPrizeIndices);

console.log("remaining prize indices",remainingPrizeIndices.length)
  if (remainingPrizeIndices.length > 0) {
    console.log("More prize indices detected for the same vault/tier, rechecking profitability...");
    
    // Loop through remaining prize indices and try claiming again if profitable
    prizeIndices = remainingPrizeIndices;
    winners = finalWinners; // Reuse the same winners
    continue; // Repeat the claim process for remaining prize indices
  
} else {
  console.log(
    "......not above profit threshold of $",
    MINPROFIT.toFixed(2),
    " & ",
    (MINPROFITPERCENTAGE * 100).toFixed(2) + "%"
  );
}

        console.log(
          "......estimateNetFromClaims: $",
          estimateNetFromClaims.toFixed(2),
          //hoestimateNetFromClaims.toFixed(2),
          " & ",
          (estimateNetPercentage * 100).toFixed(2),
          //(hoestimateNetPercentage * 100).toFixed(2),
          "%"
        );
      }
      await delay(3500); // wait 3.5 seconds before next call becaus 1inch api
    } else {
      console.log(
        "minimum profit NOT met, estimated net = $",
        estimateNetFromClaims.toFixed(2),
        " | MINPROFIT",
        MINPROFIT,
        " %"+
        MINPROFITPERCENTAGE
      );
    }
    await delay(600); // wait .6 seconds so to not overload RPC calls per second
  }
  return;
};

*/

const SendClaims = async (drawId, vaultWins, prizeTokenPrice, ethPrice) => {
  console.log("total wins to claim ", vaultWins.length);

  // Group data by vault and tier
  const groupedData = groupDataByVaultAndTier(vaultWins);

  for (const key in groupedData) {
    const group = groupedData[key];
    let { vault, tier, winners, prizeIndices } = group;

    const claimerContract = await getClaimerContract(vault);

    // Create batches upfront
    const batches = createClaimBatches(winners, prizeIndices, MAXINDICES);

    // Iterate over each batch
    for (const batch of batches) {
      const { winners: batchWinners, prizeIndices: batchPrizeIndices } = batch;

      console.log(
        `Processing batch with ${batchWinners.length} winners and ${
          batchPrizeIndices.flat().length
        } indices`
      );

      // Calculate gas and profitability for the batch
      const minFeePerPrizeToClaim = await claimerContract.computeFeePerClaim(
        tier,
        batchPrizeIndices.flat().length
      );
      const profitabilityData = await calculateGasAndProfitability(
        claimerContract,
        vault,
        tier,
        batchWinners,
        batchPrizeIndices,
        CONFIG.WALLET,
        minFeePerPrizeToClaim,
        ethPrice,
        prizeTokenPrice
      );

      const { estimateNetFromClaims, estimateNetPercentage } =
        profitabilityData;

      if (
        estimateNetFromClaims > MINPROFIT &&
        estimateNetPercentage > MINPROFITPERCENTAGE
      ) {
        console.log("Sending claim for this batch...");

        // Send claim transaction for this batch
        let tx, receipt;
        //console.log("RETURN FOR DEBUG");return
        try {
          tx = await claimerContract.claimPrizes(
            vault,
            tier,
            batchWinners,
            batchPrizeIndices,
            CONFIG.WALLET,
            minFeePerPrizeToClaim,
            {
              gasLimit: BigInt(
                700000 + 149000 * (batchPrizeIndices.flat().length - 1)
              ),
              maxPriorityFeePerGas: PRIORITYFEEPARSED,
            }
          );
          receipt = await tx.wait();
          console.log(
            `Claim transaction successful: ${receipt.transactionHash}`
          );

          // Process the receipt (log gas usage, prize amounts, etc.)
          await processReceipt(receipt, ethPrice, prizeTokenPrice);
        } catch (error) {
          console.log("Error sending claim:", error);
        }
      } else {
        console.log(
          `Profitability threshold not met for this batch. Skipping...`
        );
      }

      // Optionally delay between batches to avoid hitting RPC rate limits
      await delay(600);
    }
  }
};

function groupDataByVaultAndTier(vaultWins) {
  return vaultWins.reduce((groups, entry) => {
    const [vault, winner, tier, prizeIndicesForWinner] = entry;

    const key = `${vault}-${tier}`;
    if (!groups[key]) {
      groups[key] = {
        vault,
        tier,
        winners: [],
        prizeIndices: [],
      };
    }

    const group = groups[key];
    const winnerIndex = group.winners.indexOf(winner);
    if (winnerIndex === -1) {
      group.winners.push(winner);
      group.prizeIndices.push(prizeIndicesForWinner);
    } else {
      group.prizeIndices[winnerIndex].push(...prizeIndicesForWinner);
    }
    return groups;
  }, {});
}

// use to send 1inch contract swap to different address than config.wallet
function replaceAddressInCalldata(data, originalAddress, replacementAddress) {
  // Ensure addresses are properly checksummed
  originalAddress = ethers.utils.getAddress(originalAddress);
  replacementAddress = ethers.utils.getAddress(replacementAddress);

  // Convert addresses to stripped, lowercase form (remove '0x' prefix)
  let strippedOriginal = originalAddress.slice(2).toLowerCase();
  let strippedReplacement = replacementAddress.slice(2).toLowerCase();

  // Replace and return the updated calldata
  return data.split(strippedOriginal).join(strippedReplacement);
}

function checkIfWinHasBeenClaimed(
  drawId,
  recentClaims,
  vault,
  tier,
  finalWinners,
  finalPrizeIndices
) {
  for (let i = 0; i < finalWinners.length; i++) {
    const winner = finalWinners[i];
    const indices = finalPrizeIndices[i];

    for (const index of indices) {
      const claim = recentClaims.find(
        (claim) =>
          claim.vault === vault &&
          claim.tier === tier &&
          claim.winner === winner &&
          claim.index === index &&
          claim.drawId === drawId
      );

      if (claim) {
        console.log("Win has already been claimed:", claim);
        return true; // Win has been claimed
      }
    }
  }
  return false; // Win has not been claimed
}

// Function to process winners and prize indices
function processWinnersAndPrizes(
  winners,
  prizeIndices,
  maxIndices,
  lastInLineList
) {
  let lastInLineWinners = [];
  let regularWinners = [];
  let lastInLinePrizeIndices = [];
  let regularPrizeIndices = [];

  for (let i = 0; i < winners.length; i++) {
    const winner = winners[i];
    const indices = prizeIndices[i];

    if (lastInLineList.includes(winner)) {
      lastInLineWinners.push(winner);
      lastInLinePrizeIndices.push(indices);
    } else {
      regularWinners.push(winner);
      regularPrizeIndices.push(indices);
    }
  }

  winners = [...regularWinners, ...lastInLineWinners];
  prizeIndices = [...regularPrizeIndices, ...lastInLinePrizeIndices];

  const flatPrizeIndices = prizeIndices.flat();
  const limitedPrizeIndices = flatPrizeIndices.slice(0, maxIndices);

  const newPrizeIndices = Array(winners.length)
    .fill()
    .map(() => []);
  limitedPrizeIndices.forEach((index, i) => {
    newPrizeIndices[i % winners.length].push(index);
  });

  const finalWinners = winners.filter((_, i) => newPrizeIndices[i].length > 0);
  const finalPrizeIndices = newPrizeIndices.filter(
    (indices) => indices.length > 0
  );

  return { finalWinners, finalPrizeIndices };
}

async function calculateGasAndProfitability(
  claimerContract,
  vault,
  tier,
  winners,
  prizeIndices,
  feeRecipient,
  minFeePerPrizeToClaim,
  ethPrice,
  prizeTokenPrice
) {
  const feeEstimate = await claimerContract.callStatic.claimPrizes(
    vault,
    tier,
    winners,
    prizeIndices,
    feeRecipient,
    minFeePerPrizeToClaim
  );

  const estimatedPrizeTokenReward =
    parseInt(feeEstimate) /
    Math.pow(10, ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS);

  const args = [
    vault,
    tier,
    winners,
    prizeIndices,
    feeRecipient,
    minFeePerPrizeToClaim,
  ];

  const web3TotalGasCost = await GasEstimate(
    claimerContract,
    "claimPrizes",
    args,
    PRIORITYFEE
  );

  const web3TotalGasCostUSD =
    (Number(web3TotalGasCost).toFixed(2) * ethPrice) / 1e18;

  console.log(
    "Gas Estimate  " +
      web3TotalGasCost.toString() +
      "wei ($" +
      web3TotalGasCostUSD.toFixed(2) +
      ")",
    " @ $" + ethPrice,
    "ETH"
  );

  const estimateNetFromClaims =
    prizeTokenPrice * estimatedPrizeTokenReward - web3TotalGasCostUSD;
  const estimateNetPercentage =
    (prizeTokenPrice * estimatedPrizeTokenReward) / web3TotalGasCostUSD;

  console.log(
    PRIZETOKEN_SYMBOL,
    "reward ",
    estimatedPrizeTokenReward,
    " ($" +
      (prizeTokenPrice * estimatedPrizeTokenReward).toFixed(2) +
      ") @ $" +
      prizeTokenPrice,
    PRIZETOKEN_SYMBOL
  );

  return {
    estimatedPrizeTokenReward,
    estimateNetFromClaims,
    estimateNetPercentage,
  };
}

// Utility function for logging transaction parameters
const logTransactionParameters = (
  vault,
  tier,
  winners,
  prizeIndices,
  feeRecipient,
  minFeePerPrizeToClaim
) => {
  console.log(section("   ---- transaction parameters -----"));
  console.log("vault ", vault, "tier ", tier);
  console.log("winners ", winners);
  console.log("prize indices being claimed", prizeIndices);
  console.log(
    "fee recipient",
    feeRecipient,
    "min fee",
    minFeePerPrizeToClaim.toString()
  );
  console.log(
    "..... winners ",
    winners.length,
    " indices ",
    prizeIndices.flat().length
  );
};

// Utility function for logging profitability
const logProfitability = (
  estimateNetFromClaims,
  MINPROFIT,
  estimateNetPercentage,
  MINPROFITPERCENTAGE
) => {
  console.log(section("     ---- profitability -----"));
  if (
    estimateNetFromClaims > MINPROFIT &&
    estimateNetPercentage > MINPROFITPERCENTAGE
  ) {
    console.log(
      "minimum profit met, estimated net after costs = $",
      estimateNetFromClaims
    );
  } else {
    console.log(
      "minimum profit NOT met, estimated net = $",
      estimateNetFromClaims.toFixed(2),
      " | MINPROFIT",
      MINPROFIT,
      " %",
      MINPROFITPERCENTAGE
    );
  }
};

async function processReceipt(receipt, ethPrice, prizeTokenPrice) {
  let L2transactionCost,
    alchemyReceipt,
    L1transactionCost,
    totalTransactionCost;
  try {
    console.log("tx hash", receipt.transactionHash);
    L2transactionCost =
      Number(receipt.gasUsed * receipt.effectiveGasPrice) / 1e18;

    //console.log(ethers.utils.formatEther(l2CostActual))

    /*
const l1CostActual = receipt.l1Fee
console.log("l1 fee",ethers.utils.formatEther(l1CostActual))

const totalActual = receipt.gasUsed.mul(receipt.effectiveGasPrice).add(l1CostActual)
console.log("total gas cost",ethers.utils.formatEther(totalActual))
*/

    alchemyReceipt = await AlchemyTransactionReceipt(receipt.transactionHash);
    //console.log("receipt?",alchemyReceipt)
    //console.log("receipt result?",alchemyReceipt.result)
    L1transactionCost = Number(alchemyReceipt.result.l1Fee) / 1e18;

    console.log("L2 Gas fees (in ETH) " + L2transactionCost);
    console.log("L1 Gas fees (in ETH) " + L1transactionCost);

    totalTransactionCost = L2transactionCost + L1transactionCost;
    totalTransasactionCostDollar = totalTransactionCost * ethPrice;

    console.log(
      "Total Gas fees " +
        totalTransactionCost +
        "($" +
        totalTransasactionCostDollar +
        ")"
    );
  } catch (e) {
    console.log("error with alchemy receipt", e);
  }
  try {
    // todo not right
    console.log(
      // "tx",
      // receipt.transactionHash,
      " gas used",
      receipt.gasUsed.toString()
    ); //, " tx cost $",transactionCost.toFixed(4))
    let totalPayout = 0;
    let totalFee = 0;
    const logs = GetLogs(receipt, ABI.PRIZEPOOL);
    logs.forEach((log) => {
      if (log.name === "ClaimedPrize") {
        const payout = parseInt(log.args.payout);
        const fee = parseInt(log.args.claimReward);
        totalPayout += payout;
        totalFee += fee;
        console.log(
          "prize payout ",
          payout > 0
            ? (payout / ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS).toFixed(6)
            : "canary",
          " fee collected ",
          (fee / ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS).toFixed(6)
        );
      }
    });

    // File path for storing claim logs
    const dataFilePath = "./data/claim-history.json";

    // Initialization
    let fileData = [];
    if (fs.existsSync(dataFilePath)) {
      fileData = JSON.parse(fs.readFileSync(dataFilePath, "utf-8"));
    }

    // Store data
    fileData.push({
      txHash: receipt.transactionHash,
      prizes: logs.length,
      totalPayout: totalPayout,
      totalFee: totalFee,
      totalGasETH: totalTransactionCost,
      ethPrice: ethPrice,
      poolPrice: prizeTokenPrice,
      time: Date.now(),
    });

    // Save data back to file
    fs.writeFileSync(dataFilePath, JSON.stringify(fileData, null, 2));

    console.log(
      "total payout ",
      (totalPayout / ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS).toFixed(6),
      " total fee collected ",
      (totalFee / ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS).toFixed(6)
    );

    const netFromClaims =
      (totalFee / ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS) * prizeTokenPrice -
      totalTransactionCost * ethPrice;
    const netFromClaimMessage =
      "$" +
      (
        prizeTokenPrice *
        (totalFee / ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS)
      ).toFixed(4) +
      " fee collected  - $" +
      (ethPrice * totalTransactionCost).toFixed(4) +
      " gas cost = $" +
      netFromClaims.toFixed(4) +
      " net";
    netFromClaims > 0
      ? console.log(chalkProfit(netFromClaimMessage))
      : console.log(chalkLoss(netFromClaimMessage));
    return;
  } catch (e) {
    console.log(e);
  }
}

async function getClaimerContract(vaultAddress) {
  try {
    // Check the cache for the claimer address
    const cacheKey = `claimer_${vaultAddress}`;
    let claimerAddress = myCache.get(cacheKey);

    if (claimerAddress) {
      console.log("Using cached claimer address " + claimerAddress);
    } else {
      // If not cached, fetch the claimer address from the vault contract
      const vaultContract = new ethers.Contract(
        vaultAddress,
        ABI.VAULT,
        PROVIDERS[CHAINNAME]
      );
      claimerAddress = await vaultContract.claimer();

      // Convert claimer address to lowercase
      claimerAddress = claimerAddress.toLowerCase();

      // Verify the claimer address is in the array ADDRESS[CHAINNAME].CLAIMERS
      const validClaimers = ADDRESS[CHAINNAME].CLAIMERS.map((addr) =>
        addr.toLowerCase()
      );
      if (!validClaimers.includes(claimerAddress)) {
        console.warn(
          `Claimer address ${claimerAddress} is not in the valid claimers list. Using default claimer address.`
        );
        claimerAddress = validClaimers[0]; // Use the first address from the valid claimers list
      }

      // Store the claimer address in the cache
      myCache.set(cacheKey, claimerAddress);
      console.log("Updated cache for claimer " + claimerAddress);
    }

    // Create and return the claimer contract object
    return new ethers.Contract(claimerAddress, ABI.CLAIMER, SIGNER);
  } catch (error) {
    console.error("Error fetching claimer address:", error);
    throw error; // Re-throw the error after logging it
  }
}

function filterClaimedIndices(remainingIndices, claimedIndices) {
  return remainingIndices
    .map((indices, index) => {
      const claimedForWinner = claimedIndices[index] || []; // Get the claimed indices for the current winner or default to an empty array
      return indices.filter((i) => !claimedForWinner.includes(i)); // Filter out claimed indices for this winner
    })
    .filter((arr) => arr.length > 0); // Remove empty arrays where all indices were claimed
}

function createClaimBatches(winners, prizeIndices, maxIndices) {
  let batches = [];
  let currentBatchWinners = [];
  let currentBatchPrizeIndices = [];
  let currentTotalIndices = 0;

  for (let i = 0; i < winners.length; i++) {
    const currentWinner = winners[i];
    const currentIndices = prizeIndices[i];

    // Split current indices into smaller chunks if they exceed maxIndices
    let remainingIndices = [...currentIndices]; // copy the current winner's indices

    while (remainingIndices.length > 0) {
      const availableSpace = maxIndices - currentTotalIndices;

      if (remainingIndices.length <= availableSpace) {
        // Add remaining indices to the current batch
        currentBatchWinners.push(currentWinner);
        currentBatchPrizeIndices.push(remainingIndices);
        currentTotalIndices += remainingIndices.length;
        remainingIndices = [];
      } else {
        // Split the current winner's indices to fit the current batch
        const indicesForBatch = remainingIndices.slice(0, availableSpace);
        remainingIndices = remainingIndices.slice(availableSpace);

        currentBatchWinners.push(currentWinner);
        currentBatchPrizeIndices.push(indicesForBatch);
        currentTotalIndices += indicesForBatch.length;
      }

      // If the current batch is full, push it to the batches array and start a new batch
      if (currentTotalIndices >= maxIndices) {
        batches.push({
          winners: [...currentBatchWinners],
          prizeIndices: [...currentBatchPrizeIndices],
        });

        // Reset batch variables
        currentBatchWinners = [];
        currentBatchPrizeIndices = [];
        currentTotalIndices = 0;
      }
    }
  }

  // Add the last batch if it's not empty
  if (currentBatchWinners.length > 0) {
    batches.push({
      winners: [...currentBatchWinners],
      prizeIndices: [...currentBatchPrizeIndices],
    });
  }

  return batches;
}

module.exports = { groupDataByVaultAndTier };

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = { SendClaims };
