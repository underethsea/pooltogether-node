require('../env-setup');
const { ethers } = require('ethers');

// Define the constants for each chain
const chains = {
  OPTIMISM: {
    rpcEndpoint: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
    wallet: '0x67CdC1dC837e0d6362bf046E1195C7aCD08Af06d',
    swapper: '0xf152CEC8B04695705772012764D2ABE2e5cbfd38',
    wethAddress: '0x4200000000000000000000000000000000000006',
  },
  BASE: {
    rpcEndpoint: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
    wallet: '0x67CdC1dC837e0d6362bf046E1195C7aCD08Af06d',
    swapper: '0xf152CEC8B04695705772012764D2ABE2e5cbfd38',
    wethAddress: '0x4200000000000000000000000000000000000006',
  },
  ARBITRUM: {
    rpcEndpoint: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
    wallet: '0x67CdC1dC837e0d6362bf046E1195C7aCD08Af06d',
    swapper: '0xf152CEC8B04695705772012764D2ABE2e5cbfd38',
    wethAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  }
};

// ERC20 ABI for balanceOf function
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

// Function to get the balances
async function getBalances() {
  let totalEthAcrossChains = ethers.BigNumber.from(0);

  for (const [chainName, chainInfo] of Object.entries(chains)) {
    const provider = new ethers.providers.JsonRpcProvider(chainInfo.rpcEndpoint);

    try {
      // Get ETH balance of the wallet
      const walletEthBalance = await provider.getBalance(chainInfo.wallet);

      // Instantiate WETH contract
      const wethContract = new ethers.Contract(chainInfo.wethAddress, ERC20_ABI, provider);

      // Get WETH balance of the wallet
      const walletWethBalance = await wethContract.balanceOf(chainInfo.wallet);

      // Get WETH balance of the swapper
      const swapperWethBalance = await wethContract.balanceOf(chainInfo.swapper);

      // Calculate total ETH for this chain (ETH + WETH)
      const totalEthForChain = walletEthBalance.add(walletWethBalance).add(swapperWethBalance);
      totalEthAcrossChains = totalEthAcrossChains.add(totalEthForChain);

      console.log(`\nBalances on ${chainName}:`);
      console.log(`ETH balance of wallet: ${ethers.utils.formatEther(walletEthBalance)} ETH`);
      console.log(`WETH balance of wallet: ${ethers.utils.formatEther(walletWethBalance)} WETH`);
      console.log(`WETH balance of swapper: ${ethers.utils.formatEther(swapperWethBalance)} WETH`);
      console.log(`Total ETH (ETH + WETH) on ${chainName}: ${ethers.utils.formatEther(totalEthForChain)} ETH`);
    } catch (error) {
      console.error(`Error fetching balances on ${chainName}:`, error);
    }
  }

  console.log(`\nTotal ETH across all chains (ETH + WETH): ${ethers.utils.formatEther(totalEthAcrossChains)} ETH`);
}

// Run the balance fetcher
getBalances();
