require('../env-setup');
const fetch = require('cross-fetch');
const {CONFIG} = require('../constants/config')
// Load environment variables from .env file

async function GetPricesForToken(tokenAddress, currency = "USD", chain = CONFIG.CHAINID) {
  const apiKey = process.env['ONEINCH_KEY'];

  if (!apiKey) {
    console.error('1INCH_KEY is missing in process.env.');
    return null;
  }

  const url = 'https://api.1inch.dev/price/v1.1/' + chain + '/';

  const requestBody = {
    tokens: [tokenAddress.toLowerCase()],
    currency: currency,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (response.status === 200) {
      const priceData = await response.json();
      const price = priceData[tokenAddress.toLowerCase()];

      if (price !== undefined) {
        console.log(`Price for ${tokenAddress} in ${currency}: ${price}`);
        return price;
      } else {
        console.log(url)
        console.log(response)
        console.log(requestBody)
        
        console.error(`No valid price received for ${tokenAddress}.`);
        return null;
      }
    } else {
      console.error('Failed to fetch token price. Status:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Error fetching token price:', error.message);
    return null;
  }
}

// Example usage for the specific token address and currency
const tokenAddress = '0x395Ae52bB17aef68C2888d941736A71dC6d4e125';
const currency = 'USD';
const chain = 10;
// getPricesForToken(tokenAddress.toLowerCase(), currency, chain);
module.exports = {GetPricesForToken}
