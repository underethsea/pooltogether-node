const ethers = require('ethers');
const fs = require('fs');
const axios = require('axios');
const NodeCache = require('node-cache');
const cache = new NodeCache();

const { ABI } = require('./constants/abi.js');
const { PROVIDERS } = require('../constants/providers.js');
const { OwnerInfo } = require("./functions/getVaultOwner.js");
const updateTimeFile = './data/lastUpdateV5Vaults.json';
const { Multicall } = require("../utilities/multicall.js")
const BLACKLIST = [
'0xA0be8Ac4A90E080138C8c7B1Da7BfEb7C3AbBc1b', // fluid eth vault
'0x36e5d788c8809c2cf5b0e919bfe5687404893428', // cauliflower ethereum
'0x32b27D1aB97607BF276ce3C915ef9d66fB35b73C', // test nuts plus
'0x4fd55e86485be48111b0ad17558da666458b01b6', // moxie base
'0x8ce0931af3fdb13c655bada9cbccc69056b97105', // dead usdc on scroll
'0x8adf2192d779b015e2dcfd8ef3ba115081ea2ec2', // harvest usdc base
'0x019ff7c88119bffce03cfa163148bc2e051f5905'].map(address => address.toLowerCase());
const DEPRECATED_NO_DEPOSIT = ['0xf1d934d5a3c6e530ac1450c92af5ba01eb90d4de','0x8c2f27b7819eb1bb7e3b5c407c5e1839186d5aba'].map(address => address.toLowerCase());
const DEPRECATED_NO_ACCESS = [].map(address => address.toLowerCase());
const SPECIAL_ACCESS = ['0x8ad5959c9245b64173d4c0c3cd3ff66dac3cab0e'].map(address => address.toLowerCase());
const INVALID_VAULTS = './data/invalidVaults.json'; // File to store invalid vaults
const oneDayInSeconds = 24 * 60 * 60;
const sevenDaysInSeconds = 7 * oneDayInSeconds;
const twentyEightDaysInSeconds = 28 * oneDayInSeconds;


async function isInvalidVault(vaultAddress) {
  try {
    const data = JSON.parse(fs.readFileSync(INVALID_VAULTS, 'utf8'));
    return data[vaultAddress] || false;
  } catch (error) {
    return false;
  }
}

async function flagInvalidVault(vaultAddress) {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(INVALID_VAULTS, 'utf8'));
  } catch (error) {
    // File not found or invalid JSON, continue with empty object
  }
  data[vaultAddress] = true;
  fs.writeFileSync(INVALID_VAULTS, JSON.stringify(data, null, 2), 'utf8');
  console.log(vaultAddress,"marked as invalid vault")
}

async function getLastUpdateTime(vault) {
  try {
    const data = JSON.parse(fs.readFileSync(updateTimeFile, 'utf8'));
    return data[vault] || 0;
  } catch (error) {
    return 0;
  }
}

async function setLastUpdateTime(vault) {
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(updateTimeFile, 'utf8'));
  } catch (error) {
    // File not found or invalid JSON, continue with empty object
  }
  data[vault] = Date.now();
  fs.writeFileSync(updateTimeFile, JSON.stringify(data, null, 2), 'utf8');
}

async function getContributedPeriod(prizePoolContract, vaultAddress, lastAwardedDrawId, periodSeconds, drawPeriodSeconds) {
  // Calculate the number of draws that fit into the period
if (typeof drawPeriodSeconds === 'undefined' || isNaN(drawPeriodSeconds) || drawPeriodSeconds <= 0) {
    console.warn(`Invalid drawPeriodSeconds on vault ${vaultAddress}: ${drawPeriodSeconds}. Returning 0.`);
    return 0;
  }
  const numberOfDraws = Math.floor(periodSeconds / drawPeriodSeconds); // Use Math.ceil instead of Math.floor
//console.log("number of draws",numberOfDraws)
//console.log("query period seconds",periodSeconds)
//console.log("draw period seconds",drawPeriodSeconds)
  // Ensure the number of draws is at least 1
  if (numberOfDraws < 1) {
    console.warn(`Requested period (${periodSeconds} seconds) is too short for the draw period (${drawPeriodSeconds} seconds). Returning 0.`);
    return 0;
  }

  // Calculate the starting draw ID for the period
  const startDrawId = lastAwardedDrawId - numberOfDraws + 1; // Added +1 to avoid off-by-one errors


  // Ensure the start draw ID is valid
  if (startDrawId < 0) {
    console.warn(`Start draw ID (${startDrawId}) is out of bounds. Returning 0.`);
    return 0;
  }

  // Fetch the contribution data between the draw periods
  try {
    console.log("getting contribution for draw",startDrawId,"through draw",lastAwardedDrawId)
    const contributed = await prizePoolContract.getContributedBetween(vaultAddress, startDrawId, lastAwardedDrawId);
    return ethers.utils.formatUnits(contributed, 18);
  } catch (error) {
    console.error(`Error fetching contributed data for period: ${periodSeconds} seconds`, error);
    return 0;
  }
}


async function getContributed24h(prizePoolContract, vaultAddress, lastAwardedDrawId, drawPeriodSeconds) {
  if (drawPeriodSeconds > oneDayInSeconds) {
    console.log(vaultAddress,"draw period is longer than one day")
    return 0; // Skip if draw period exceeds 24 hours
  }
  return await getContributedPeriod(prizePoolContract, vaultAddress, lastAwardedDrawId, oneDayInSeconds, drawPeriodSeconds);
}

async function getContributed7d(prizePoolContract, vaultAddress, lastAwardedDrawId, drawPeriodSeconds) {
  if (drawPeriodSeconds > sevenDaysInSeconds) {
    console.log(vaultAddress,"draw period is longer than seven days")
    return 0; // Skip if draw period exceeds 7 days
  }
  return await getContributedPeriod(prizePoolContract, vaultAddress, lastAwardedDrawId, sevenDaysInSeconds, drawPeriodSeconds);
}

async function getContributed28d(prizePoolContract, vaultAddress, lastAwardedDrawId, drawPeriodSeconds) {
  return await getContributedPeriod(prizePoolContract, vaultAddress, lastAwardedDrawId, twentyEightDaysInSeconds, drawPeriodSeconds);
}


async function updateContributedBetween(vaults, prizePoolContract, lastAwardedDrawId, chainName, chainId, prizePoolAddress,drawPeriodSeconds) {
  const prizeData = await fetch7dPrizeData(chainId, prizePoolAddress);
  if (!prizeData) {
    console.error('Failed to fetch 7d prize data, returning existing vault data.');
    return vaults;
  }
  const updatedVaults = [];

  for (const vault of vaults) {
    const lastUpdateTime = await getLastUpdateTime(vault.vault);
    const currentTime = Date.now();
  const lastTVLUpdateTime = cache.get(`${vault.vault}_tvl`) || 0; // Moved inside loop


  // Update TVL every 20 minutes
  if (currentTime - lastTVLUpdateTime >= 20 * 60 * 1000) {  // 20 minutes
    try {
      const contract = new ethers.Contract(vault.vault, ABI.VAULT, PROVIDERS[chainName]);
      const totalSupply = await contract.totalSupply();
      //const tvl = ethers.utils.formatUnits(totalSupply, vault.decimals);  
      vault.tvl = totalSupply.toString();

      // Set the last TVL update time in cache
      cache.set(`${vault.vault}_tvl`, currentTime);
    } catch (e) {
      console.log(`Error fetching TVL for vault ${vault.vault}:`, e);
    }
  }

//update metrics every 6 hours
    if (currentTime - lastUpdateTime >= 6 * 60 * 60 * 1000) {
console.log("getting contributions for vault",vault.vault,vault.symbol,"draw period seconds",drawPeriodSeconds)
if(vault.symbol==="przPOOL"){lastAwardedDrawId = lastAwardedDrawId + 1} // use open draw for przPOOL because contributions are  after draw   
   const contributed24h = await getContributed24h(prizePoolContract, vault.vault, lastAwardedDrawId, drawPeriodSeconds);
      const contributed7d = await getContributed7d(prizePoolContract, vault.vault, lastAwardedDrawId, drawPeriodSeconds);
      const contributed28d = await getContributed28d(prizePoolContract, vault.vault, lastAwardedDrawId, drawPeriodSeconds);
     let drawsToGo = 7
                if(chainName ==="ETHEREUM"){drawsToGo = 1}
                const vaultPortion = await prizePoolContract.getVaultPortion(vault.vault,lastAwardedDrawId + 1 - drawsToGo,lastAwardedDrawId+1)
            
      const won7d = getVault7dPrize(prizeData, vault.vault, lastAwardedDrawId);
      const prizes7d = getVaultPrizes(prizeData, vault.vault, lastAwardedDrawId, 7);
      vault.prizes7d = prizes7d
      vault.contributed7d = contributed7d;
      vault.contributed24h = contributed24h;
      vault.contributed28d = contributed28d;
      vault.won7d = won7d;
      vault.vp = Number(vaultPortion)/1e18

      try {
        const ownerInfo = await OwnerInfo(vault.vault, PROVIDERS[chainName]);
        vault.gnosis = ownerInfo;
      } catch (error) {
        console.error(`Error fetching vault owner for ${vault.vault}: ${error.message}`);
        console.error(`Reason: ${error.reason || error.code}`);
        console.error(`URL: ${error.transaction?.url || error.config?.url}`);
        console.error(`Headers: ${JSON.stringify(error.config?.headers || {}, null, 2)}`);
      }

      await setLastUpdateTime(vault.vault);
    }

    let status;
    if (DEPRECATED_NO_DEPOSIT.includes(vault.vault)) {
      status = 1;
    } else if  (SPECIAL_ACCESS.includes(vault.vault)) {
      status = 2;
    }
      else if (DEPRECATED_NO_ACCESS.includes(vault.vault)) {
      status = 0;
    }

    if (status !== undefined) {
      vault.status = status;
    } else {
      delete vault.status;
    }

    vault.c = chainId;
    vault.pp = prizePoolAddress;

    updatedVaults.push(vault);
  }

  return updatedVaults;
}

async function fetch7dPrizeData(chainId, prizePoolAddress) {
  try {
    const url = `https://poolexplorer.xyz/vault-totals-${chainId}-${prizePoolAddress}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching 7d prize data:', error);
    return null;
  }
}

// prize value
function getVault7dPrize(prizeData, vaultAddress, lastAwardedDrawId) {
  const vaultPrizes = prizeData[vaultAddress.toLowerCase()];
  if (!vaultPrizes) return '0';

  let totalWon = 0;
  for (let i = lastAwardedDrawId; i > lastAwardedDrawId - 7; i--) {
    const drawData = vaultPrizes[i.toString()];
    const prize = drawData ? parseFloat(drawData.value) : 0;
    totalWon += prize;
  }

  return totalWon.toString();
}

//prize count
function getVaultPrizes(prizeData, vaultAddress, lastAwardedDrawId, days) {
  const vaultPrizes = prizeData[vaultAddress.toLowerCase()];
  if (!vaultPrizes) return 0;

  let totalPrizes = 0;
  let availableDraws = 0;

  for (let i = lastAwardedDrawId; i > lastAwardedDrawId - days; i--) {
    if (!vaultPrizes[i.toString()]) {
      return 0; // If any draw is missing, return 0
    }
    availableDraws++;
    const drawData = vaultPrizes[i.toString()];
    const prizes = drawData ? drawData.prizes : 0;
    totalPrizes += prizes;
  }

  // Ensure we have the exact number of requested draws
  if (availableDraws < days) {
    return 0;
  }

  return totalPrizes;
}

async function UpdateV5Vaults(vaults, prizePool, chainName, chainId) {
  vaults = vaults.filter(vault => !BLACKLIST.includes(vault.vault.toLowerCase()));

  let existingData;
  try {
    existingData = JSON.parse(fs.readFileSync(`./data/vaults-${prizePool}.json`, 'utf8'));
    existingData = existingData.filter(vault => !BLACKLIST.includes(vault.vault.toLowerCase()));
  } catch (error) {
    console.error('Error reading from vaults.json:', error);
    existingData = [];
  }

  const chain = 'optimistic-ethereum';
  const contractAddresses = existingData.map(vault => vault.asset);

  for (const newVault of vaults) {

    const existingVault = existingData.find(v => v.vault.toLowerCase() === newVault.vault.toLowerCase());

    if (await isInvalidVault(newVault.vault)) {
      console.log(`Skipping invalid vault ${newVault.vault}`);
      continue;
    }

    if (existingVault) {
      // Update existing vault
      existingVault.poolers = newVault.poolers;

      if (newVault.vault.toLowerCase() === '0x52ee27824a64430cbd1be03794d4eb92e4b8bbd0') {
        console.log('Updated existing vault with new poolers count:', newVault.poolers);
      }

      let status;
      if (DEPRECATED_NO_DEPOSIT.includes(newVault.vault)) {
        status = 1;
      } else if (DEPRECATED_NO_ACCESS.includes(newVault.vault)) {
        status = 0;
      }

      if (status !== undefined) {
        existingVault.status = status;
      } else {
        delete existingVault.status;
      }
    } else {
      let gnosis;
      try {
        gnosis = await OwnerInfo(newVault.vault, PROVIDERS[chainName]);
      } catch (e) {
        console.log("error getting vault owner info", e);
      }

      const contract = new ethers.Contract(newVault.vault, ABI.VAULT, PROVIDERS[chainName]);
      try {
        console.log("FETCHING VAULT DATA------------")
        console.log(newVault.vault, chainName)

        const asset = await contract.asset();
        const name = await contract.name();
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();
        const owner = await contract.owner();
        let liquidationPair
try{
        liquidationPair = await contract.liquidationPair();}
catch(e){console.log("no liquidation pair");liquidationPair = ""}
        const assetContract = new ethers.Contract(asset, ABI.ERC20, PROVIDERS[chainName]);
        const assetSymbol = await assetContract.symbol();
        console.log("made it past all fetching")

        let status;
        if (DEPRECATED_NO_DEPOSIT.includes(newVault.vault)) {
          status = 1;
        } else if (DEPRECATED_NO_ACCESS.includes(newVault.vault)) {
          status = 0;
        }

        let newData = {
          ...newVault,
          c: chainId,
          pp: prizePool,
          name,
          symbol,
          decimals,
          asset,
          owner,
          liquidationPair,
          assetSymbol,
          gnosis
        };

        if (status !== undefined) {
          newData.status = status;
        }

        existingData.push(newData);
        contractAddresses.push(asset);

      } catch (error) {
        console.error(`Error fetching data for vault ${newVault.vault}:`, error.message);

        await flagInvalidVault(newVault.vault);

        continue;
      }
    }
  }

  let lastAwardedDrawId;
  const prizePoolContract = new ethers.Contract(prizePool, ABI.PRIZEPOOL, PROVIDERS[chainName]);

let drawPeriodSeconds;
try {
  drawPeriodSeconds = await prizePoolContract.drawPeriodSeconds();
  if (typeof drawPeriodSeconds === 'undefined' || isNaN(drawPeriodSeconds)) {
    console.error('drawPeriodSeconds is undefined or invalid. Defaulting to 0.');
    drawPeriodSeconds = 0;  // Set a fallback value
  }
} catch (error) {
  console.error('Error fetching drawPeriodSeconds:', error);
  drawPeriodSeconds = 0;  // Set a fallback value in case of error
}

  try {
    lastAwardedDrawId = await prizePoolContract.getLastAwardedDrawId();
  } catch (error) {
    console.error('Error fetching last awarded draw id:', error);
    return;
  }
console.log("getting contributed between for prize pool",prizePool,"draw period",drawPeriodSeconds)
  const updatedVaults = await updateContributedBetween(existingData, prizePoolContract, lastAwardedDrawId, chainName, chainId, prizePool,drawPeriodSeconds);


  fs.writeFileSync(`./data/vaults-${prizePool}.json`, JSON.stringify(updatedVaults, null, 2), 'utf8');


  return updatedVaults;
}


async function fetchTokenPricesAndUpdateVaults(existingData, chain) {
  const contractAddresses = existingData.map(vault => vault.asset.toLowerCase());
  const uniqueAddresses = [...new Set(contractAddresses)];

  try {
    const geckoPath = `https://api.coingecko.com/api/v3/simple/token_price/${chain}`;
    const response = await axios.get(geckoPath, {
      params: {
        contract_addresses: uniqueAddresses.join(','),
        vs_currencies: 'usd',
      },
    });

    existingData.forEach(vault => {
      const address = vault.asset.toLowerCase();
      if (response.data[address]) {
        vault.price = response.data[address].usd || 'Price not available';
      }
    });
  } catch (error) {
    console.error('Error fetching token prices:', logError(error));
  }

  return existingData;
}

const logError = (error) => {
  if (error.response) {
    console.error(`Error fetching token prices: ${error.message}`);
    console.error(`Status Code: ${error.response.status}`);
    console.error(`URL: ${error.config.url}`);
  } else if (error.request) {
    console.error(`Error fetching token prices: No response received`);
    console.error(`URL: ${error.config.url}`);
    console.error(`Headers: ${JSON.stringify(error.config.headers, null, 2)}`);
  } else {
    console.error(`Error fetching token prices for vaults: ${error.message}`);
  }
};

module.exports = { UpdateV5Vaults };
