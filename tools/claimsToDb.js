
const {GetRecentClaims} = require("../functions/getRecentClaims.js")
const {AddClaim} = require("../functions/dbDonkey.js")
const {DiscordNotifyClaimPrize } = require("../functions/discordAlert.js")
const chainId = 10
const draw = 1
const prizepool = "0xF35fE10ffd0a9672d0095c435fd8767A7fe29B55"

async function insertClaims(chainId,prizePool,fromBlock=-200000,toBlock="latest") {
  const claims = await GetRecentClaims(chainId,fromBlock,toBlock)
  console.log("got claims",claims.length)
const filteredClaims = claims.filter(claim => claim.drawId === draw);
console.log("filtered for draw ", draw, " = ",filteredClaims.length)
  for(let x=0;x<filteredClaims.length;x++) {
    filteredClaims[x].network = chainId
    //console.log(claims[0])

    //await AddClaim(chainId,prizePool,filteredClaims[x])
    if(filteredClaims[x].payout.gt(0)){
     await DiscordNotifyClaimPrize(filteredClaims[x])}    
  }
  console.log("added all claims")
}

insertClaims(chainId,prizepool)
