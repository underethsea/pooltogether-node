const { loadChainConfig, getChainConfig } = require("../chains");

const chainKey = process.argv[2] || "";

try {
  // Load the configuration with the provided chainKey or default
  loadChainConfig(chainKey);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`);
  process.exit(1);
}

const CHAINNAME = getChainConfig().CHAINNAME;

const { CONFIG } = require("../constants/config");
const { ADDRESS } = require("../constants/address.js");
const { ethers } = require("ethers");
const { ABI } = require("../constants/abi");
const { SIGNER } = require("../constants/providers");

// Helper function to introduce a delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function approveSwappers(spenders) {
  const swapperAddress = CONFIG.SWAPPERS[CHAINNAME];
  const swapperContract = new ethers.Contract(
    swapperAddress,
    ABI.SWAPPER,
    SIGNER
  );

  // Prize token address to ignore
  const prizeTokenAddress = ADDRESS[CHAINNAME].PRIZETOKEN.ADDRESS;

  // Extract unique assets from VAULTS, BOOSTS, and PAIRS
  const chainData = ADDRESS[CHAINNAME];
  const uniqueAssets = new Set();

  if (chainData.VAULTS) {
    chainData.VAULTS.forEach((vault) => {
      if (
        vault.ASSET !== prizeTokenAddress &&
        vault.LIQUIDATIONPAIR !== "0x0000000000000000000000000000000000000000"
      ) {
        uniqueAssets.add(vault.ASSET);
      }
    });
  }

  if (chainData.BOOSTS) {
    chainData.BOOSTS.forEach((boost) => {
      if (
        boost.ASSET !== prizeTokenAddress &&
        boost.LIQUIDATIONPAIR !== "0x0000000000000000000000000000000000000000"
      ) {
        uniqueAssets.add(boost.ASSET);
      }
    });
  }

  if (chainData.PAIRS) {
    chainData.PAIRS.forEach((pair) => {
      if (
        pair.ASSET !== prizeTokenAddress &&
        pair.LIQUIDATIONPAIR !== "0x0000000000000000000000000000000000000000"
      ) {
        uniqueAssets.add(pair.ASSET);
      }
    });
  }

  // Loop through each unique asset and call .approve() for each spender
  for (const assetAddress of uniqueAssets) {
    for (const spender of spenders) {
      try {
        // Static call to check if the approval would succeed
        await swapperContract.callStatic.approveToken(
          assetAddress,
          spender,
          ethers.constants.MaxUint256
        );
        console.log(
          `Static call succeeded for approving ${assetAddress} for spender ${spender} on chain ${CHAINNAME}`
        );

        // Send the transaction for approval with maxPriorityFeePerGas included
        const tx = await swapperContract.approveToken(
          assetAddress,
          spender,
          ethers.constants.MaxUint256,
          {
            maxPriorityFeePerGas: ethers.BigNumber.from("1000001"),
          }
        );
        console.log(
          `Approved ${assetAddress} for spender ${spender} on chain ${CHAINNAME}: Transaction hash: ${tx.hash}`
        );
        const result = await tx.wait();
        // Introduce a delay between transactions
        await delay(2100); // 2-second delay
      } catch (error) {
        console.error(
          `Failed to approve ${assetAddress} for spender ${spender} on chain ${CHAINNAME}: ${error.message}`
        );
      }
    }
  }
}

// Manual function to approve a specific asset for a specific spender
async function approveSingleAsset(assetAddress, spender) {
  try {
    const swapperAddress = CONFIG.SWAPPERS[CHAINNAME];
    const swapperContract = new ethers.Contract(
      swapperAddress,
      ABI.SWAPPER,
      SIGNER
    );

    // Static call to check if the approval would succeed
    await swapperContract.callStatic.approveToken(
      assetAddress,
      spender,
      ethers.constants.MaxUint256
    );
    console.log(
      `Static call succeeded for approving ${assetAddress} for spender ${spender} on chain ${CHAINNAME}`
    );

    // Send the transaction for approval with maxPriorityFeePerGas included
   /* const tx = await swapperContract.approveToken(
      assetAddress,
      spender,
      ethers.constants.MaxUint256,
      {
        maxPriorityFeePerGas: ethers.BigNumber.from("1000001"),
      }
    );
    const result = await tx.wait();
    console.log(
      `Approved ${assetAddress} for spender ${spender} on chain ${CHAINNAME}: Transaction hash: ${tx.hash}`
    );*/
  } catch (error) {
    console.error(
      `Failed to approve ${assetAddress} for spender ${spender} on chain ${CHAINNAME}: ${error.message}`
    );
  }
}

// Example usage: replace with actual spender addresses
// optimism
//const spenders = ["0x6A000F20005980200259B80c5102003040001068","0xCa423977156BB05b13A2BA3b76Bc5419E2fE9680"]
//base
//const spenders = ["0x6A000F20005980200259B80c5102003040001068","0x19cEeAd7105607Cd444F5ad10dd51356436095a1"]
// arb
const spenders = [
  "0x6A000F20005980200259B80c5102003040001068",
  "0xa669e7A0d4b3e4Fa48af2dE86BD4CD7126Be4e13",
];
approveSwappers(spenders);

// address,spender

//approveSingleAsset("0x4200000000000000000000000000000000000042", "0x6A000F20005980200259B80c5102003040001068");
