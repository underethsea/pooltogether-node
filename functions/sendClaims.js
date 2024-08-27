const fs = require("fs");

const { CONTRACTS } = require("../constants/contracts");
const { CONFIG } = require("../constants/config");
const { ADDRESS } = require("../constants/address.js");
const { ABI } = require("../constants/abi");
const { PROVIDERS, SIGNER } = require("../constants/providers")
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

const NodeCache = require('node-cache');
const { ethers } = require('ethers');

// Initialize the cache with a suitable TTL (e.g., 30 minutes)
const myCache = new NodeCache({ stdTTL: 1800 }); // Cache expires in 30 minutes

const CHAINNAME = getChainConfig().CHAINNAME;
const CHAINID = getChainConfig().CHAINID;

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
    // Separate the last-in-line winners
    let lastInLineWinners = [];
    let regularWinners = [];
    let lastInLinePrizeIndices = [];
    let regularPrizeIndices = [];

    for (let i = 0; i < winners.length; i++) {
      const winner = winners[i];
      const indices = prizeIndices[i];

      if (LAST_IN_LINE.includes(winner)) {
        console.log(winner, " moved to back of the line");
        lastInLineWinners.push(winner);
        lastInLinePrizeIndices.push(indices);
      } else {
        regularWinners.push(winner);
        regularPrizeIndices.push(indices);
      }
    }

    // Sort regular winners as needed

    // Append last-in-line winners to the end
    winners = [...regularWinners, ...lastInLineWinners];
    prizeIndices = [...regularPrizeIndices, ...lastInLinePrizeIndices];

    const originIndiceLength = prizeIndices.flat().length;
    /*
    winners = winners.slice(0, MAXWINNERS);
    prizeIndices = prizeIndices.slice(0, MAXWINNERS);
    const totalPrizes = prizeIndices.flat().length;
    const originIndiceLength = prizeIndices.flat().length;

    // Calculate the number of batches needed
    const numBatches = Math.ceil(totalPrizes / MAXINDICES);

    // Calculate prizes per batch (as evenly distributed as possible)
    const basePrizesPerBatch = Math.floor(totalPrizes / numBatches);
    let extraPrizes = totalPrizes % numBatches;

    let finalWinners = [];
    let finalPrizeIndices = [];
    let currentTotalIndices = 0;

    for (let i = 0; i < winners.length; i++) {
      let prizesForThisBatch = basePrizesPerBatch;
      if (extraPrizes > 0) {
        prizesForThisBatch++;
        extraPrizes--;
      }
      const currentIndices = prizeIndices[i];

      if (currentTotalIndices + currentIndices.length <= prizesForThisBatch) {
        finalWinners.push(winners[i]);
        finalPrizeIndices.push(currentIndices);
        currentTotalIndices += currentIndices.length;
      } else {
        const remainingSpace = prizesForThisBatch - currentTotalIndices;
        finalWinners.push(winners[i]);
        finalPrizeIndices.push(currentIndices.slice(0, remainingSpace));
        currentTotalIndices += remainingSpace;
      }

      if (currentTotalIndices === prizesForThisBatch) {
        currentTotalIndices = 0;
      }
    }

*/

    // Flatten prizeIndices for easy manipulation while keeping track of original indices
    const flatPrizeIndices = [];
    const originalIndexMap = []; // Maps flattened index back to original [winnerIndex, prizeIndex]
    prizeIndices.forEach((indices, winnerIndex) => {
      indices.forEach((index) => {
        flatPrizeIndices.push(index);
        originalIndexMap.push([winnerIndex, index]);
      });
    });

    // If the total exceeds MAXINDICES, slice the arrays to limit the total indices
    const limitedPrizeIndices = flatPrizeIndices.slice(0, MAXINDICES);
    const limitedIndexMap = originalIndexMap.slice(0, MAXINDICES);

    // Reconstruct the prizeIndices array to match the winners array structure, now limited by MAXINDICES
    const newPrizeIndices = Array(winners.length)
      .fill()
      .map(() => []);
    limitedIndexMap.forEach(([winnerIndex, index]) => {
      newPrizeIndices[winnerIndex].push(index);
    });

    // Filter out winners without prizeIndices after the limit
    const finalWinners = winners.filter(
      (_, i) => newPrizeIndices[i].length > 0
    );
    const finalPrizeIndices = newPrizeIndices.filter(
      (indices) => indices.length > 0
    );

    // Now finalWinners and finalPrizeIndices are ready for use, and respect MAXINDICES

    winners = finalWinners;
    prizeIndices = finalPrizeIndices;

    // console.log(winners)
    // console.log(prizeIndices)

    let minFeePerPrizeToClaim = await claimerContract.computeFeePerClaim(tier, prizeIndices.flat().length);
    //minFeeToClaim = minFeeToClaim.div(prizeIndices.flat().length)
    //minFeeToClaim = ethers.BigNumber.from(minFeeToClaim); // ensure it's a BigNumber

    //const totalIndices = [].concat(...prizeIndices).length;
    //const totalIndicesBN = ethers.BigNumber.from(totalIndices.toString()); // converting to BigNumber
    //minFeeToClaim = ethers.BigNumber.from(minFeeToClaim.toString());

    // console.log(minFeeToClaim, typeof minFeeToClaim, minFeeToClaim._isBigNumber);

    //minFeeToClaim = minFeeToClaim.div(totalIndicesBN);

    console.log("");
    console.log(section("   ---- transaction parameters -----"));

    if (prizeIndices.flat().length < originIndiceLength) {
      console.log("prize claims cropped to max indices of ", MAXINDICES);
    }

    console.log("vault ", vault, "tier ", tier);
    console.log("winners ", winners);
    console.log("prize indices being claimed", prizeIndices);
    console.log(
      "fee recipient",
      feeRecipient,
      "min fee",
      minFeePerPrizeToClaim.toString()
    );

    //console.log("gas limit with +2%",gasLimitWithBuffer)
    console.log(
      "..... winners ",
      winners.length,
      " indices ",
      prizeIndices.flat().length
    );

    console.log(section("     ---- profitability -----"));

    let feeEstimate = await claimerContract.callStatic.claimPrizes(
      vault,
      tier,
      winners,
      prizeIndices,
      feeRecipient,
      minFeePerPrizeToClaim
    );

    //console.log("fee estimate",feeEstimate)
    const estimatedPrizeTokenReward = parseInt(feeEstimate) / 1e18;

    // backtest winners
    /*for (const key in groupedData) {
    const group = groupedData[key];
    const { vault, tier, winners, prizeIndices } = group;

    for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        const winnerPrizeIndices = prizeIndices[i];

        for (const prizeIndex of winnerPrizeIndices) {
            // Call the isWinner function
            const isActualWinner = await CONTRACTS.PRIZEPOOL["OPGOERLI"].isWinner(vault, winner, tier, prizeIndex);

            if (!isActualWinner) {
                console.error(`Error: Winner ${winner} with prize index ${prizeIndex} in vault ${vault} and tier ${tier} was not an actual winner!`);
            } else {
                console.log(`Confirmed: Winner ${winner} with prize index ${prizeIndex} in vault ${vault} and tier ${tier} is a valid winner.`);
            }
        }
    }
        }*/

    /*const gasPrice = await gasPriceNow()

        const gasPriceToSend = ethers.utils.parseUnits(
          gasPrice.toString(),
          "gwei"
        );
        */

    // Specify the function and its arguments
    const functionName = "claimPrizes";
    const args = [
      vault,
      tier,
      winners,
      prizeIndices,
      feeRecipient,
      minFeePerPrizeToClaim,
    ];

    // Encode the function call
    const data = claimerContract.interface.encodeFunctionData(functionName, args);

    // calculate total gas cost in wei
    /*console.log("gas estimate",CONTRACTS.CLAIMER[CHAINNAME].address,
      "claimPrizes",
      args,
      CONFIG.PRIORITYFEE,
      500000 + (50000*prizeIndices.flat()-1))
*/
    const web3TotalGasCost = await GasEstimate(
      claimerContract,
      "claimPrizes",
      args,
      CONFIG.PRIORITYFEE
      //{},
      //500000 + (50000*prizeIndices.flat()-1),
    );

    /*    const web3TotalGasCost = await web3GasEstimate(
      data,
      CHAINID,
      CONFIG.WALLET,
      ADDRESS[CHAINNAME].CLAIMER
    );
*/
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
    //ETH: ${totalGasCostEther.toFixed(2)}

    //  let txToEstimate = contract.populateTransaction.claimPrizes(vault, tier, winners, prizeIndices, feeRecipient, minFeeToClaim);
    //let estimate = await estimateGas(txToEstimate)

    //console.log(estimateNetFromClaims,">",MINPROFIT)
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
              maxPriorityFeePerGas: "1000001",
            }
          );
          receipt = await tx.wait();
          //console.log("receipt",receipt)
        } catch (e) {
          console.log(e);
        }
      }
      if (receipt && receipt.gasUsed !== undefined) {
        await processReceipt(receipt, ethPrice, prizeTokenPrice);
      } else {
        console.log(
          "......not above profit threshold of $",
          MINPROFIT.toFixed(2),
          " & ",
          (MINPROFITPERCENTAGE * 100).toFixed(2)+
          "%"
        );
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
          payout > 0 ? (payout / 1e18).toFixed(6) : "canary",
          " fee collected ",
          (fee / 1e18).toFixed(6)
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
      (totalPayout / 1e18).toFixed(6),
      " total fee collected ",
      (totalFee / 1e18).toFixed(6)
    );

    const netFromClaims =
      (totalFee / 1e18) * prizeTokenPrice - totalTransactionCost * ethPrice;
    const netFromClaimMessage =
      "$" +
      (prizeTokenPrice * (totalFee / 1e18)).toFixed(4) +
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
            console.log('Using cached claimer address ' + claimerAddress);
        } else {
            // If not cached, fetch the claimer address from the vault contract
            const vaultContract = new ethers.Contract(vaultAddress, ABI.VAULT, PROVIDERS[CHAINNAME]);
            claimerAddress = await vaultContract.claimer();

            // Convert claimer address to lowercase
            claimerAddress = claimerAddress.toLowerCase();

            // Verify the claimer address is in the array ADDRESS[CHAINNAME].CLAIMERS
            const validClaimers = ADDRESS[CHAINNAME].CLAIMERS.map(addr => addr.toLowerCase());
            if (!validClaimers.includes(claimerAddress)) {
                console.warn(`Claimer address ${claimerAddress} is not in the valid claimers list. Using default claimer address.`);
                claimerAddress = validClaimers[0]; // Use the first address from the valid claimers list
            }

            // Store the claimer address in the cache
            myCache.set(cacheKey, claimerAddress);
            console.log('Updated cache for claimer ' + claimerAddress);
        }

        // Create and return the claimer contract object
        return new ethers.Contract(claimerAddress, ABI.CLAIMER, SIGNER);
    } catch (error) {
        console.error('Error fetching claimer address:', error);
        throw error; // Re-throw the error after logging it
    }
}

module.exports = { groupDataByVaultAndTier };

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = { SendClaims };
