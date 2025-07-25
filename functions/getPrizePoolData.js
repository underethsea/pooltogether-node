const { CONTRACTS } = require("../constants/contracts");
const { ADDRESS } = require("../constants/address");
const { Multicall } = require("../utilities/multicall")

const {getChainConfig } = require('../chains');

const CHAINNAME = getChainConfig().CHAINNAME;

const GetPrizePoolData = async (block="latest") => {
  let
    lastAwardedDrawAwardedAt,
    lastCompletedDrawStartedAt,
    drawPeriodSeconds,
    lastDrawId,
    numberOfTiers,
    grandPrizePeriod,
    prizePoolPrizeTokenBalance,
    accountedBalance,
    reserve,
    prizesForTier = [],
    tierTimestamps = [],
    maxFee = [] ,
    prizeSizes = [],
    tierPrizeValues = [],
    tierRemainingLiquidites = [],
    maxFeePortionOfPrize
 try {
    [
      //maxFee,
      lastAwardedDrawAwardedAt,
      //lastCompletedDrawStartedAt,
      drawPeriodSeconds,
      lastDrawId,
      numberOfTiers,
      // grandPrizePeriod,
      prizePoolPrizeTokenBalance,
      accountedBalance,
      reserve,
      maxFeePortionOfPrize,
      firstDrawOpensAt,
      lastAwardedDrawAwardedAt
    ] = await Multicall([
      //CONTRACTS.CLAIMER[CHAINNAME].computeMaxFee({blockTag: block}),
      CONTRACTS.PRIZEPOOL[CHAINNAME].lastAwardedDrawAwardedAt({blockTag: block}),
      CONTRACTS.PRIZEPOOL[CHAINNAME].drawPeriodSeconds({blockTag: block}),
      CONTRACTS.PRIZEPOOL[CHAINNAME].getLastAwardedDrawId({blockTag: block}),
      CONTRACTS.PRIZEPOOL[CHAINNAME].numberOfTiers({blockTag: block}),
      // CONTRACTS.PRIZEPOOL[CHAINNAME].grandPrizePeriodDraws({blockTag: block}),
      CONTRACTS.PRIZETOKEN[CHAINNAME].balanceOf(
        ADDRESS[CHAINNAME].PRIZEPOOL,{blockTag: block}
      ),
      CONTRACTS.PRIZEPOOL[CHAINNAME].accountedBalance({blockTag: block}),
      CONTRACTS.PRIZEPOOL[CHAINNAME].reserve({blockTag: block}),
      CONTRACTS.CLAIMER[CHAINNAME].maxFeePortionOfPrize({blockTag: block}),
      CONTRACTS.PRIZEPOOL[CHAINNAME].firstDrawOpensAt({blockTag: block}),
      CONTRACTS.PRIZEPOOL[CHAINNAME].lastAwardedDrawAwardedAt({blockTag: block}),
    ]);

lastCompletedDrawStartedAt = parseInt(firstDrawOpensAt) + ((lastDrawId) * parseInt(drawPeriodSeconds))
// Create an array to hold all the multicall requests
const multicallRequests = [];
console.log("number of tiers",numberOfTiers)
// Iterate over the tiers
// for (let tier = 0; tier < numberOfTiers; tier++) {

//   multicallRequests.push(CONTRACTS.PRIZEPOOL[CHAINNAME].calculateTierTwabTimestamps(tier,{blockTag: block}));

//   // multicallRequests.push(CONTRACTS.CLAIMER[CHAINNAME].computeMaxFee(tier));

//   // multicallRequests.push(CONTRACTS.PRIZEPOOL[CHAINNAME].getTierPrizeCount(tier));
//   multicallRequests.push(CONTRACTS.PRIZEPOOL[CHAINNAME].getTierPrizeSize(tier));


// }
// // Make the multicall
// const multicallResult = await Multicall(multicallRequests);
// console.log("multicall",multicallResult)
// for (let i = 0; i < numberOfTiers; i++) {
//   const startIndex = i * 2; // Each tier has four multicall requests

//   const startTimestamp = multicallResult[startIndex].startTimestamp;
//   console.log("start time",startTimestamp)
//   const endTimestamp = multicallResult[startIndex].endTimestamp;
//   // const fee = multicallResult[startIndex + 1];
//   // const prizeCount = multicallResult[startIndex + 2];
//   const prizeSize = multicallResult[startIndex + 1]

//   tierTimestamps.push({ startTimestamp, endTimestamp });
//   console.log("timestamps?",tierTimestamps)
//   maxFee.push(fee);
//   // prizesForTier.push(prizeCount);
//   prizeSizes.push(prizeSize)
// }

// for (let tier = 0; tier < numberOfTiers; tier++) {
//   prizesForTier.push(4 ** tier);
// }

for (let tier = 0; tier < numberOfTiers; tier++) {
  // multicallRequests.push(CONTRACTS.PRIZEPOOL[CHAINNAME].calculateTierTwabTimestamps(tier, { blockTag: block }));
  multicallRequests.push(CONTRACTS.PRIZEPOOL[CHAINNAME].getTierAccrualDurationInDraws(tier,{blockTag: block}))
  multicallRequests.push(CONTRACTS.PRIZEPOOL[CHAINNAME].getTierPrizeSize(tier,{blockTag: block}));
  multicallRequests.push(CONTRACTS.PRIZEPOOL[CHAINNAME].getTierPrizeCount(tier,{blockTag: block}));
  //multicallRequests.push(CONTRACTS.CLAIMER[CHAINNAME].computeMaxFee(tier));
   multicallRequests.push(CONTRACTS.PRIZEPOOL[CHAINNAME].getTierRemainingLiquidity(tier,{blockTag: block}));

}

// Make the multicall
const multicallResult = await Multicall(multicallRequests);
const drawClosesAt = await CONTRACTS.PRIZEPOOL[CHAINNAME].drawClosesAt(lastDrawId,{blockTag: block});
for (let i = 0; i < numberOfTiers; i++) {
  const startIndex = i * 4;

  const startTimestamp = drawClosesAt - (multicallResult[startIndex] * drawPeriodSeconds);
  const endTimestamp = drawClosesAt;
  const prizeSize = multicallResult[startIndex + 1];
  const prizeCount = multicallResult[startIndex + 2];
  //const tierMaxClaimFee = multicallResult[startIndex + 3];
  const tierRemainingLiquidity = multicallResult[startIndex + 3];
  console.log("tier ", i, " prize size ", (Number(prizeSize) / 1e18).toFixed(6), " remaining liquidity ", (Number(tierRemainingLiquidity)/ 1e18).toFixed(5),
" max fee ",((Number(prizeSize) / 1e18) * (Number(maxFeePortionOfPrize) / 1e18)).toFixed(7));

  tierTimestamps.push({ startTimestamp, endTimestamp });
  prizeSizes.push(prizeSize)
  prizesForTier.push(prizeCount)
  //maxFee.push(tierMaxClaimFee)
  tierRemainingLiquidites.push(tierRemainingLiquidity)
}
//console.log("max fees",maxFee)
//console.log("timestamps?",tierTimestamps)
// console.log("prize sizes?",prizeSizes)
  } catch (error) {
    console.log("Error fetching data:", error);
  }


  /*console.log(
    "draw started ",
    lastCompletedDrawStartedAt.toString(),
    " prize period in seconds ",
    drawPeriodSeconds.toString()
  );*/

  console.log("tiers ", numberOfTiers.toString());

  console.log(
    "prizepool ",ADDRESS[CHAINNAME].PRIZETOKEN.SYMBOL," balance ",
    (prizePoolPrizeTokenBalance / 1e18).toFixed(2),
    " accounted balance ",
    (accountedBalance / 1e18).toFixed(2),
    " reserve ",
    (reserve / 1e18).toFixed(2)
  );

  const now = Math.floor(Date.now() / 1000); // convert current time to seconds
// console.log("now",now)
// console.log("last completed draw started at",lastCompletedDrawStartedAt.toString())
// console.log("draw period seconds",drawPeriodSeconds)

//console.log("last awarded draw awarded at",lastAwardedDrawAwardedAt.toString())
  const timeSinceLastDrawStarted =
    now - lastCompletedDrawStartedAt - drawPeriodSeconds;
  const timeUntilNextDraw = drawPeriodSeconds - timeSinceLastDrawStarted;
const timeSinceAwarding = (now - parseInt(lastAwardedDrawAwardedAt)) / 60 / 60
console.log("Prize pool was awarded",timeSinceAwarding.toFixed(2),"hours ago")
/*
  console.log(
    `Time since open draw started ${Math.round(
      timeSinceLastDrawStarted / 60
    )} minutes`,
    ` Time until next draw ${Math.round(timeUntilNextDraw / 60)} minutes`
  );*/
  console.log();

  //console.log("max claim fees ", maxFee)
  console.log("completed draw id", lastDrawId.toString());
  console.log("");
  for (q = 0; q < numberOfTiers; q++) {


    const tierValue = await CONTRACTS.PRIZEPOOL[CHAINNAME].getTierPrizeSize(q,{blockTag: block})
 tierPrizeValues.push(tierValue);


  //   console.log(
  //     "tier ",
  //     q,
  //     "  value ",
  //     parseFloat(tierValue) / 1e18,
  //     " expected frequency ",
  //     frequency,
  //     " twab time ",
  //     tierTimestamps[q]?.startTimestamp.toString(),
  //     " - ",
  //     tierTimestamps[q]?.endTimestamp.toString()
  //   );

}

/*  console.log("lastDrawId:", lastDrawId);
  console.log("numberOfTiers:", numberOfTiers);
  console.log("tierTimestamps:", tierTimestamps);
  console.log("lastCompletedDrawStartedAt:", lastCompletedDrawStartedAt);
  console.log("drawPeriodSeconds:", drawPeriodSeconds);
  console.log("grandPrizePeriod:", grandPrizePeriod);
  console.log("tierPrizeValues:", tierPrizeValues);
  console.log("prizesForTier:", prizesForTier);
  console.log("maxFee:", maxFee);
  */
  return {
    lastDrawId,
    numberOfTiers,
    tierTimestamps,
    //lastCompletedDrawStartedAt,
    drawPeriodSeconds,
    grandPrizePeriod,
    tierPrizeValues,
    prizesForTier,
    //maxFee,
tierRemainingLiquidites,
reserve
  };
};

const calculateTierFrequency = (t, n, g) => {
  const e = Math.E;
  const odds = e ** ((t - n + 1) * Math.log(1 / g)) / (1 - n);
  return odds;
};

module.exports = { GetPrizePoolData };
