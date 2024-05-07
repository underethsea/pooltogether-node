const { CONTRACTS } = require("../constants/contracts")
const { ADDRESS } = require("../constants/address")
const { CONFIG } = require("../constants/config")
const { ABI } = require("../constants/abi")
const { ethers } = require("ethers")
const { GeckoIDPrices } = require("../utilities/geckoFetch")
const { Multicall } = require("../utilities/multicall")

const findVaultByAddress = (address, chain) => {
    const vaults = ADDRESS[chain].VAULTS;
    //console.log("vaults", vaults);
    const foundVault = vaults.find(
      (vault) =>
        vault.VAULT.toLowerCase() === address.toLowerCase()
    );
    if (foundVault) {
      return foundVault;
    }
}

async function GetVaultsApr(chain) {

const drawLength = await CONTRACTS.PRIZEPOOL[chain].drawPeriodSeconds()
console.log("draw period",drawLength)
const drawId = await CONTRACTS.PRIZEPOOL[chain].getOpenDrawId()

const vaultAddresses = ADDRESS[chain].VAULTS
const draws = 7    // 7 day apr
let multiCalls = []
vaultAddresses.forEach(vault=>{
const vaultAd = vault.VAULT
        if(vaultAd.length > 0){
	console.log("adding vault ",vaultAd)
	multiCalls.push(CONTRACTS.PRIZEPOOL[chain].getContributedBetween(vault.VAULT,drawId-draws,drawId))
}})
const multicallResults = await Multicall(multiCalls,chain)
console.log("multicall rsults ",multicallResults.map(result=>result.toString()))
return
console.log("contribut",contribution)

//const vaultContract = new ethers.Contract(
// get POOL price and vault asset price
let poolPrice
let assetPrice
try{
const pool = "pooltogether" 
const asset = findVaultByAddress(vault).GECKO
const prices = await GeckoIDPrices([pool,asset])
poolPrice = prices[0].price
assetPrice = prices[1].price
}catch(e){console.log("error fetching prices for apr calc",e)}

console.log("pool price", poolPrice)
console.log("asset price", assetPrice)
console.log("contribution from draw",drawStart," to ", drawEnd," ",contribution.toString())

// get gecko prices


// account for yield fee percentage
}

/*
export async function GetVaultTvl(chain) {
    const denomination = "usd";  // Replace with your preferred denomination.
  
    let calls = [];
    const vaultContracts = CONTRACTS.VAULTS[chain];
  
    vaultContracts.map((vault: any) => {
      calls.push(vault.VAULT.totalAssets());
    });
  
    // const prices = await FetchPricesForChain(chain, denomination);
  
    let results = (await Multicall(calls, chain))
.map((balanceResult:any, index) => {
        const address = ADDRESS[chain].VAULTS[index];
        const priceInfo = prices.find(price => price.vaultAddress === address.VAULT);
        const price = priceInfo ? priceInfo.price : 0;
      
        const balance = formatUnits(balanceResult, address.DECIMALS); // Convert BigNumber to a decimal string
  const tvl = parseFloat(balance);  // convert to number after adjustment
  const value = tvl * price;
  
      return {
        icon: address.ICON,
        vault: address.VAULT,
        decimals: address.DECIMALS,
        symbol: address.SYMBOL,
        name: address.NAME,
      };
    });
  
    return results;
  }
*/

const vaultG = "0x31515cfC4550d9C83E2d86E8a352886d1364E2D9"
//async function test(){console.log(await getVaultApr("OPTIMISM",vaultG,15,31))}
//test()

module.exports = { GetVaultsApr }
