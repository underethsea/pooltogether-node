
// lp address 0x22f5f609c554b89792b14b91badccaf52c156e95

const { ethers } = require('ethers');
const { SIGNER } = require('../constants/providers')

const { getAddress } = require('@ethersproject/address');
const { Token, Pool, FeeAmount, computePoolAddress, FACTORY_ADDRESS } = require('@uniswap/v3-sdk');



const POOL_ADDRESS = "0x395Ae52bB17aef68C2888d941736A71dC6d4e125"; 
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";
const ROUTER_ADDRESS = "0xE592427A0AEce92De3Edee1F18E0157C05861564";
const FEE = 10000; // 1%
const AMOUNT_IN = ethers.utils.parseEther("1"); // For example, 1 POOL. Change this based on your requirements.
const AMOUNT_OUT_MINIMUM = 0; // You can adjust this to set a minimum amount of WETH you're willing to accept for the swap.

const POOL_ABI = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    // ... any other functions you may need
];

const ROUTER_ABI = [
    "function exactInputSingle(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)",
    // ... any other functions you may need
];

async function swap() {
    //const provider = new ethers.providers.JsonRpcProvider('YOUR_RPC_URL'); // Replace with your Optimism RPC URL
    //const signer = provider.getSigner(); // This should automatically use PROVIDERS.SIGNER when in a browser environment
    const signer = SIGNER
    const poolToken = new ethers.Contract(POOL_ADDRESS, POOL_ABI, signer);
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);

/*    console.log("Approving...");
    const approveTx = await poolToken.approve(ROUTER_ADDRESS, AMOUNT_IN);
    await approveTx.wait();
*/
    console.log("Swapping...");
    const swapTx = await router.exactInputSingle(
        POOL_ADDRESS, 
        WETH_ADDRESS, 
        FEE, 
        await signer.getAddress(), 
        Date.now() + 600000, 
        AMOUNT_IN, 
        AMOUNT_OUT_MINIMUM, 
        0 // sqrtPriceLimitX96 set to 0 for no specific limit.
     ,{gasLimit:1000000}
    );

    const receipt = await swapTx.wait();

    console.log(`Swapped! Transaction hash: ${receipt.transactionHash}`);
}


swap().catch((error) => {
    console.error("Error occurred:", error);
});

/*

// Your token addresses (Make sure they are checksummed or use `getAddress` to checksum)
const TOKEN0_ADDRESS = getAddress(POOL_ADDRESS);
const TOKEN1_ADDRESS = getAddress(WETH_ADDRESS);
console.log(Token)
const TOKEN0 = new Token(10, POOL_ADDRESS, 18); // Assuming 18 decimals
const TOKEN1 = new Token(10, WETH_ADDRESS, 18); // Assuming 18 decimals

// For Uniswap V3, fees can be 500, 3000, or 10000, representing 0.05%, 0.3%, and 1% respectively.
const FEES = FeeAmount.HIGH; // e.g., 0.3% fee

const poolAddress = computePoolAddress({
    factoryAddress: FACTORY_ADDRESS,
    tokenA: TOKEN0,
    tokenB: TOKEN1,
    fee: FEES
});

console.log("Pool Address:", poolAddress);
*/
