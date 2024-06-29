const ethers = require('ethers');
const fs = require('fs');
const axios = require('axios');
const { ABI } = require('./constants/abi.js');
const { PROVIDERS } = require('../constants/providers.js');
const { OwnerInfo } = require("./functions/getVaultOwner.js");
const updateTimeFile = './data/lastUpdateV5Vaults.json';

const BLACKLIST = ['0x019ff7c88119bffce03cfa163148bc2e051f5905'].map(address => address.toLowerCase());
const DEPRECATED_NO_DEPOSIT = ['0xf1d934d5a3c6e530ac1450c92af5ba01eb90d4de'].map(address => address.toLowerCase());
const DEPRECATED_NO_ACCESS = [].map(address => address.toLowerCase());

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

async function getPrizePoolData(prizePoolContract, vaultAddress, lastAwardedDrawId) {
  try {
    const contributedBetween = await prizePoolContract.getContributedBetween(vaultAddress, lastAwardedDrawId - 6, lastAwardedDrawId);
    return ethers.utils.formatUnits(contributedBetween, 18);
  } catch (error) {
    console.error('Error fetching prize pool data:', error);
    return 0;
  }
}

async function getContributed24h(prizePoolContract, vaultAddress, lastAwardedDrawId) {
  try {
    const contributed24h = await prizePoolContract.getContributedBetween(vaultAddress, lastAwardedDrawId, lastAwardedDrawId);
    return ethers.utils.formatUnits(contributed24h, 18);
  } catch (error) {
    console.error('Error fetching contributed24h data:', error);
    return 0;
  }
}

async function updateContributedBetween(vaults, prizePoolContract, lastAwardedDrawId, chainName, chainId, prizePoolAddress) {
  const prizeData = await fetch7dPrizeData(chainId, prizePoolAddress);
  if (!prizeData) {
    console.error('Failed to fetch 7d prize data, returning existing vault data.');
    return vaults;
  }
  const updatedVaults = [];

  for (const vault of vaults) {
    const lastUpdateTime = await getLastUpdateTime(vault.vault);
    const currentTime = Date.now();

    if (currentTime - lastUpdateTime >= 6 * 60 * 60 * 1000) {
      const contributedBetween = await getPrizePoolData(prizePoolContract, vault.vault, lastAwardedDrawId);
      const contributed24h = await getContributed24h(prizePoolContract, vault.vault, lastAwardedDrawId);
      const won7d = getVault7dPrize(prizeData, vault.vault, lastAwardedDrawId);
      const prizes7d = getVaultPrizes(prizeData, vault.vault, lastAwardedDrawId, 7);
      vault.prizes7d = prizes7d
      vault.contributed7d = contributedBetween;
      vault.contributed24h = contributed24h;
      vault.won7d = won7d;

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
    } else if (DEPRECATED_NO_ACCESS.includes(vault.vault)) {
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

    if (existingVault) {
      existingVault.poolers = newVault.poolers;

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
        const asset = await contract.asset();
        const name = await contract.name();
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();
        const owner = await contract.owner();
        const liquidationPair = await contract.liquidationPair();
        const assetContract = new ethers.Contract(asset, ABI.ERC20, PROVIDERS[chainName]);
        const assetSymbol = await assetContract.symbol();

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
        }

        if (status !== undefined) {
          newData.status = status;
        }

        existingData.push(newData);
        contractAddresses.push(asset);
      } catch (error) {
        console.error(`Error fetching data for vault ${newVault.vault}:`, error.message);
      }
    }
  }

  if (contractAddresses.length > 0) {
    existingData = await fetchTokenPricesAndUpdateVaults(existingData, 'optimistic-ethereum');
  }

  let lastAwardedDrawId;
  const prizePoolContract = new ethers.Contract(prizePool, ABI.PRIZEPOOL, PROVIDERS[chainName]);
  try {
    lastAwardedDrawId = await prizePoolContract.getLastAwardedDrawId();
  } catch (error) {
    console.error('Error fetching last awarded draw id:', error);
    return;
  }

  const updatedVaults = await updateContributedBetween(existingData, prizePoolContract, lastAwardedDrawId, chainName, chainId, prizePool);

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
