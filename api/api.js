require('../env-setup');
const pgp = require("pg-promise")(/* initialization options */);
const ethers = require("ethers");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
var compression = require("compression");
const http = require("http");
const https = require("https");
//const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");
const { FetchHolders } = require("./holders");
const { GetLidoApy } = require("./functions/getLidoApy");
const { GetZapperInfo } = require("./zapper");
const { GeckoPrice } = require("./functions/geckoFetch");
const { GetWinners } = require("./functions/getWinners");
// const { GetPrizeResults } = require("./functions/getPrizeResults");
const { GetPlayers } = require("./functions/getPlayers");
const { GetPrizes } = require("./functions/getPrizes");
const { GetClaims } = require("./functions/getClaims");
const { GetTwabPromotions } = require("./functions/getTwabRewards");
const { UpdateV5Vaults } = require("./updateVaults");
const { PublishPrizeHistory } = require("./publishPrizeHistory");
const { FindAndPriceUniv2Assets } = require("./functions/uniV2Prices");
const PrizeLeaderboard = require("./functions/getPrizeLeaderboard");

const LOGS_ENABLED = true; // Toggle logging on or off
const LOGS = [];
const FLUSH_INTERVAL = 10000; // Flush logs every 10 seconds

// Define logit function to capture multiple arguments
const logit = (...args) => {
  if (LOGS_ENABLED) {
    // Join args into a single log entry and push to LOGS array
    LOGS.push(args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' '));
  }
};

// Function to flush logs
const flushLogs = () => {
  if (LOGS.length > 0) {
    logit(LOGS.join('\n')); // Output all batched logs
    LOGS.length = 0; // Clear the logs array after flushing
  }
};

// Set interval to flush logs
setInterval(flushLogs, FLUSH_INTERVAL);


const { ADDRESS, WHITELIST_REWARDS, ADDITIONAL_GECKO_MAPPING } = require("../constants/address");
const { ABI } = require("../constants/abi");
const { PROVIDERS } = require("../constants/providers");
//dotenv.config();
// var sanitizer = require('sanitize');
const waitTime = 120000;
const pricesToFetch = [
  "higher",
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
  "angle-usd",
  "degen-base",
  "crash",
  "based-2",
  "xdai",
  "weth"
];

const poolToken = "0x395Ae52bB17aef68C2888d941736A71dC6d4e125";

const chains = [];

for (const chainName in ADDRESS) {
  const chain = ADDRESS[chainName];
  
  // Check if API exists and is true
  if (chain.API === true) {
    const chainObject = {
      id: chain.CHAINID,
      name: chainName,
      prizePool: chain.PRIZEPOOL.toLowerCase(),
      subgraph: chain.PRIZEPOOLSUBGRAPH,
    };

    // Optionally add 'hideFromApp' if it exists
    if (chain.HIDEFROMAPP) {
      chainObject.hideFromApp = chain.HIDEFROMAPP;
    }

    // Add the object to the chains array
    chains.push(chainObject);
  }
}

//chains.push({id: 10,name: "OPTIMISM",prizePool:"0xe32e5E1c5f0c80bD26Def2d0EA5008C107000d6A",subgraph:"https://api.studio.thegraph.com/query/41211/pt-v5-optimism-prize-pool/v0.0.1",hideFromApp: true})

/*const chains = [
  // { id: 10, name: "OPTIMISM", prizePool: "" },
{
    id: 1,
    name: "ETHEREUM",
    prizePool: ADDRESS["ETHEREUM"].PRIZEPOOL.toLowerCase(),
    subgraph: ADDRESS["ETHEREUM"].PRIZEPOOLSUBGRAPH,
  },
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
  {
    id: 534352,
    name: "SCROLL",
    prizePool: ADDRESS["SCROLL"].PRIZEPOOL.toLowerCase(),
    subgraph: ADDRESS["SCROLL"].PRIZEPOOLSUBGRAPH,
  },
  //  {
   // id: 421614,
   // name: "ARBSEPOLIA",
   // prizePool: ADDRESS["ARBSEPOLIA"].PRIZEPOOL.toLowerCase(),
   // subgraph: ADDRESS["ARBSEPOLIA"].PRIZEPOOLSUBGRAPH,
  //},
  {
    id: 8453,
    name: "BASE",
    prizePool: ADDRESS["BASE"].PRIZEPOOL.toLowerCase(),
    subgraph: ADDRESS["BASE"].PRIZEPOOLSUBGRAPH,
  },

  
//{
  // id:11155420,
   //name: "OPSEPOLIA",
   //prizePool: "0x5e1b40e4249644a7d7589d1197ad0f1628e79fb1",
   //subgraph: "https://api.studio.thegraph.com/query/63100/pt-v5-op-sepolia/v0.0.5",
//},
  //{
  //id:11155420,
  // name: "OPSEPOLIA",
   //prizePool: "0x9f594BA8A838D41E7781BFA2aeA42702E216AF5a".toLowerCase(),
   //subgraph: "https://api.studio.thegraph.com/proxy/63100/pt-v5-op-sepolia/version/latest/"},
];
*/

const app = express();

// source control - use previous calculations (json files) to rebuild API or choose db source
const useStaticFiles = true; // toggle using prize api flat file as source
// const dbName = "pooltogether"; // toggle db source
const compareApiSources = false;

const allowList = ["::ffff:51.81.32.49"];
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutes
  max: 50, // Limit each IP to 60  requests per `window` (here, per 1 minutes)

  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: function (req, res /*next*/) {
    logit("rate limit: ", req.ip);
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
  logit("HTTP Server running on port 80");
});

httpsServer.listen(443, () => {
  logit("HTTPS Server running on port 443");
});

const v5cnFinal = {
  host: "localhost",
  port: 5432,
  database: "v5final",
  user: "pooltogether",
  password: process.env.PASSWORD,
};
const v5dbFinal = pgp(v5cnFinal);

async function delay(ms) {
  logit("waiting", ms / 1000, "seconds");
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function go() {
  app.use(limiter);
  /*
  let newestDrawId = await getCurrentDraw();
  logit("current draw ", newestDrawId);
*/
  try {
    await openApi();
  } catch (e) {
    logit("express error:", e);
  }
console.log("running update")
try{
  await update();}
catch(e){console.log("error in update()",e)}
console.log("going to fetch and update stats")
try{
  await fetchAndUpdateStats();}catch(e){console.log("error in fetch and update",e)}
  try {
    await openV5Pooler();
    await openPlayerEndpoints();
  } catch (e) {
    logit(e);
  }

  // v4 version, todo update for v5
  if (compareApiSources) {
    try {
      let check = await CheckApi();
      publish(check, "/calculations");
    } catch (error) {
      logit("calculation check failed -> \n", error);
    }
  }

  // set to 40 to run on first go and then wait 40 loops before running again
  let lessFrequentCount = 80;

  while (true) {
    // looping
console.log(app._router.stack.map((layer) => layer.route?.path).filter(Boolean).length);
  
  await update();
   
    let isFirstRun = true;

    if (isFirstRun || lessFrequentCount % 80 === 0) {
      try {
        const rewardsV5 = await GetTwabPromotions();
        publish(JSON.stringify(rewardsV5), "/twabrewards");
        logit("...published ", "/twabrewards");
      } catch (e) {
        logit("update twab rewards failed", e);
      }

      try {
        await updateZapper();
      } catch (e) {
        logit("zapper update failed", e);
      }
      if (isFirstRun) {
        isFirstRun = false;
      }
    }
    lessFrequentCount += 1;
console.log("waiting 45 seconds")    
await delay(45000)
    await fetchAndUpdateStats();
console.log("waiting 2 minutes")
await delay(120000) 
 }
}

async function update() {
  logit("updating ", chains.length, "chains");
  let chainDraws;

  const prizepools = chains
    .filter((chain) => !chain.hideFromApp)
    .map((chain) => chain.prizePool);

try {
    const leaders = await PrizeLeaderboard(prizepools);
    await publish(JSON.stringify(leaders), "/prizeleaderboard");
  } catch (error) {
    console.error("Error calling PrizeLeaderboard:", error);
  }
  let allPoolsUniqueWinners = new Set();
console.log(`Current time: ${new Date().toISOString()}`);  
for (let chain of chains) {
    let allDrawsOverview = [];
    let allDrawsOverviewClaims = [];

    chainDraws = await updateChain(chain.id, chain.prizePool);
    // logit("unique winners", chainDraws.uniqueWinners);
    // meta unique winners
    if (chainDraws.uniqueWinners instanceof Set) {
      chainDraws.uniqueWinners.forEach((value) => {
        allPoolsUniqueWinners.add(value);
      });
    } else {
      console.error("uniqueWinners is not a Set for chain", chain.id);
    }
    allDrawsOverview.push({ chain: chain.id, draws: chainDraws.wins });
    allDrawsOverviewClaims.push({
      chain: chain.id,
      draws: chainDraws.claims.flat(),
    });
    logit(
      "chain draws claims for ",
      chain.id,
      chain.prizePool,"-->",
      chainDraws.claims.length
    );
    // Determine the path suffix based on whether prizePool is provided
    const pathSuffix = chain.prizePool ? `-${chain.prizePool}` : "";
    const uniqueOverview = { total: allPoolsUniqueWinners.size };
    await publish(JSON.stringify(uniqueOverview), "/totalunique");
    await publish(
      JSON.stringify(allDrawsOverview),
      `/draws-${chain.id}${pathSuffix}`
    );
    await publish(
      JSON.stringify(allDrawsOverviewClaims),
      `/claimeddraws-${chain.id}${pathSuffix}`
    );
    logit(
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
    logit(e);
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
      logit("...published /prices at", currentTime);
    } else {
      logit("No new prices fetched. Keeping old prices.");
    }
  } catch (e) {
    logit("price fetch bombed", e);
  }

*/

try {
  console.log("getting gecko prices await running fetch pt 1");
  priceResults.geckos = await GeckoPrice(pricesToFetch);
  console.log("running fetch pt 1b");

  if (
    priceResults.geckos &&
    priceResults.geckos.ethereum > 0 &&
    priceResults.geckos.optimism > 0
  ) {
    ethPrice = priceResults.geckos["ethereum"];

    // Fetch UNI prices and convert to USD using ETH price
    let uniAssets = [];
    try {
      console.log("runnning fetch pt 1c");
      const uniPrices = await FindAndPriceUniv2Assets();
      console.log("running fetch pt 1d");

      // Check if uniPrices is valid
      if (!uniPrices || Object.keys(uniPrices).length === 0) {
        console.warn("UNI Prices are empty or undefined");
      } else {
        // Flatten the uniPrices object into an array
        const flattenedUniPrices = Object.entries(uniPrices).flatMap(
          ([chain, assets]) =>
            Object.entries(assets).map(([address, price]) => ({
              chain,
              address,
              price: parseFloat(price), // Ensure price is a number
            }))
        );

        // Convert UNI prices to USD using ETH price
        uniAssets = flattenedUniPrices.map((asset) => ({
          ...asset,
          price: asset.price * ethPrice, // Convert UNI prices to USD
        }));
      }
    } catch (e) {
      console.error("Error fetching UNI prices:", e);
      logit(e);
    }

    logit("uni assets", uniAssets);

    let chainsAssetsPrices = {};
    try {
      chainsAssetsPrices = createChainsAssetsPrices(
        ADDRESS,
        WHITELIST_REWARDS,
        ADDITIONAL_GECKO_MAPPING,
        priceResults.geckos
      );
      logit("created chain asset prices", chainsAssetsPrices);
    } catch (e) {
      console.error("Error creating chain asset prices:", e);
      logit(e);
    }

    // Merge UNI and Gecko prices
    try {
      priceResults.assets = mergeChainsAssetsPrices(
        uniAssets,
        chainsAssetsPrices
      );
    } catch (e) {
      console.error("Error merging UNI and Gecko prices:", e);
      logit(e);
    }

    // Add current date and time
    const currentTime = new Date().toISOString();
    priceResults["timestamp"] = currentTime;
    newPrices = true;

    console.log("running fetch pt 1f publishing prices!");
    if (!priceResults || Object.keys(priceResults).length === 0) {
      console.error("No prices available to publish");
    } else {
      try {
        await publish(JSON.stringify(priceResults), "/prices");
        logit("...published /prices at", currentTime);
      } catch (e) {
        console.error("Error publishing prices:", e);
        logit(e);
      }
    }
  } else {
    logit(
      "running fetch, price is missing in Gecko prices. No new prices fetched."
    );
  }
} catch (e) {
  console.error("Error in the fetch flow between part 1d and 1f:", e);
  logit("running fetch, price fetch bombed=======================", e);
}

console.log("running fetch part 2")
  let pendingPrize = {};
  // todo meta poolers
  let vaultOverview = [];
  for (let chain of chains) {
    let v5Prizes;
   if(chain.hideFromApp !== true){
    pendingPrize[chain.name] = {};  
 try {
      const prizePoolContract = new ethers.Contract(
        chain.prizePool,
        ABI.PRIZEPOOL,
        PROVIDERS[chain.name]
      );
      const wethPrizeBalance = await prizePoolContract.accountedBalance();
      pendingPrize[chain.name].total = wethPrizeBalance.toString();
      logit("got pending prize", chain.name, wethPrizeBalance.toString());
    } catch (e) {
      logit("error trying to get prize pool totals", e);
    }

    try {
      // Fetch prizes for each chain and prize pool
      
      logit("fetching GetPrizes for ", chain.name, chain.prizePool);
      v5Prizes = await GetPrizes(chain.name, chain.prizePool);
      pendingPrize[chain.name].prizes = v5Prizes;
      //logit(chain.name,"overview info",v5Prizes)
    } catch (e) {
      logit(e);
    }}
    // Update players for each chain and prize pool
    let v5Players, totalPlayers;

    // Attempt to update players
    try {
      logit(
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
      //logit(wtf)
      //logit("v5players agin?",v5Players)
      //logit("total players",totalPlayers)
      logit("Players updated successfully for chain ", chain.id);
    } catch (error) {
      console.error(
        `Error updating players for chain ${chain.name} with prize pool ${chain.prizePool}:`,
        error.message
      );
    }
    //logit(v5Players)
    //logit("total players")
    //logit(totalPlayers)
    // Only proceed with the following if updating players succeeded
    if (v5Players && totalPlayers !== undefined) {
      try {
        // Update vaults for each set of players and prize pool
        logit("Updating vaults for chain ", chain.id);
        let v5Vaults = await UpdateV5Vaults(
          v5Players,
          chain.prizePool,
          chain.name,
          chain.id
        );

        // Publish the vaults information
        const vaultsPath = `/${chain.id}-${chain.prizePool}-vaults`;
        await publish(v5Vaults, vaultsPath);
        logit("...published", vaultsPath);
        if (!chain.hideFromApp) {
          vaultOverview = [...vaultOverview, ...v5Vaults];
        }
      } catch (error) {
        console.error(
          `Error updating and publishing vaults for chain ${chain.name} with prize pool ${chain.prizePool}:`,
          error
        );
      }
      logit("vaults update complete");
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
        logit("...published", overviewPath);
      } catch (error) {
        console.error(
          `Error publishing summary for chain ${chain.name} with prize pool ${chain.prizePool}:`,
          error
        );
      }
    }
    /* try {
      logit("querying leaderboard for ", chain.id, chain.prizePool);
      //const leaders = await PrizeLeaderboard(chain.id, chain.prizePool);
      //const leaderboardPath = `/${chain.id}-${chain.prizePool}-prizeleaderboard`;
      await publish(JSON.stringify(leaders), leaderboardPath);
      logit("...published", leaderboardPath);
    } catch (e) {
      logit(e);
    }*/
  }
  await publish(vaultOverview, "/vaults");
  metaOverview = { pendingPrize: pendingPrize, prices: priceResults };
console.log("publishing overview")
  try {
    await publish(JSON.stringify(metaOverview), "/overview");
  } catch (e) {
    logit("error publishing meta overview /overview", e);
  }

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
    logit("error fetch and update stats", error);
  }

}

async function updateZapper() {
  try {
    let lidoResult = await GetLidoApy();
    publish(JSON.stringify(lidoResult), "/lidoApy");
  } catch (e) {
    logit("failed to get lido apy from llama", e);
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
  logit(chainNumber + " updated holdersList");
}

async function updateChain(chainNumber, prizePool) {
  let claims;
  let uniqueWinners;
  try {
    [claims, uniqueWinners] = await PublishV5Claims(chainNumber, prizePool);
    logit(chainNumber, prizePool, "published claims");
  } catch (e) {
    logit(e);
  }

  const prizeHistory = await PublishPrizeHistory(
    chainNumber,
    prizePool,
    v5dbFinal
  );
  const drawHistoryPath = "/" + chainNumber + "-" + prizePool + "-drawHistory";
  await publish(prizeHistory, drawHistoryPath);
  logit("...published", prizeHistory.length, "draws", drawHistoryPath);

  const pathSuffix = prizePool === "" ? "" : `-${prizePool}`;
  let v5Winners = await GetWinners(chainNumber, prizePool);
  /*const v5PrizeResults = await GetPrizeResults(chainNumber, prizePool);
  const prizeResultsPath = "/" + chainNumber + pathSuffix + "-prizeresults";
  await publish(v5PrizeResults, prizeResultsPath);
  logit("...published", prizeResultsPath);
  */
  let draws = [];
  let history = [];
  const bigWinners = [];
  let drawCount = 0;

// Get all draw numbers as integers
const drawNumbers = Object.keys(v5Winners).map(Number).sort((a, b) => a - b);

// Determine the last 5 draws (or fewer if total is less than 5)
const recentDrawNumbers = drawNumbers.slice(-5);

  for (const drawNumber in v5Winners) {
    try {
      draws.push(drawNumber);
      const winnerResults = v5Winners[drawNumber];

      const winnersArray = JSON.stringify(winnerResults);

  // Only publish if the drawNumber is one of the recent 5
      //if (recentDrawNumbers.has(Number(drawNumber))) {
      await publish(
        winnersArray,
        "/" + chainNumber + pathSuffix + "-draw" + drawNumber
      );

//}

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
      logit(e);
    }
  }
  logit(
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
  const returnData = {
    wins: draws,
    claims: claims,
    uniqueWinners: uniqueWinners,
  };
  // logit("----------------------------draws", draws);
  //logit("returnData claims", claims);
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
    logit("Indices won per tier:", indicesWonPerTier);
    logit("Total value:", totalValue);
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
if(prizePool!=="0xe32e5E1c5f0c80bD26Def2d0EA5008C107000d6A"){
  try {
    console.log("getting players",subgraph)
    const allVaults = await GetPlayers(chainNumber, prizePool, subgraph);
    logit("Total vaults fetched:", allVaults.length);

    const uniqueAddresses = new Set();

    allVaults.forEach((vault) => {
      vault.poolers.forEach((pooler) => {
        uniqueAddresses.add(pooler.address);
      });
    });

    const countUniquePoolers = uniqueAddresses.size;
    logit("Unique poolers count:", countUniquePoolers);

    let summaryPoolers = [];
    for (let vaultData of allVaults) {
      const poolerCount = vaultData.poolers.length;
      //logit(`Vault ${vaultData.vault} has ${poolerCount} poolers`);

      summaryPoolers.push({
        vault: vaultData.vault,
        poolers: poolerCount,
      });

      let topic = "/vault-" + vaultData.vault + "-poolers";
      await publish(vaultData.poolers, topic);
    }

    let summaryTopic = `/${chainNumber}`;
    if (prizePool) {
      summaryTopic += `-${prizePool}`;
    }
    summaryTopic += "-poolers";

    await publish(summaryPoolers, summaryTopic);
    logit("Published summary for all vaults", summaryTopic);

    return [summaryPoolers, countUniquePoolers];
  } catch (e) {
    console.error("Error in updateV5Players for prizepool "+prizePool+":", e);
  }}
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
/*console.log("running publish, current routes:")
console.log(app._router.stack.map((layer) => layer.route?.path).filter(Boolean).length);

 logit("Publishing data to route:", name);
  logit("Data:", JSON.stringify(json).slice(0, 100) + "..."); // Log first 100 chars for brevity
*/
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
    const address =
      req.query.address && ethers.utils.isAddress(req.query.address)
        ? req.query.address.toLowerCase()
        : null;

    logit("player claims query", address);

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
  AND c.payout != '0';  -- Compare payout directly as text
    `;

      try {
        let wins = await v5dbFinal.any(claimsQuery, [address]);
        logit("player claims query success");
        res.send(wins);
      } catch (e) {
        logit("player claims query error", e);
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
      // logit('query for address' + address)
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

      let addressPrizes = await v5dbFinal.any(addressQuery, [address]);
      res.send(addressPrizes);
    } else {
      next("ERROR - Invalid address");
    }
  });
}

async function PublishV5Claims(chainNumber, prizePool) {
  const claimsData = await GetClaims(chainNumber, prizePool, v5dbFinal);
  logit("publishing v5 claims");
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
  logit(
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
  logit("...published", bigWinnersPath);
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
  logit("...published", `/${chainNumber}${pathSuffix}-bigwins`);
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
  logit("...published", historyPath);

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
          prizes: 0,
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
        ethers.utils.formatUnits(
          vaultTotals[vaultAddress][drawNumber].value,
          18
        )
      ).toFixed(4); // POOL formatted
    }
  }

  // Publish the aggregated data
  const vaultTotalsPath = `/vault-totals-${chainNumber}${
    prizePool ? `-${prizePool}` : ""
  }`;
  await publish(vaultTotals, vaultTotalsPath);
  logit("....published", vaultTotalsPath);

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
  logit("....published", vaultTotalsPath);

  return [draws,uniqueWinners];
}
*/

function createChainsAssetsPrices(addressObj, rewardsObj, additionalGeckosObj, geckosObj) {
  // Merge additionalGeckosObj into rewardsObj
  const mergedRewards = { ...rewardsObj };

  for (const chain in additionalGeckosObj) {
    if (!mergedRewards[chain]) {
      mergedRewards[chain] = [];
    }
    mergedRewards[chain] = [...mergedRewards[chain], ...additionalGeckosObj[chain]];
  }

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

  for (const chain in mergedRewards) {
    if (!result[chain]) {
      result[chain] = {};
    }

    for (const reward of mergedRewards[chain]) {
      const gecko = reward.GECKO;
      if (geckosObj.hasOwnProperty(gecko)) {
        result[chain][reward.TOKEN.toLowerCase()] = geckosObj[gecko];
      }
    }
  }

  logit("merged", result);
  return result;
}
/*
function mergeChainsAssetsPrices(obj1, obj2) {
logit("trying to merge prices of obj1",obj1,"and obj2",obj2) 
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
  //logit("trying to merge prices of obj1", obj1, "and obj2", obj2);

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
