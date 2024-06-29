const pgp = require("pg-promise")(/* initialization options */);
const ethers = require("ethers");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
var compression = require("compression");
const http = require("http");
const https = require("https");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const { FetchHolders } = require("./holders");
const { GetLidoApy } = require("./functions/getLidoApy");
const { GetZapperInfo } = require("./zapper");
const { GeckoPrice } = require("./functions/geckoFetch");
const { GetWinners } = require("./functions/getWinners");
const { GetPrizeResults } = require("./functions/getPrizeResults");
const { GetPlayers } = require("./functions/getPlayers");
const { GetPrizes } = require("./functions/getPrizes");
const { GetClaims } = require("./functions/getClaims");
const { GetTwabPromotions } = require("./functions/getTwabRewards");
const { UpdateV5Vaults } = require("./updateVaults");
const { PublishPrizeHistory } = require("./publishPrizeHistory");
const { FindAndPriceUniv2Assets } = require("./functions/uniV2Prices");
const PrizeLeaderboard = require("./functions/getPrizeLeaderboard");

const { ADDRESS, WHITELIST_REWARDS } = require("../constants/address");
const { ABI } = require("../constants/abi")
const { PROVIDERS } = require("../constants/providers")
dotenv.config();
// var sanitizer = require('sanitize');
const waitTime = 120000;
const pricesToFetch = [
  "arbitrum",
  "tether",
  "pooltogether",
  "dai",
  "usd-coin",
  "weth",
  "ethereum",
  "optimism",
  "liquity-usd",
  "wrapped-bitcoin",
  "gemini-dollar",
  "coinbase-wrapped-staked-eth",
  "aerodrome-finance",
  "wrapped-steth",
  "angle-usd"
];

const poolToken = "0x395Ae52bB17aef68C2888d941736A71dC6d4e125";

const chains = [
  // { id: 10, name: "OPTIMISM", prizePool: "" },
  {
    id: 10,
    name: "OPTIMISM",
    prizePool: "0xe32e5E1c5f0c80bD26Def2d0EA5008C107000d6A".toLowerCase(),
    subgraph:
      "https://api.studio.thegraph.com/proxy/50959/pt-v5-op/version/latest/",
    hideFromApp: true,
  },
  {
    id: 10,
    name: "OPTIMISM",
    prizePool: "0xF35fE10ffd0a9672d0095c435fd8767A7fe29B55".toLowerCase(),
    subgraph:
      "https://api.studio.thegraph.com/proxy/63100/pt-v5-optimism/version/latest/",
  },
{
id: 42161,
name: "ARBITRUM",
prizePool: ADDRESS["ARBITRUM"].PRIZEPOOL.toLowerCase(),
subgraph: ADDRESS["ARBITRUM"].PRIZEPOOLSUBGRAPH,
},
/*  {
    id: 421614,
    name: "ARBSEPOLIA",
    prizePool: ADDRESS["ARBSEPOLIA"].PRIZEPOOL.toLowerCase(),
    subgraph: ADDRESS["ARBSEPOLIA"].PRIZEPOOLSUBGRAPH,
  },*/
 {
    id: 8453,
    name: "BASE",
    prizePool: ADDRESS["BASE"].PRIZEPOOL.toLowerCase(),
    subgraph: ADDRESS["BASE"].PRIZEPOOLSUBGRAPH,
  },

  /*
{
   id:11155420,
   name: "OPSEPOLIA",
   prizePool: "0x5e1b40e4249644a7d7589d1197ad0f1628e79fb1",
   subgraph: "https://api.studio.thegraph.com/query/63100/pt-v5-op-sepolia/v0.0.5",
},*/
  /*{
  id:11155420,
   name: "OPSEPOLIA",
   prizePool: "0x9f594BA8A838D41E7781BFA2aeA42702E216AF5a".toLowerCase(),
   subgraph: "https://api.studio.thegraph.com/proxy/63100/pt-v5-op-sepolia/version/latest/"},*/
];

const app = express();

// source control - use previous calculations (json files) to rebuild API or choose db source
const useStaticFiles = true; // toggle using prize api flat file as source
const dbName = "pooltogether"; // toggle db source
const compareApiSources = false;

const allowList = ["::ffff:51.81.32.49"];
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutes
  max: 50, // Limit each IP to 60  requests per `window` (here, per 1 minutes)

  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: function (req, res /*next*/) {
    console.log("rate limit: ", req.ip);
    return res.status(429).json({
      error: "You sent too many requests. Please wait a while then try again",
    });
  },
  skip: function (request, response) {
    return allowList.includes(request.ip);
  },
});

// add for whitelisting
//  skip: function (request, response) { return allowList.includes(request.ip)}
// skip: (request, response) => allowlist.includes(request.ip),

const privateKey = fs.readFileSync(
  "/etc/letsencrypt/live/poolexplorer.xyz/privkey.pem",
  "utf8"
);
const certificate = fs.readFileSync(
  "/etc/letsencrypt/live/poolexplorer.xyz/cert.pem",
  "utf8"
);
const ca = fs.readFileSync(
  "/etc/letsencrypt/live/poolexplorer.xyz/chain.pem",
  "utf8"
);

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca,
};

// Starting both http & https servers
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);

httpServer.listen(80, () => {
  console.log("HTTP Server running on port 80");
});

httpsServer.listen(443, () => {
  console.log("HTTPS Server running on port 443");
});

const v5cnFinal = {
  host: "localhost",
  port: 5432,
  database: "v5final",
  user: "pooltogether",
  password: process.env.PASSWORD,
};
const v5dbFinal = pgp(v5cnFinal);

function delay(ms) {
  console.log("waiting", ms / 1000, "seconds");
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function go() {
  app.use(limiter);
  /*
  let newestDrawId = await getCurrentDraw();
  console.log("current draw ", newestDrawId);
*/
  try {
    await openApi();
  } catch (e) {
    console.log("express error:", e);
  }

  await update();
  await fetchAndUpdateStats();
  try {
    await openV5Pooler();
    await openPlayerEndpoints();
  } catch (e) {
    console.log(e);
  }

  // v4 version, todo update for v5
  if (compareApiSources) {
    try {
      let check = await CheckApi();
      publish(check, "/calculations");
    } catch (error) {
      console.log("calculation check failed -> \n", error);
    }
  }

  // set to 40 to run on first go and then wait 40 loops before running again
  let lessFrequentCount = 40;
  while (true) {
    // looping
    await update();
    await fetchAndUpdateStats();

    if (lessFrequentCount % 40 === 0) {
      try {
        const rewardsV5 = await GetTwabPromotions();
        publish(
          JSON.stringify(rewardsV5),
          "/twabrewards"
        );
        console.log(
          "...published ",
          "/twabrewards"
        );
      } catch (e) {
        console.log("update twab rewards failed", e);
      }

      try {
        await updateZapper();
      } catch (e) {
        console.log("zapper update failed", e);
      }
    }
    lessFrequentCount += 1;
  }
}

async function update() {
  console.log("updating ", chains.length, "chains");
  let chainDraws;

const prizepools = chains
  .filter(chain => !chain.hideFromApp)
  .map(chain => chain.prizePool);
    try {
        const leaders = await PrizeLeaderboard(prizepools);
      await publish(JSON.stringify(leaders), "/prizeleaderboard");
    } catch (error) {
        console.error("Error calling PrizeLeaderboard:", error);
   }
 let allPoolsUniqueWinners = new Set();
  for (let chain of chains) {
    let allDrawsOverview = [];
    let allDrawsOverviewClaims = [];

    chainDraws = await updateChain(chain.id, chain.prizePool);
console.log("unique winners",chainDraws.uniqueWinners)  
  // meta unique winners
if (chainDraws.uniqueWinners instanceof Set) {
      chainDraws.uniqueWinners.forEach(value => {
        allPoolsUniqueWinners.add(value);
      });
    } else {
      console.error('uniqueWinners is not a Set for chain', chain.id);
    }
    allDrawsOverview.push({ chain: chain.id, draws: chainDraws.wins });
    allDrawsOverviewClaims.push({
      chain: chain.id,
      draws: chainDraws.claims.flat(),
    });
    console.log(
      "chain draws claims for ",
      chain.id,
      chain.prizePool,
      chainDraws.claims
    );
    // Determine the path suffix based on whether prizePool is provided
    const pathSuffix = chain.prizePool ? `-${chain.prizePool}` : "";
const uniqueOverview = {total:allPoolsUniqueWinners.size}
await publish(JSON.stringify(uniqueOverview),"/totalunique")
    await publish(
      JSON.stringify(allDrawsOverview),
      `/draws-${chain.id}${pathSuffix}`
    );
    await publish(
      JSON.stringify(allDrawsOverviewClaims),
      `/claimeddraws-${chain.id}${pathSuffix}`
    );
    console.log(
      `published ${chains.length} chains draws- and claimeddraws- for`,
      pathSuffix
    );
  }
}

async function fetchAndUpdateStats() {
  let opPrice = 0;
  let poolPrice = 0;
  let priceResults = {};
  let newPrices = false;
/*  try {
    priceResults.assets = await FindAndPriceUniv2Assets();
  } catch (e) {
    console.log(e);
  }
  try {
    priceResults.geckos = await GeckoPrice(pricesToFetch);
    const chainsAssetsPrices = createChainsAssetsPrices(ADDRESS, priceResults.geckos);
    priceResults.assets = mergeChainsAssetsPrices(priceResults.assets, chainsAssetsPrices);

    // priceResults.address = await PricesFromAddress()
    // Check if all prices fetched are null
    const allNull = Object.values(priceResults).every(
      (price) => price === null
    );

    if (!allNull) {
      opPrice = priceResults["optimism"];
      poolPrice = priceResults["pooltogether"];

      // Add current date and time
      const currentTime = new Date().toISOString();
      priceResults["timestamp"] = currentTime;
      newPrices = true;
      await publish(JSON.stringify(priceResults), "/prices");
      console.log("...published /prices at", currentTime);
    } else {
      console.log("No new prices fetched. Keeping old prices.");
    }
  } catch (e) {
    console.log("price fetch bombed", e);
  }

*/


try {
  // Fetch Gecko prices
  priceResults.geckos = await GeckoPrice(pricesToFetch);
 if (priceResults.geckos && priceResults.geckos.ethereum > 0 && priceResults.geckos.optimism > 0) {

  ethPrice = priceResults.geckos["ethereum"]
    // Fetch UNI prices and convert to USD using ETH price
    let uniAssets;
    try {
      const uniPrices = await FindAndPriceUniv2Assets();
console.log("UNI PRICES",uniPrices)
console.log("eth price",ethPrice)
console.log("")
console.log("");console.log("");console.log("");console.log("");console.log("");console.log("");console.log("");console.log("")
// Flatten the uniPrices object into an array
  const flattenedUniPrices = Object.entries(uniPrices).flatMap(([chain, assets]) =>
    Object.entries(assets).map(([address, price]) => ({
      chain,
      address,
      price: parseFloat(price), // Ensure price is a number
    }))
  );  


  // Convert UNI prices to USD using ETH price
  uniAssets = flattenedUniPrices.map(asset => ({
    ...asset,
    price: asset.price * ethPrice, // Convert UNI prices to USD
  }));
    } catch (e) {
      console.log(e);
    }
console.log("uni asssets",uniAssets)
    const chainsAssetsPrices = createChainsAssetsPrices(ADDRESS, WHITELIST_REWARDS, priceResults.geckos);
console.log("created chain asset prices",chainsAssetsPrices)

    // Merge UNI and Gecko prices
    priceResults.assets = mergeChainsAssetsPrices(uniAssets, chainsAssetsPrices);

    // Add current date and time
    const currentTime = new Date().toISOString();
    priceResults["timestamp"] = currentTime;
    newPrices = true;
    await publish(JSON.stringify(priceResults), "/prices");
    console.log("...published /prices at", currentTime);

  } else {
    console.log("price is missing in Gecko prices. No new prices fetched.");
  }
} catch (e) {
  console.log("price fetch bombed=======================", e);
}

  let pendingPrize = {}
   // todo meta poolers
  let vaultOverview = [];
  for (let chain of chains) {
pendingPrize[chain.name] = {}
try{
const prizePoolContract = new ethers.Contract(chain.prizePool,ABI.PRIZEPOOL,PROVIDERS[chain.name])
const wethPrizeBalance = await prizePoolContract.accountedBalance()
pendingPrize[chain.name].total = wethPrizeBalance.toString()
console.log("got pending prize",chain.name,wethPrizeBalance.toString())
} catch(e){console.log("error trying to get prize pool totals",e)}

    let v5Prizes;
    try {
      // Fetch prizes for each chain and prize pool
      console.log("fetching GetPrizes for ", chain.name, chain.prizePool);
      v5Prizes = await GetPrizes(chain.name, chain.prizePool);
      pendingPrize[chain.name].prizes = v5Prizes
      //console.log(chain.name,"overview info",v5Prizes)
    } catch (e) {
      console.log(e);
    }
    // Update players for each chain and prize pool
    let v5Players, totalPlayers;

    // Attempt to update players
    try {
      console.log(
        "updating players for ",
        chain.id,
        chain.prizePool,
        chain.subgraph
      );
      //  [v5Players, totalPlayers]
      const playerResult = await updateV5Players(
        chain.id,
        chain.prizePool,
        chain.subgraph
      );
      v5Players = playerResult[0];
      totalPlayers = playerResult[1];
      //console.log(wtf)
      //console.log("v5players agin?",v5Players)
      //console.log("total players",totalPlayers)
      console.log("Players updated successfully for chain ", chain.id);
    } catch (error) {
      console.error(
        `Error updating players for chain ${chain.name} with prize pool ${chain.prizePool}:`,
        error.message
      );
    }
    //console.log(v5Players)
    //console.log("total players")
    //console.log(totalPlayers)
    // Only proceed with the following if updating players succeeded
    if (v5Players && totalPlayers !== undefined) {
      try {
        // Update vaults for each set of players and prize pool
        console.log("Updating vaults for chain ", chain.id);
        let v5Vaults = await UpdateV5Vaults(
          v5Players,
          chain.prizePool,
          chain.name,
          chain.id
        );

        // Publish the vaults information
        const vaultsPath = `/${chain.id}-${chain.prizePool}-vaults`;
        await publish(v5Vaults, vaultsPath);
        console.log("...published", vaultsPath);
        if (!chain.hideFromApp) {
          vaultOverview = [...vaultOverview,...v5Vaults];
        }
      } catch (error) {
        console.error(
          `Error updating and publishing vaults for chain ${chain.name} with prize pool ${chain.prizePool}:`,
          error
        );
      }
      console.log("vaults update complete");
      try {
        // Prepare and publish the summary for each chain and prize pool
        const summary = {
          poolers: totalPlayers,
          poolPrice: poolPrice, // Assuming poolPrice is defined earlier in your script
          prizeData: v5Prizes, // Assuming v5Prizes is defined and populated earlier in your script
          prices: priceResults,
        };
        const overviewPath = `/${chain.id}-${chain.prizePool}-overview`;
        await publish(summary, overviewPath);
        console.log("...published", overviewPath);
      } catch (error) {
        console.error(
          `Error publishing summary for chain ${chain.name} with prize pool ${chain.prizePool}:`,
          error
        );
      }
    }
   /* try {
      console.log("querying leaderboard for ", chain.id, chain.prizePool);
      //const leaders = await PrizeLeaderboard(chain.id, chain.prizePool);
      //const leaderboardPath = `/${chain.id}-${chain.prizePool}-prizeleaderboard`;
      await publish(JSON.stringify(leaders), leaderboardPath);
      console.log("...published", leaderboardPath);
    } catch (e) {
      console.log(e);
    }*/
  }
  await publish(vaultOverview, "/vaults");
metaOverview = {pendingPrize: pendingPrize, prices: priceResults}  
try{
await publish(JSON.stringify(metaOverview),"/overview")}catch(e){console.log("error publishing meta overview /overview",e)}

  await delay(60000);

  try {
    // POOL holders
    await delay(4000);
    await updateHolders(1);
    await delay(2000);
    await updateHolders(10);
    await delay(2000);
    await updateHolders(137);
    await delay(2000);
    await updateHolders(42161);
    await delay(2000);
    await updateHolders(8453);
    return;
  } catch (error) {
    console.log("error fetch and update stats", error);
  }
}

async function updateZapper() {
  try {
    let lidoResult = await GetLidoApy();
    publish(JSON.stringify(lidoResult), "/lidoApy");
  } catch (e) {
    console.log("failed to get lido apy from llama", e);
  }
  //let zapResult = await GetZapperInfo()
  let zapResult = await GetZapperInfo(
    "0x42cd8312D2BCe04277dD5161832460e95b24262E",
    "ethereum"
  );
  let zapResult137 = await GetZapperInfo(
    "0x3feE50d2888F2F7106fcdC0120295EBA3ae59245",
    "polygon"
  );
  publish(JSON.stringify(zapResult), "/zapper1");
  publish(JSON.stringify(zapResult137), "/zapper137");
}

async function updateHolders(chainNumber) {
  let holdersList = await FetchHolders(chainNumber);
  // todo don't need both
  await publish(holdersList, "/holders" + chainNumber);
  await publish(holdersList, "/holders-" + chainNumber);
  console.log(chainNumber + " updated holdersList");
}

async function updateChain(chainNumber, prizePool) {
  let claims;
  let uniqueWinners
  try {
    [claims, uniqueWinners] = await PublishV5Claims(chainNumber, prizePool);
    console.log(chainNumber, prizePool, "published claims");
  } catch (e) {
    console.log(e);
  }

  const prizeHistory = await PublishPrizeHistory(
    chainNumber,
    prizePool,
    v5dbFinal
  );
  const drawHistoryPath = "/" + chainNumber + "-" + prizePool + "-drawHistory";
  await publish(prizeHistory, drawHistoryPath);
  console.log("...published", prizeHistory.length, "draws", drawHistoryPath);

  const pathSuffix = prizePool === "" ? "" : `-${prizePool}`;
  let v5Winners = await GetWinners(chainNumber, prizePool);
  /*const v5PrizeResults = await GetPrizeResults(chainNumber, prizePool);
  const prizeResultsPath = "/" + chainNumber + pathSuffix + "-prizeresults";
  await publish(v5PrizeResults, prizeResultsPath);
  console.log("...published", prizeResultsPath);
  */
let draws = [];
  let history = [];
  const bigWinners = [];
  let drawCount = 0;

  for (const drawNumber in v5Winners) {
    try {
      draws.push(drawNumber);
      const winnerResults = v5Winners[drawNumber];

      const winnersArray = JSON.stringify(winnerResults);

      await publish(
        winnersArray,
        "/" + chainNumber + pathSuffix + "-draw" + drawNumber
      );
      drawCount++;

      // tally big winners
      const tierValues = winnerResults.tiers[chainNumber];

      winnerResults.wins.forEach((win) => {
        // won prize
        // const vValue = tierValues[win.t] * win.i.length;

        // prize was actually claimed
        // Assuming win.c should be an array, we default to [] if it's not present or undefined
        const vValue =
          tierValues[win.t] * (win.c ? win.c.filter(Boolean).length : 0);

        const pPooler = win.p;
        if (vValue) {
          bigWinners.push({ p: pPooler, v: vValue, d: drawNumber });
        }
      });

      // this version is wins only and doesnt include claims
      //    const {indicesWonPerTier,totalValue} =  tallyPrizeResults(chainNumber,winnerResults)
      //
      //history.push({draw:drawNumber,prizeWins:winnerResults.wins.length,indicesWonPerTier:indicesWonPerTier,totalValue:totalValue})

      //account for claims
      const {
        indicesWonPerTier,
        indicesClaimedPerTier,
        totalValue,
        totalValueClaimed,
      } = tallyPrizeResults(chainNumber, winnerResults);
      history.push({
        draw: drawNumber,
        prizeWins: winnerResults.wins.length,
        indicesWonPerTier: indicesWonPerTier,
        indicesClaimedPerTier: indicesClaimedPerTier, // Added this line
        totalValue: totalValue,
        totalValueClaimed: totalValueClaimed, // Added this line
      });
    } catch (e) {
      console.log(e);
    }
  }
  console.log(
    "...published",
    drawCount,
    " draws @ /" + chainNumber + "-" + prizePool + "-draw#"
  );

  // Sorting bigWinners in descending order by 'v' value
  bigWinners.sort((a, b) => b.v - a.v);

  // Keeping only the top 100 winners
  const top100Winners = bigWinners.slice(0, 100);
  await publish(top100Winners, "/bigwinnersv1-" + chainNumber);

  //await publish(history,"/history-"+chainNumber)
  const returnData = { wins: draws, claims: claims, uniqueWinners: uniqueWinners };
  // console.log("----------------------------draws", draws);
  //console.log("returnData claims", claims);
  return returnData;
  //  await publish(JSON.stringify(draws),'/testnetdraws')
}

/* this version only does wins, no accounting for claimed
   function tallyPrizeResults(chain,wins) {
    const indicesWonPerTier = {};
    wins.wins.forEach((win) => {
      const tier = win.t;
      const indicesWon = win.i.length;
      if (indicesWonPerTier[tier]) {
        indicesWonPerTier[tier] += indicesWon;
      } else {
        indicesWonPerTier[tier] = indicesWon;
      }
    });

    // Calculate total value summed across all tiers
    let totalValue = 0;
    Object.entries(indicesWonPerTier).forEach(([tier, indicesWon]) => {
      const tierValue = wins.tiers[chain][tier];
      totalValue += tierValue * indicesWon;
    });

    // Log the results
    return {indicesWonPerTier,totalValue}
    console.log("Indices won per tier:", indicesWonPerTier);
    console.log("Total value:", totalValue);
  };*/ /*
function tallyPrizeResults(chain, wins) {
  const indicesWonPerTier = {};
  const indicesClaimedPerTier = {};  // New object for claimed indices

  wins.wins.forEach((win) => {
    const tier = win.t;
    const indicesWon = win.i.length;
    const indicesClaimed = win.c.filter(Boolean).length;  // Count the claimed indices

    if (indicesWonPerTier[tier]) {
      indicesWonPerTier[tier] += indicesWon;
    } else {
      indicesWonPerTier[tier] = indicesWon;
    }

    if (indicesClaimedPerTier[tier]) {
      indicesClaimedPerTier[tier] += indicesClaimed;
    } else {
      indicesClaimedPerTier[tier] = indicesClaimed;
    }
  });

  let totalValue = 0;
  let totalValueClaimed = 0;  // New variable for total claimed value

  Object.entries(indicesWonPerTier).forEach(([tier, indicesWon]) => {
    const tierValue = wins.tiers[chain][tier];
    totalValue += tierValue * indicesWon;
  });

  // totalValueClaimed += win.c.map(Number).reduce((a, b) => a + b, 0);


  return {
    indicesWonPerTier,
    indicesClaimedPerTier,  // Added this line
    totalValue,
    totalValueClaimed      // Added this line
  }
}*/

async function updateV5Players(chainNumber, prizePool = "", subgraph) {
  try {
    const allVaults = await GetPlayers(chainNumber, prizePool, subgraph);
    console.log("all vaults length", allVaults.length);
    const uniqueAddresses = new Set();

    allVaults.forEach((vault) => {
      vault.poolers.forEach((pooler) => {
        uniqueAddresses.add(pooler.address);
      });
    });

    const countUniquePoolers = uniqueAddresses.size;

    let summaryPoolers = [];
    for (let vaultData of allVaults) {
      summaryPoolers.push({
        vault: vaultData.vault,
        poolers: vaultData.poolers.length,
      });

      // Conditionally construct the topic based on prizePool presence
      /*
if (prizePool) {
      topic += "-" + prizePool;
    }*/
      let topic = "/vault-" + vaultData.vault + "-poolers";

      await publish(vaultData.poolers, topic);
    }
    console.log(
      "chain",
      chainNumber,
      "published /vault-<vault address>-poolers for",
      allVaults.length,
      "vaults"
    );

    let summaryTopic = "/" + chainNumber;
    if (prizePool) {
      summaryTopic += "-" + prizePool;
    }
    summaryTopic += "-poolers";

    await publish(summaryPoolers, summaryTopic);
    console.log(
      "chain ",
      chainNumber,
      "published",
      summaryPoolers.length,
      "vaults of poolers",
      summaryTopic
    );
    console.log(summaryPoolers, "summary", countUniquePoolers, "unique");
    return [summaryPoolers, countUniquePoolers];
  } catch (e) {
    console.log(e);
  }
}

function tallyPrizeResults(chain, wins) {
  const indicesWonPerTier = {};

  wins.wins.forEach((win) => {
    const tier = win.t;
    const indicesWon = win.i.length;

    if (indicesWonPerTier[tier]) {
      indicesWonPerTier[tier] += indicesWon;
    } else {
      indicesWonPerTier[tier] = indicesWon;
    }
  });

  let totalValue = 0;
  Object.entries(indicesWonPerTier).forEach(([tier, indicesWon]) => {
    const tierValue = wins.tiers[chain][tier];
    totalValue += tierValue * indicesWon;
  });

  return {
    indicesWonPerTier,
    totalValue,
  };
}

async function openApi() {
  app.use(
    cors({
      origin: "*",
    })
  );
  app.use(compression());
  // lets encrypt
  app.use(express.static(__dirname, { dotfiles: "allow" }));
}

async function publish(json, name) {
  // Check if the route already exists
  if (app._router && app._router.stack) {
    const existingRoute = app._router.stack.find((layer) => {
      return (
        layer.route && layer.route.path === name && layer.route.methods.get
      );
    });
    if (existingRoute) {
      // If the route exists, update its route handler function
      existingRoute.route.stack[0].handle = async (req, res) => {
        try {
          res.send(json);
        } catch (err) {
          throw err;
        }
      };
      return;
    }
  }

  // If the route doesn't exist, create a new route with the specified path
  app.get(name, async (req, res) => {
    try {
      res.send(json);
    } catch (err) {
      throw err;
    }
  });
}

async function openPlayerEndpoints() {
  app.get("/player-wins", async (req, res, next) => {
    if (req.query.address && ethers.utils.isAddress(req.query.address)) {
      let address = req.query.address.toLowerCase();
      let winsQuery = `SELECT network, draw, vault, tier, prizeindices,prizepool FROM wins WHERE pooler='${address}'`;

      try {
        let wins = await v5dbFinal.any(winsQuery);
        res.send(wins);
      } catch (err) {
        console.error(err);
        next(err);
      }
    } else {
      res.status(400).send("ERROR - Invalid or missing address");
    }
  });

app.get("/player-claims", async (req, res, next) => {
  const address = req.query.address && ethers.utils.isAddress(req.query.address) ? req.query.address.toLowerCase() : null;

  console.log("player claims query", address);

  if (address) {
    const claimsQuery = `
      SELECT 
        c.network,
        c.draw,
        c.vault,
        c.tier,
        c.index,
        c.payout,
        c.prizepool,
        d.startedat + (d.periodseconds / 2) * interval '1 second' AS claim_time
      FROM 
        claims c
      JOIN 
        draws d 
        ON c.network = d.network AND c.prizepool = d.prizepool AND c.draw = d.draw
      WHERE 
        c.winner = $1 
AND CAST(c.payout AS numeric) > 0
    `;

    try {
      let wins = await v5dbFinal.any(claimsQuery, [address]);
      console.log("player claims query success");
      res.send(wins);
    } catch (e) {
      console.log("player claims query error", e);
      next(e);
    }
  } else {
    res.status(400).send({ error: "Invalid address" });
  }
});
}
async function openV5Pooler() {
  app.get("/poolerVaults", async (req, res, next) => {
    if (
      req.query.address.length < 50 &&
      ethers.utils.isAddress(req.query.address)
    ) {
      let address = req.query.address.toLowerCase();

      // SQL query to get unique vault addresses for a pooler
      let poolerVaultQuery =
        "SELECT DISTINCT vault FROM poolers WHERE pooler='" + address + "'";

      try {
        let vaults = await v5dbFinal.any(poolerVaultQuery);
        res.send(vaults);
      } catch (error) {
        console.error("Database query error: ", error);
        next("ERROR - Unable to fetch data");
      }
    } else {
      next("ERROR - Invalid address");
    }
  });

  app.get("/v5pooler", async (req, res, next) => {
    // var addressInput = sanitizer.value(req.query.address, 'string');

    if (
      req.query.address.length < 50 &&
      ethers.utils.isAddress(req.query.address)
    ) {
      let address = req.query.address;
      address = address.toLowerCase();
      let wins = req.query.wins;
      let claims = req.query.claims;
      // console.log('query for address' + address)
      let addressQuery;

// same query sillies
      if (claims === "true") {
addressQuery = `
  SELECT 
    c.network,
    c.draw,
    c.vault,
    c.tier,
    c.index,
    c.payout,
    c.prizepool,
  FROM 
    claims c
  JOIN 
    draws d 
    ON c.network = d.network AND c.prizepool = d.prizepool AND c.draw = d.draw
  WHERE 
    c.winner = LOWER($1);
`;

      } else if (wins === "true") {
addressQuery = `
  SELECT 
    c.network,
    c.draw,
    c.vault,
    c.tier,
    c.index,
    c.payout,
    c.prizepool,
  FROM 
    claims c
  JOIN 
    draws d 
    ON c.network = d.network AND c.prizepool = d.prizepool AND c.draw = d.draw
  WHERE 
    c.winner = LOWER($1);
`;

      }

      let addressPrizes = await v5dbFinal.any(addressQuery,[address]);
      res.send(addressPrizes);
    } else {
      next("ERROR - Invalid address");
    }
  });
}

async function PublishV5Claims(chainNumber, prizePool) {
  const claimsData = await GetClaims(chainNumber, prizePool, v5dbFinal);
  console.log("publishing v5 claims");
  // 1. Publishing claims per draw
  let draws = [];
  const pathSuffix = prizePool === "" ? "" : `-${prizePool.toLowerCase()}`;
  for (let drawNumber in claimsData) {
    draws.push([drawNumber]);
    // only count draws with claims
    //if(claimsData[drawNumber].claimsList.length > 0) {draws.push([drawNumber])};
    const claimUrl = `/claims-${chainNumber}${pathSuffix}-draw${drawNumber}`;
    await publish(claimsData[drawNumber].claimsList, claimUrl);
  }
  console.log(
    "...published",
    " draws @ ",
    "/claims-" + chainNumber + pathSuffix
  );

  // 2. Finding the biggest winners
  let winnersPayouts = {};
  for (let drawNumber in claimsData) {
    for (let claim of claimsData[drawNumber].claimsList) {
      const winner = claim.w;
      if (!winnersPayouts[winner]) {
        winnersPayouts[winner] = { totalPayout: BigInt(0), draw: drawNumber };
      }
      winnersPayouts[winner].totalPayout += BigInt(claim.p);
    }
  }

  const sortedWinners = Object.entries(winnersPayouts)
    .sort((a, b) => {
      if (b[1].totalPayout > a[1].totalPayout) return 1;
      if (b[1].totalPayout < a[1].totalPayout) return -1;
      return 0;
    })
    .slice(0, 50)
    .map((entry) => ({
      p: entry[0], // address
      v: entry[1].totalPayout.toString(), // payout amount, converted to string
      d: entry[1].draw, // drawnumber
    }));
  const bigWinnersPath = `/${chainNumber}${pathSuffix}-bigwinners`;
  await publish(sortedWinners, bigWinnersPath);
  console.log("...published", bigWinnersPath);
  // 2.5 Finding the biggest win in a single draw across all draws
  let bigWins = [];
    let uniqueWinners = new Set(); // Track unique winners with non-zero payouts
  for (let drawNumber in claimsData) {
    let drawWinnersPayouts = {};
    for (let claim of claimsData[drawNumber].claimsList) {
      const winner = claim.w;
      if (!drawWinnersPayouts[winner]) {
        drawWinnersPayouts[winner] = BigInt(0);
      }
      drawWinnersPayouts[winner] += BigInt(claim.p);
    }

    // Find the biggest win in this draw
    let maxPayout = BigInt(0);
    let maxWinner = null;
    for (let winner in drawWinnersPayouts) {
      if (drawWinnersPayouts[winner] > maxPayout) {
        maxPayout = drawWinnersPayouts[winner];
        maxWinner = winner;
      }
    }

    if (maxWinner) {
      bigWins.push({ winner: maxWinner, payout: maxPayout, draw: drawNumber });
    }
  }

  // Sort the big wins and take top 50
  const sortedBigWins = bigWins
    .sort((a, b) => {
      if (b.payout > a.payout) return 1;
      if (b.payout < a.payout) return -1;
      return 0;
    })
    .slice(0, 50)
    .map((entry) => ({
      p: entry.winner, // address
      v: entry.payout.toString(), // payout amount, converted to string
      d: entry.draw, // draw number
    }));

  await publish(sortedBigWins, `/${chainNumber}${pathSuffix}-bigwins`);
  console.log("...published", `/${chainNumber}${pathSuffix}-bigwins`);
  // 3. History of all draws with adjustments for canary prizes
  let history = [];
  for (let drawNumber in claimsData) {
    const claimsList = claimsData[drawNumber].claimsList;
    let totalClaims = 0; // Initialize total claims for non-zero payouts
    let totalPayout = BigInt(0);
    let totalFees = BigInt(0);
    let uniqueTiers = new Set();
    //let uniqueWinners = new Set(); // Track unique winners with non-zero payouts
    let canaryPrizesCount = 0; // Counter for canary prizes

    for (let claim of claimsList) {
      const payout = BigInt(claim.p);
      if (payout > 0) {
        totalPayout += payout;
        totalFees += BigInt(claim.f);
        uniqueTiers.add(claim.t);
        uniqueWinners.add(claim.w); // Add winner only if payout > 0
        totalClaims += 1; // Count as a valid claim only if payout > 0
      } else {
        canaryPrizesCount += 1; // Increment canary prize count
      }
    }

    history.push({
      draw: drawNumber,
      wins: totalClaims,
      totalPayout: totalPayout.toString(),
      totalFee: totalFees.toString(),
      tiersWon: [...uniqueTiers].sort((a, b) => a - b),
      uniqueWinners: uniqueWinners.size,
      canary: canaryPrizesCount, // Add canary prize count to history object
    });
  }
  const historyPath = `/${chainNumber}${pathSuffix}-history`;
  await publish(history, historyPath);
  console.log("...published", historyPath);


// 4. Aggregating total payouts per draw for each vault
let vaultTotals = {};
for (let drawNumber in claimsData) {
  const claimsList = claimsData[drawNumber].claimsList;
  for (let claim of claimsList) {
    const vaultAddress = claim.v;
    if (!vaultTotals[vaultAddress]) {
      vaultTotals[vaultAddress] = {};
    }
    if (!vaultTotals[vaultAddress][drawNumber]) {
      vaultTotals[vaultAddress][drawNumber] = {
        value: BigInt(0),
        prizes: 0
      };
    }
const payout = BigInt(claim.p);
    if (payout > 0) {
      vaultTotals[vaultAddress][drawNumber].value += payout;
      vaultTotals[vaultAddress][drawNumber].prizes += 1; // Increment prize count only for non-zero payouts
    }
  }
}

// Convert BigInt to string for JSON serialization
for (let vaultAddress in vaultTotals) {
  for (let drawNumber in vaultTotals[vaultAddress]) {
    vaultTotals[vaultAddress][drawNumber].value = parseFloat(
      ethers.utils.formatUnits(vaultTotals[vaultAddress][drawNumber].value, 18)
    ).toFixed(4); // POOL formatted
  }
}

// Publish the aggregated data
const vaultTotalsPath = `/vault-totals-${chainNumber}${
  prizePool ? `-${prizePool}` : ""
}`;
await publish(vaultTotals, vaultTotalsPath);
console.log("....published", vaultTotalsPath);

return [draws, uniqueWinners];
}
/*

  // 4. Aggregating total payouts per draw for each vault
  let vaultTotals = {};
  for (let drawNumber in claimsData) {
    const claimsList = claimsData[drawNumber].claimsList;
    for (let claim of claimsList) {
      const vaultAddress = claim.v;
      if (!vaultTotals[vaultAddress]) {
        vaultTotals[vaultAddress] = {};
      }
      if (!vaultTotals[vaultAddress][drawNumber]) {
        vaultTotals[vaultAddress][drawNumber] = BigInt(0);
      }
      vaultTotals[vaultAddress][drawNumber] += BigInt(claim.p);
    }
  }

  // Convert BigInt to string for JSON serialization
  for (let vaultAddress in vaultTotals) {
    for (let drawNumber in vaultTotals[vaultAddress]) {
      vaultTotals[vaultAddress][drawNumber] = parseFloat(
        ethers.utils.formatUnits(vaultTotals[vaultAddress][drawNumber], 18)
      ).toFixed(4); // POOL formatted
    }
  }

  // Publish the aggregated data
  const vaultTotalsPath = `/vault-totals-${chainNumber}${
    prizePool ? `-${prizePool}` : ""
  }`;
  await publish(vaultTotals, vaultTotalsPath);
  console.log("....published", vaultTotalsPath);

  return [draws,uniqueWinners];
}
*/




/*function createChainsAssetsPrices(addressObj, geckosObj) {
    const result = {};

    for (const chain in addressObj) {
        const vaults = addressObj[chain].VAULTS;
        result[chain] = {};

        for (const vault of vaults) {
            const gecko = vault.GECKO;
            if (geckosObj.hasOwnProperty(gecko)) {
                result[chain][vault.ASSET.toLowerCase()] = geckosObj[gecko];
            }
        }
    }
console.log("merged",result)
    return result;
}*/
function createChainsAssetsPrices(addressObj, rewardsObj, geckosObj) {
  const result = {};

  for (const chain in addressObj) {
    const vaults = addressObj[chain].VAULTS;
    result[chain] = {};

    for (const vault of vaults) {
      const gecko = vault.GECKO;
      if (geckosObj.hasOwnProperty(gecko)) {
        result[chain][vault.ASSET.toLowerCase()] = geckosObj[gecko];
      }
    }
  }

  for (const chain in rewardsObj) {
    if (!result[chain]) {
      result[chain] = {};
    }

    for (const reward of rewardsObj[chain]) {
      const gecko = reward.GECKO;
      if (geckosObj.hasOwnProperty(gecko)) {
        result[chain][reward.TOKEN.toLowerCase()] = geckosObj[gecko];
      }
    }
  }

  console.log("merged", result);
  return result;
}


/*
function mergeChainsAssetsPrices(obj1, obj2) {
console.log("trying to merge prices of obj1",obj1,"and obj2",obj2) 
   const merged = { ...obj1 };

    for (const chain in obj2) {
        if (!merged.hasOwnProperty(chain)) {
            merged[chain] = { ...obj2[chain] };
        } else {
            for (const asset in obj2[chain]) {
                if (!merged[chain].hasOwnProperty(asset)) {
                    merged[chain][asset] = obj2[chain][asset];
                }
            }
        }
    }

    return merged;
}*/

function mergeChainsAssetsPrices(obj1, obj2) {
    //console.log("trying to merge prices of obj1", obj1, "and obj2", obj2);

    // Start with a copy of obj2
    const merged = { ...obj2 };

    // Iterate over obj1 to merge it into the merged object
    obj1.forEach(({ chain, address, price }) => {
        if (!merged[chain]) {
            merged[chain] = {};
        }
        if (!merged[chain].hasOwnProperty(address)) {
            merged[chain][address] = price;
        }
    });

    return merged;
}

go();

// module.exports = {publish}
