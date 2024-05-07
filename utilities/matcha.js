const fetch = require("cross-fetch");
const qs = require('qs');
const {SIGNER} = require("../constants/providers")
const {CONFIG} = require("../constants/config")
require('dotenv').config({ path: '../.env' });

/* 
https://0x.org/docs/0x-swap-api/api-references/overview
Ethereum (Mainnet)	https://api.0x.org/
Ethereum (Goerli)	https://goerli.api.0x.org/
Polygon	https://polygon.api.0x.org/
Polygon (Mumbai)	https://mumbai.api.0x.org/
Binance Smart Chain	https://bsc.api.0x.org/
Optimism	https://optimism.api.0x.org/
Fantom	https://fantom.api.0x.org/
Celo	https://celo.api.0x.org/
Avalanche	https://avalanche.api.0x.org/
Arbitrum	https://arbitrum.api.0x.org/ */

async function matchaQuote(sellToken,buyToken,sellAmountInWei){

 try {
        const quoteFetchUrl = `https://optimism.api.0x.org/swap/v1/price?sellToken=${sellToken}&buyToken=${buyToken}&sellAmount=${sellAmountInWei}`;
        
        const response = await fetch(quoteFetchUrl, {
            method: 'GET',
            headers: {
                '0x-api-key': MATCHA_KEY
            }
        });


// const fetched = await fetch(quoteFetchUrl)
const fetchResult = await response.json()
console.log(fetchResult)



//example 2
const params = {
    // Not all token symbols are supported. The address of the token should be used instead.
    sellToken: sellToken, 
    buyToken: buyToken, //WETH
    // Note that the DAI token uses 18 decimal places, so `sellAmount` is `100 * 10^18`.
    sellAmount: sellAmountInWei,
    takerAddress: CONFIG.WALLET, //Including takerAddress is highly recommended to help with gas estimation, catch revert issues, and provide the best price
};

const headers = {
    '0x-api-key': MATCHA_KEY
};
const response2 = await fetch(
    `https://optimism.api.0x.org/swap/v1/quote?${qs.stringify(params)}`, { headers }
); // Using the global fetch() method. Learn more https://developer.mozilla.org/en-US/docs/Web/API/fetch

console.log(await response2.json());


    }catch(e){console.log(e)}
}

async function go(){
    /// approve 0x router
console.log(SIGNER)
const USDC_CONTRACT = new ethers.Contract("0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",["function approve(address _spender, uint256 _value) public returns (bool)"],SIGNER)   
console.log("got contract")
 const approval = await USDC_CONTRACT.approve("0xdef1abe32c034e558cdd535791643c58a13acc10",20000000)
   const tx = await approval.wait()
console.log(tx)    
await matchaQuote("USDC","0x395Ae52bB17aef68C2888d941736A71dC6d4e125",70*1e18)
}
go()

