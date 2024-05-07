require('../env-setup');
const { ADDRESS } = require("../constants/address")
const { CONFIG } = require("../constants/config")
const { SIGNER } = require("../constants/providers")
const { ABI } = require("../constants/abi")
const {ethers} = require("ethers")


const swapAmount = 1000000000000000000
const swapFromAddress = CONFIG.WALLET
const chainId = CONFIG.CHAINID
const PRIZETOKEN = ADDRESS[CONFIG.CHAINNAME].PRIZETOKEN.ADDRESS
const ONEINCH_ROUTER_ADDRESS = '0x1111111254EEB25477B68fb85Ed929f73A960582'

/*
const swapParams = {
  src: PRIZETOKEN, // Token address of  PRIZE TOKEN
  dst: ADDRESS[CONFIG.CHAINNAME].WETH,  // Token address of WETH
  amount: swapAmount, // Amount of 1INCH to swap (in wei)
  from: swapFromAddress,
  slippage: 1, // Maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
  disableEstimate: false, // Set to true to disable estimation of swap details
  allowPartialFill: false, // Set to true to allow partial filling of the swap order
};
*/
async function approve() {
const signer = SIGNER
    const poolToken = new ethers.Contract(PRIZETOKEN, ABI.POOL, SIGNER);

    console.log("Approving...");
    try{
    const approveTx = await poolToken.approve(ONEINCH_ROUTER_ADDRESS, '1000000000000000000000000'); // todo max approve?
    const receipt = await approveTx.wait();
    console.log("approved ",receipt.transactionHash)
    }catch(e){console.log("error in approval",e)}
}

const broadcastApiUrl = "https://api.1inch.dev/tx-gateway/v1.1/" + chainId + "/broadcast";
const apiBaseUrl = "https://api.1inch.dev/swap/v5.2/" + chainId;
function apiRequestUrl(methodName, queryParams) {
  return apiBaseUrl + methodName + "?" + new URLSearchParams(queryParams).toString();
}

const headers = { headers: { Authorization: "Bearer " + process.env.ONEINCH_KEY, accept: "application/json" } };


async function BuildTxForSwap(swapParams) {
    const url = apiRequestUrl("/swap", swapParams);

    try {
        // Log the request for debugging purposes
        console.log(`Fetching swap transaction details from URL: ${url}`);

        const response = await fetch(url, headers);
//console.log(response)
        // Check if the response status is not OK (status code not in the range 200-299)
if (!response.ok) {
    const errorBody = await response.text();  // Try to get additional error details
    throw new Error(`API request failed with status ${response.status}: ${response.statusText}. Body: ${errorBody}`);
}
        const data = await response.json();

        // Optional: Log the received data for debugging purposes
        //console.log('Received data:', data);

        return data.tx;
    } catch (error) {
        console.error('Error occurred while building transaction for swap:', error);
        throw error;  // Re-throw the error if you want to handle it further up in the call stack
    }
}

async function swap() {console.log(await BuildTxForSwap(swapParams))}
//swap()
//approve()

module.exports = {BuildTxForSwap}
/*const swapParams = {
    src: PRIZETOKEN, // Token address of  PRIZE TOKEN
    dst: ADDRESS[CONFIG.CHAINNAME].WETH,  // Token address of WETH
    amount: "1000000000000000000", // Amount of 1INCH to swap (in wei)
    from: ADDRESS[CONFIG.CHAINNAME].PRIZESANTA,
    //from: CONFIG.WALLET,
    slippage: 10, // Maximum acceptable slippage percentage for the swap (e.g., 1 for 1%)
    disableEstimate: false, // Set to true to disable estimation of swap details
    allowPartialFill: false, // Set to true to allow partial filling of the swap order
  };

BuildTxForSwap(swapParams).then(ok=>console.log(ok))
*/
