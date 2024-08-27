const NodeCache = require("node-cache");
const { getChainConfig } = require("./chains");
const { CONTRACTS } = require("./constants/contracts");
const { CONFIG } = require("./constants/config");
const { ADDRESS } = require("./constants/address");
const { GasEstimate } = require("./utilities/gas");
const { ethers } = require("ethers")

const maxGas = 20;
const minClaim = CONFIG.MINTOCLAIM;
const CLAIM_COST_AS_PERCENTAGE = CONFIG.CLAIM_COST_AS_PERCENTAGE; // 2 = 2%

const CHAINNAME = getChainConfig().CHAINNAME;

// Retrieve cache time from CONFIG (default to 8 hours if not specified)
const CACHE_TTL_HOURS = CONFIG.REWARDS_CLAIM_WAIT || 8;
const cache = new NodeCache({ stdTTL: CACHE_TTL_HOURS * 60 * 60 }); // TTL in seconds

async function CollectRewards(prizeTokenPrice, ethPrice) {
  const PRIZEPOOL_CONTRACT = CONTRACTS.PRIZEPOOLWITHSIGNER[CHAINNAME];

  // Check cache for the last claim timestamp
  const lastClaimTime = cache.get("lastClaimTime");

  if (lastClaimTime) {
    const nextEligibleTime = new Date(lastClaimTime + CACHE_TTL_HOURS * 60 * 60 * 1000);
    console.log(
      `Rewards were recently checked. Next eligible check after: ${nextEligibleTime.toLocaleString()}`
    );
    return;
  }

  try {
    // Get the balance of claim rewards
    const awardsBalance = await CONTRACTS.PRIZEPOOL[CHAINNAME].rewardBalance(
      process.env.WALLET
    );

    const awardsBalanceFormatted = parseFloat(awardsBalance) / 1e18;
    const awardsValueUSD = awardsBalanceFormatted * prizeTokenPrice;

    console.log(
      `Awards Balance: ${awardsBalance.toString()} (${awardsBalanceFormatted.toFixed(4)} ${
        ADDRESS[CHAINNAME].PRIZETOKEN.SYMBOL
      } - $${awardsValueUSD.toFixed(2)})`
    );

    if (awardsBalanceFormatted < minClaim) {
      console.log(
        `Not enough rewards accumulated to claim. Minimum required: ${minClaim} ${
          ADDRESS[CHAINNAME].PRIZETOKEN.SYMBOL
        }`
      );
      return;
    }

    const functionName = "withdrawRewards";
    const args = [CONFIG.WALLET, awardsBalance];

    // Calculate total gas cost in wei
    const web3TotalGasCost = await GasEstimate(
      PRIZEPOOL_CONTRACT,
      functionName,
      args,
      CONFIG.PRIORITYFEE
    );

    const web3TotalGasCostETH = parseFloat(web3TotalGasCost) / 1e18;
    const web3TotalGasCostUSD = web3TotalGasCostETH * ethPrice;

    console.log(
      `Gas Estimate: ${web3TotalGasCostETH.toFixed(6)} ETH ($${web3TotalGasCostUSD.toFixed(2)})`
    );

    const maxAcceptableGasCost =
      (awardsValueUSD * CLAIM_COST_AS_PERCENTAGE) / 100;

    if (web3TotalGasCostUSD > maxAcceptableGasCost) {
      console.log(
        `Gas cost ($${web3TotalGasCostUSD.toFixed(2)}) exceeds the maximum acceptable cost of $${maxAcceptableGasCost.toFixed(
          2
        )} (${CLAIM_COST_AS_PERCENTAGE}%)`
      );
      return;
    }

    // Proceed to claim rewards
    const transactionOptions = {
      maxPriorityFeePerGas: ethers.utils.parseUnits(CONFIG.PRIORITYFEE,9),
    };

    const submittedTx = await PRIZEPOOL_CONTRACT.withdrawRewards(
      CONFIG.WALLET,
      awardsBalance,
      transactionOptions
    );

    console.log(
      `Transaction submitted. Hash: ${submittedTx.hash}. Waiting for confirmation...`
    );

    const receipt = await submittedTx.wait();

    if (receipt.status === 1) {
      console.log(
        `Successfully claimed ${awardsBalanceFormatted.toFixed(4)} ${
          ADDRESS[CHAINNAME].PRIZETOKEN.SYMBOL
        }. Transaction Hash: ${receipt.transactionHash}`
      );
      // Update cache with the current timestamp
      cache.set("lastClaimTime", Date.now());
    } else {
      console.error("Transaction failed. Receipt:", receipt);
    }
  } catch (error) {
    console.error("Error during reward collection:", error);
  }
}

//CollectRewards(3500, 3500);

module.exports = { CollectRewards };
