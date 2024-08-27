const fetch = require('node-fetch');
const ethers = require('ethers')

const GITHUB_API_BASE_URL = `https://api.github.com/repos/GenerationSoftware/pt-v5-winners/contents/winners/vaultAccounts/`;
const POOL_EXPLORER_API_URL = 'https://poolexplorer.xyz/';

async function fetchGithubData(chain, prizePool, drawId) {
  const url = `${GITHUB_API_BASE_URL}${chain}/${prizePool.toLowerCase()}/draw/${drawId}/winners.json`;
  const response = await fetch(url);
  const data = await response.json();
  const decodedContent = JSON.parse(Buffer.from(data.content, 'base64').toString());
  return decodedContent;
}

async function fetchPoolExplorerData(chain, prizePool, drawNumber) {
  const url = `${POOL_EXPLORER_API_URL}${chain}-${prizePool}-draw${drawNumber}`;
  const response = await fetch(url);
  return await response.json();
}

function combineGithubPrizes(githubData) {
  const combinedData = {};

  Object.keys(githubData).forEach(vault => {
    githubData[vault].forEach(winner => {
      const user = winner.user.toLowerCase();
      if (!combinedData[vault]) {
        combinedData[vault] = {};
      }
      if (!combinedData[vault][user]) {
        combinedData[vault][user] = {};
      }
      Object.keys(winner.prizes).forEach(tier => {
        if (!combinedData[vault][user][tier]) {
          combinedData[vault][user][tier] = new Set();
        }
        winner.prizes[tier].forEach(index => {
          combinedData[vault][user][tier].add(index);
        });
      });
    });
  });

  return combinedData;
}

function compareData(githubData, poolExplorerData) {
  const discrepancies = {
    githubOnly: [],
    poolExplorerOnly: []
  };

  const combinedGithubData = combineGithubPrizes(githubData);

  const poolExplorerVaults = [...new Set(poolExplorerData.wins.map(win => win.v.toLowerCase()))];

  Object.keys(combinedGithubData).forEach(vault => {
    const githubWinners = combinedGithubData[vault];
    const poolExplorerWinners = poolExplorerData.wins.filter(win => win.v.toLowerCase() === vault);

    if (poolExplorerWinners.length === 0) {
      discrepancies.githubOnly.push({ vault });
    } else {
      Object.keys(githubWinners).forEach(user => {
        const matchingWinners = poolExplorerWinners.filter(win => win.p.toLowerCase() === user);

        if (matchingWinners.length === 0) {
          discrepancies.githubOnly.push({ vault, user });
        } else {
          const githubTiers = githubWinners[user];
          matchingWinners.forEach(win => {
            const tier = win.t.toString();
            const poolExplorerIndices = win.i;

            if (!githubTiers[tier]) {
              discrepancies.poolExplorerOnly.push({ vault, user, tier });
            } else {
              const githubIndices = Array.from(githubTiers[tier]);

              githubIndices.forEach(index => {
                if (!poolExplorerIndices.includes(index)) {
                  discrepancies.githubOnly.push({ vault, user, tier, index });
                }
              });

              poolExplorerIndices.forEach(index => {
                if (!githubIndices.includes(index)) {
                  discrepancies.poolExplorerOnly.push({ vault, user, tier, index });
                }
              });
            }
          });
        }
      });
    }
  });

  poolExplorerVaults.forEach(vault => {
    if (!combinedGithubData[vault]) {
      discrepancies.poolExplorerOnly.push({ vault });
    }
  });

  return discrepancies;
}

async function compareDraws(chain, prizePool, totalDraws) {
  for (let drawId = 1; drawId <= totalDraws; drawId++) {
    try {
      const githubData = await fetchGithubData(chain, prizePool, drawId);
      const poolExplorerData = await fetchPoolExplorerData(chain, prizePool, drawId);
      const discrepancies = compareData(githubData, poolExplorerData);

      if (discrepancies.githubOnly.length === 0 && discrepancies.poolExplorerOnly.length === 0) {
        console.log(`Draw ${drawId} Match`);
      } else {
        console.log(`x Draw ${drawId} Issue`);
      }
    } catch (error) {
      console.error(`Error comparing Draw ${drawId}:`, error);
      console.log(`Draw ${drawId} Issue`);
    }

    // Delay to avoid API rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

async function compareSingleDraw(chain, prizePool, drawId) {
  try {
    const githubData = await fetchGithubData(chain, prizePool, drawId);
    const poolExplorerData = await fetchPoolExplorerData(chain, prizePool, drawId);
    const discrepancies = compareData(githubData, poolExplorerData);

    if (discrepancies.githubOnly.length === 0 && discrepancies.poolExplorerOnly.length === 0) {
      console.log(`Draw ${drawId} Match`);
    } else {
      console.log(`Discrepancies for Draw ${drawId}:`, JSON.stringify(discrepancies, null, 2));
    }
  } catch (error) {
    console.error(`Error comparing Draw ${drawId}:`, error);
  }
}

// Usage for comparing all draws
 
//const chain = '42161';
//const chain = '8453';

// op
const chain = '10'
const prizePool = '0xF35fE10ffd0a9672d0095c435fd8767A7fe29B55';

// arb
//const prizePool = '0x52e7910c4c287848c8828e8b17b8371f4ebc5d42'

// base
//const prizePool = '0x45b2010d8a4f08b53c9fa7544c51dfd9733732cb'
//const totalDraws = 42;

//compareDraws(chain, prizePool, totalDraws);

// Usage for comparing a single draw with detailed discrepancies
const specificDrawId = '101';
compareSingleDraw(chain, prizePool, specificDrawId);
