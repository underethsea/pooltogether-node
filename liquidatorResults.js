const fs = require('fs');
const path = require('path');
const DECIMALS = 10 ** 18;

const dataFilePath = path.join(__dirname, './data/liquidator-history.json');
const data = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));

function parseDuration(input) {
    const daysRegex = /^(\d+)d$/;
    const hoursRegex = /^(\d+)h$/;
    const timestampRegex = /^(\d+)$/;

    if (daysRegex.test(input)) {
        return parseInt(input.match(daysRegex)[1]) * 24 * 60 * 60 * 1000;
    } else if (hoursRegex.test(input)) {
        return parseInt(input.match(hoursRegex)[1]) * 60 * 60 * 1000;
    } else if (timestampRegex.test(input)) {
        return Date.now() - parseInt(input.match(timestampRegex)[1]);
    } else {
        throw new Error('Invalid input format. Please use formats like "2d", "5h", or provide a valid Unix timestamp.');
    }
}

function filterDataByDuration(data, input) {
    const durationMilliseconds = parseDuration(input);
    const currentTime = Date.now();

    const filteredData = data.filter(item => (currentTime - item.date) <= durationMilliseconds);
    filteredData.sort((a, b) => b.date - a.date);

    console.log(`Looking at data for the past ${input}.`);
    return filteredData;
}

function timeAgo(past) {
    const timeDiff = Date.now() - past;
    const seconds = Math.floor(timeDiff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return days + 'd ago';
    if (hours > 0) return hours + 'h ago';
    if (minutes > 0) return minutes + 'm ago';
    return seconds + 's ago';
}

const filteredData = filterDataByDuration(data, process.argv[2] || '1d');
const transformedData = filteredData.map(item => {
    const gasEstimateETH = parseFloat(item.gasEstimateETH / DECIMALS).toFixed(18);
    const gasCostUSD = (item.gasCostETH * item.ethPrice).toFixed(2);
    const amountSent = (parseFloat(item.amountSent) / DECIMALS).toFixed(4);
    const amountReceived = (parseFloat(item.amountReceived) / (10 ** item.amountReceivedDecimals)).toFixed(4);
    const poolPrice = parseFloat(item.poolPrice).toFixed(4)
    
    const amountSentUSDValue = parseFloat(amountSent) * item.poolPrice;
    const amountReceivedUSDValue = parseFloat(amountReceived) * item.pairOutPrice;
    const profitOrLossUSD = (amountReceivedUSDValue - amountSentUSDValue - parseFloat(gasCostUSD)).toFixed(2);

    const time = timeAgo(item.date);

    return [item.txHash, time, `${amountSent} ($${amountSentUSDValue.toFixed(2)})`,poolPrice, `${amountReceived} ($${amountReceivedUSDValue.toFixed(2)})`, gasCostUSD, profitOrLossUSD];
});

const headers = ['Tx Hash', 'Time', 'POOL Sent ($)', 'Pricing', 'Amount Received, ($)', 'Gas Cost ($)', 'Profit/Loss ($)'];

// Calculating totals


const totalGasETH = filteredData.reduce((sum, item) => sum + item.gasCostETH, 0);
const totalGasUSD = filteredData.reduce((sum, item) => sum + (item.gasCostETH * item.ethPrice), 0);
const totalProfitsUSD = transformedData.reduce((sum, item) => sum + parseFloat(item[5]), 0);
const totalWeightedPoolPrice = filteredData.reduce((sum, item) => sum + (parseFloat(item.amountSent) / DECIMALS) * item.poolPrice, 0);
const totalAmountSent = filteredData.reduce((sum, item) => sum + parseFloat(item.amountSent), 0);
const averagePoolPriceWeighted = totalWeightedPoolPrice / (totalAmountSent / DECIMALS);


// Calculate total spent and total profit percentage
const totalSpentETH = filteredData.reduce((sum, item) => sum + parseFloat(item.amountSent) / DECIMALS, 0);
const totalSpentUSD = totalSpentETH * averagePoolPriceWeighted;
const totalProfitPercentage = (totalProfitsUSD / totalSpentUSD * 100).toFixed(2);

// Display total spent and total profit percentage
console.log(`Total Spent: ${totalSpentETH.toFixed(5)} POOL ($${totalSpentUSD.toFixed(2)})`);
console.log(`Total Profit % of Pool Spent: ${totalProfitPercentage}%`);
console.log('\n');


// Displaying totals
console.log(`Total Gas Spent: ${totalGasETH.toFixed(5)} ETH`);
console.log(`Total Gas Spent: $${totalGasUSD.toFixed(2)}`);
console.log(`Total Profits: $${totalProfitsUSD.toFixed(2)}`);
console.log(`Average Pool Pricing (Weighted): $${averagePoolPriceWeighted.toFixed(4)}`);
console.log('\n');


function formatString(str, length) {
    return str.padEnd(length);
}

const maxLengths = transformedData.reduce((max, item) => {
    item.forEach((value, index) => {
        if (value.length > max[index]) {
            max[index] = value.length;
        }
    });
    return max;
}, headers.map(header => header.length));

const separator = '+-' + maxLengths.map(length => '-'.repeat(length)).join('-+-') + '-+';

console.log(separator);
console.log('| ' + headers.map((header, index) => formatString(header, maxLengths[index])).join(' | ') + ' |');
console.log(separator);

transformedData.forEach(item => {
    console.log('| ' + item.map((value, index) => formatString(value, maxLengths[index])).join(' | ') + ' |');
    console.log(separator);
});
