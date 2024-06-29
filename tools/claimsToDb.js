
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


const {GetRecentClaims} = require("../functions/getRecentClaims.js")
const {AddClaim} = require("../functions/dbDonkey.js")
const {DiscordNotifyClaimPrize } = require("../functions/discordAlert.js")
/*const chainId = 10
const draw = 51
const prizepool = "0xF35fE10ffd0a9672d0095c435fd8767A7fe29B55"
*/

/*const chainId= 42161
const draw = 9
const prizepool = "0x52e7910c4c287848c8828e8b17b8371f4ebc5d42"
*/

/*
const chainId = 8453
const draw = 23 
const prizepool = "0x45b2010d8a4f08b53c9fa7544c51dfd9733732cb"
*/
const chainId = 42161
const draw = 20
const prizepool = "0x52e7910c4c287848c8828e8b17b8371f4ebc5d42"
async function insertClaims(chainId,prizePool,fromBlock=-200000,toBlock="latest") {
  const claims = await GetRecentClaims(chainId,fromBlock,toBlock)
  console.log("got claims",claims.length)
const filteredClaims = claims.filter(claim => claim.drawId === draw);
console.log("filtered for draw ", draw, " = ",filteredClaims.length)
  for(let x=0;x<filteredClaims.length;x++) {
    filteredClaims[x].network = chainId
    //console.log(claims[0])

    await AddClaim(chainId,prizePool,filteredClaims[x])
    if(filteredClaims[x].payout.gt(0)){
     await DiscordNotifyClaimPrize(filteredClaims[x])}    
  }
  console.log("added all claims")
}

insertClaims(chainId,prizepool)
