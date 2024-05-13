const { loadChainConfig, getChainConfig } = require('./chains');

const chainKey = process.argv[2] || '';

try {
  // Load the configuration with the provided chainKey or default
  loadChainConfig(chainKey);
} catch (error) {
  console.error(`Error loading chain configuration: ${error.message}`);
  process.exit(1);
}

const CHAINNAME = getChainConfig().CHAINNAME;
const CHAINID = getChainConfig().CHAINID;


const fs = require('fs');
const path = require('path');
const { CONFIG } = require('./constants/config.js')
const {ADDRESS } = require('./constants/address.js')
const DECIMALS = 10 ** ADDRESS[CHAINNAME].PRIZETOKEN.DECIMALS
const PRIZE = ADDRESS[CHAINNAME].PRIZETOKEN.NAME

const dataFilePath = path.join(__dirname, './data/claim-history.json');

// Read and parse the JSON file
const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));


function parseDuration(input) {
  const daysRegex = /^(\d+)d$/;
  const hoursRegex = /^(\d+)h$/;
  const timestampRegex = /^(\d+)$/;
  
  if (daysRegex.test(input)) {
    return parseInt(input.match(daysRegex)[1]) * 24 * 60 * 60 * 1000; // Convert to milliseconds
  } else if (hoursRegex.test(input)) {
    return parseInt(input.match(hoursRegex)[1]) * 60 * 60 * 1000; // Convert to milliseconds
  } else if (timestampRegex.test(input)) {
    return Date.now() - parseInt(input.match(timestampRegex)[1]); // Calculate duration from Unix timestamp
  } else {
    throw new Error('Invalid input format. Please use formats like "2d", "5h", or provide a valid Unix timestamp.');
  }
}


function timeAgo(past, currentTime) {
  const timeDiff = currentTime - past;
  const seconds = Math.floor(timeDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return days + 'd ago';
  if (hours > 0) return hours + 'h ago';
  if (minutes > 0) return minutes + 'm ago';
  return seconds + 's ago';
}


function filterDataByDuration(data, input) {
  // Calculate the duration in milliseconds based on the provided input
  const durationMilliseconds = parseDuration(input);

  // Get the current time within the function scope
  const currentTime = Date.now();

  // Filter the data based on the calculated duration
  const filteredData = data.filter(item => (currentTime - item.time) <= durationMilliseconds);
  filteredData.sort((a, b) => b.time - a.time);

  // Log the duration being considered
  console.log(``)
  console.log(`Looking at data for the past ${input}.`);

  return filteredData;
}


const filteredData = filterDataByDuration(data, process.argv[2] || '1d');

// Calculate totals
const totalPayouts = filteredData.reduce((sum, item) => sum + item.totalPayout, 0) / DECIMALS;
const totalFees = filteredData.reduce((sum, item) => sum + item.totalFee, 0) / DECIMALS;
const totalFeesPercentage = (totalFees / (totalPayouts + totalFees) * 100).toFixed(2) + '%';
const totalGasETH = filteredData.reduce((sum, item) => sum + item.totalGasETH, 0);
const totalGasUSD = filteredData.reduce((sum, item) => sum + (item.totalGasETH * item.ethPrice), 0).toFixed(2);
const totalProfit = filteredData.reduce((sum, item) => sum + (item.totalFee / DECIMALS * item.ethPrice) - (item.totalGasETH * item.ethPrice), 0).toFixed(2);

// Transform the data for table

const transformedData = filteredData.map(item => {
    const payoutAmount = (item.totalPayout / DECIMALS).toFixed(6);
    const feesAmount = (item.totalFee / DECIMALS).toFixed(6);
    
    const payout = payoutAmount + ` ${PRIZE}`;
    const feesPercentage = ((item.totalFee / (item.totalPayout + item.totalFee)) * 100).toFixed(2);
    const fees = `${feesAmount} ${PRIZE} (${feesPercentage}%)`;
    const gas = "$"+(item.totalGasETH * item.ethPrice).toFixed(2);
    const profit = "$"+((feesAmount * item.ethPrice) - (item.totalGasETH * item.ethPrice)).toFixed(2);

    // Pass item.time and currentTime to timeAgo
    const time = timeAgo(item.time, Date.now());

    return [time, payout, fees, gas, profit];
});


// Calculate the weighted average fee price
const totalWeightedFees = filteredData.reduce((sum, item) => sum + (item.totalFee / DECIMALS * item.ethPrice), 0);
const averageFeePrice = (totalWeightedFees / totalFees).toFixed(4);

// Display totals
console.log("");
console.log(`Total Payouts: ${totalPayouts.toFixed(6)} ${PRIZE}`);
console.log(`Total Fees: ${totalFees.toFixed(6)} (${totalFeesPercentage}) ${PRIZE}`);
console.log(`Average Fee Price: $${averageFeePrice} per POOL`);
console.log(`Total Gas: ${totalGasETH.toFixed(5)} ETH ($${totalGasUSD})`);
console.log(`Total Profit: $${totalProfit}`);
console.log('\n');

const headers = ['Time', 'Payout', 'Fees & (%)', 'Gas', 'Profit'];

function formatString(str, length) {
    return str.padEnd(length);
}

// Determine max lengths for each column considering the headers' length as a minimum
const maxLengths = transformedData.reduce((max, item) => {
    item.forEach((value, index) => {
        if (value.length > max[index]) {
            max[index] = value.length;
        }
    });
    return max;
}, headers.map(header => header.length));

// Create a dynamic separator line based on maxLengths
const separator = '+-' + maxLengths.map(length => '-'.repeat(length)).join('-+-') + '-+';

console.log(separator);
console.log('| ' + headers.map((header, index) => formatString(header, maxLengths[index])).join(' | ') + ' |');
console.log(separator);

transformedData.forEach(item => {
    console.log('| ' + item.map((value, index) => formatString(value, maxLengths[index])).join(' | ') + ' |');
    console.log(separator);
});

console.log(``)
