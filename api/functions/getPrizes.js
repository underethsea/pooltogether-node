const ethers = require("ethers")
const {ABI} = require("../constants/abi")
const {PROVIDERS} = require("../../constants/providers")

async function GetPrizes(chainName,prizepoolAddress) {
 const prizepoolContract = new ethers.Contract(prizepoolAddress,ABI.PRIZEPOOLFINAL,PROVIDERS[chainName])

  try {
         const [
          drawPeriodSeconds,
          nextDrawId,
          numberOfTiers,
          prizetokenAddress
        ] = await Promise.all([
          prizepoolContract.drawPeriodSeconds(),
          prizepoolContract.getOpenDrawId(),
          prizepoolContract.numberOfTiers(),
          prizepoolContract.prizeToken()
        ]);
  const prizeTokenContract = new ethers.Contract(prizetokenAddress,ABI.ERC20,PROVIDERS[chainName])
        const prizePoolPrizeBalance = await  prizeTokenContract.balanceOf(prizepoolAddress)
        let tierPrizeValues = [];
        let tierData = [];
        const multicallData = [];

        const numberOfTotalTiers= Number(numberOfTiers) || 0
        for (let q = 0; q < numberOfTotalTiers; q++) {
          let frequency = "";
        
          multicallData.push(prizepoolContract.getTierPrizeSize(q));
          multicallData.push(prizepoolContract.functions['getTierPrizeCount(uint8)'](q)), // indices
          multicallData.push(prizepoolContract.getTierRemainingLiquidity(q))
        
          const tierObj = {
            tier: q,
            value: 0, // Initialize with a default value
            //frequency: frequency,
            count: 0,
            liquidity: 0
          };
        
          tierData.push(tierObj);
        }
        
        const results = await Promise.all(multicallData);
        // console.log("multicall results",results)
        
        for (let i = 0; i < numberOfTotalTiers; i++) {
          const index = i*3
          const tierValue = results[index];
          const prizeCount = results[index+1]
          const tierLiquidity = results[index+2]
        
          tierData[i].value = parseFloat(ethers.utils.formatUnits(tierValue,18))
          tierData[i].count = parseFloat(prizeCount.toString())
          tierData[i].liquidity = parseFloat(ethers.utils.formatUnits(tierLiquidity,18))
        
          // console.log("tier data",tierData[i]);
        }
       
        const data = {
          //maxFee: null,
          drawPeriodSeconds: drawPeriodSeconds,
          nextDrawId: nextDrawId,
          numberOfTiers: numberOfTiers,
          prizePoolPrizeBalance: prizePoolPrizeBalance.toString(),
          tierData,
          //prizeTokenPrice: Number((prizeAssetPrice).price)
        };
//console.log(data)
       return data
      } catch (error) {
        console.log(error)
      }
   
}

module.exports = { GetPrizes };
 
//GetPrizes("0xe32e5E1c5f0c80bD26Def2d0EA5008C107000d6A","0x395Ae52bB17aef68C2888d941736A71dC6d4e125")
//GetPrizes("BASE","0x45b2010d8A4f08b53c9fa7544C51dFd9733732cb")
