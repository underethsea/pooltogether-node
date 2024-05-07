require('../env-setup');
const fetch = require('cross-fetch');
const {CONFIG} = require('../constants/config')
// Define the API endpoint URL
const apiUrl = 'https://api.1inch.dev/swap/v5.2/' + CONFIG.CHAINID + '/quote';

// Define the headers with the API key from environment variables
const headers = {
  'Accept': 'application/json',
  'Authorization': `Bearer ${process.env.ONEINCH_KEY}`,
};

// Function to make the API request
async function Get1inchQuote(srcToken, dstToken, amount) {
  // Define the query parameters
  const queryParams = {
    src: srcToken,
    dst: dstToken,
    amount: amount.toString(),
  };

  // Construct the URL with query parameters
  const url = new URL(apiUrl);
  Object.keys(queryParams).forEach(key => url.searchParams.append(key, queryParams[key]));

  try {
    // Make the API request
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Usage example: Replace 'srcToken', 'dstToken', and 'amount' with your values
//getQuote('0x395Ae52bB17aef68C2888d941736A71dC6d4e125', '0x8c6f28f2F1A3C87F0f938b96d27520d9751ec8d9', 100000000000000);
//1inchQuote('0x395Ae52bB17aef68C2888d941736A71dC6d4e125', '0x4200000000000000000000000000000000000006', 100000000000000);
 module.exports = {Get1inchQuote}
