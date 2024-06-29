const { Multicall } = require("../utilities/multicall.js");
const { CONTRACTS } = require("../constants/canaryContracts.js");
const { ADDRESS } = require("../constants/canaryAddress.js");
const { FetchPricesForChain } = require("./tokenPrices.js");
const { ethers } = require("ethers");

async function GetCanaryVaultTvl(chain) {
  try {
    const denomination = "usd"; // Replace with your preferred denomination.
    let calls = [];
    const vaultContracts = CONTRACTS.VAULTS[chain];
    // console.log(vaultContracts[0].VAULT)
    vaultContracts.forEach((vault) => {
      calls.push(vault.VAULT.totalAssets());
    });

    // Remove the return here, it should not be before the await
    // console.log("breaking here?")
    // console.log(vaultContracts[0])
                // const totalAssets = await vaultContracts[0].VAULT.totalAssets();
                // console.log("Total assets for vault 0:", totalAssets.toString());

    // This line is unnecessary because you're already awaiting inside the Multicall
    // console.log("call zero", await calls[0]);

    const prices = await FetchPricesForChain(chain, denomination);

    const assets = await Multicall(calls, chain); // This will now wait for all promises to resolve

    let results = assets.map((balanceResult, index) => {
      const address = ADDRESS[chain].VAULTS[index];
      const priceInfo = prices.find((price) => price.vaultAddress === address.VAULT);
      const price = priceInfo ? priceInfo.price : 0;

      const balance = ethers.utils.formatUnits(balanceResult, address.DECIMALS); // Convert BigNumber to a decimal string
      const tvl = parseFloat(balance); // convert to number after adjustment
      const value = tvl * price;

      return {
        price,
        tvl,
        value,
        icon: address.ICON,
        vault: address.VAULT,
        decimals: address.DECIMALS,
        symbol: address.SYMBOL,
        name: address.NAME,
      };
    });

    console.log("not making it to here");
    return results;
  } catch (error) {
    console.error("Error in GetVaultTvl:", error);
    throw error; // or handle error as needed
  }
}

module.exports = { GetCanaryVaultTvl };

// Call the function for testing
// GetCanaryVaultTvl("OPTIMISM").then((results) => console.log(results)).catch((error) => console.error(error));
