const fetch = require('cross-fetch');
const timelockQuery = 'https://api.zapper.fi/v2/apps/uniswap-v3/balances?';
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path"); // Import the path module for path operations

dotenv.config();

// Define the directory where the files will be saved
const dataDirectory = "./data";

async function getZapperInfo(address, network) {
  try {
   const zapperPath = `${timelockQuery}addresses%5B%5D=${address}&network=${network}&api_key=${process.env.ZAPPER_KEY}`
    console.log("zapper zappin",zapperPath)
    let lpdata = await fetch(zapperPath)
    lpdata = await lpdata.json();

    // Use path.join to create the file path for writing
    const filePath = path.join(dataDirectory, `zap${address}${network}.json`);
    fs.writeFileSync(filePath, JSON.stringify(lpdata));
    console.log(`Wrote zap file for ${address}${network} to ${dataDirectory}`);

    return lpdata;
  } catch (error) {
    console.log(error);
    console.log(`Covalent fetch failed, using backup for chain ${network}`);
    try {
      // Use path.join to create the file path for reading
      const filePath = path.join(dataDirectory, `zap${address}${network}.json`);
      const backup = JSON.parse(fs.readFileSync(filePath, "utf8"));

      return backup;
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports.GetZapperInfo = getZapperInfo;
getZapperInfo("0x42cd8312D2BCe04277dD5161832460e95b24262E",
    "ethereum")
