const https = require('https');
const fs = require('fs');
// https://github.com/GenerationSoftware/pt-v5-testnet/blob/v51/deployments/optimismSepolia/contracts.json
//https://raw.githubusercontent.com/GenerationSoftware/pt-v5-testnet/v51/deployments/optimismSepolia/contracts.json
// const url = "https://raw.githubusercontent.com/GenerationSoftware/pt-v5-testnet/v51/deployments/optimismSepolia/contracts.json"
//const url = "https://raw.githubusercontent.com/GenerationSoftware/pt-v5-mainnet/prod.deploy.3/deployments/optimism/contracts.json"
//https://github.com/GenerationSoftware/pt-v5-testnet/blob/main/deployments/baseSepolia/contracts.json
// const url = "https://raw.githubusercontent.com/GenerationSoftware/pt-v5-testnet/main/deployments/baseSepolia/contracts.json"
//const url = "https://raw.githubusercontent.com/GenerationSoftware/pt-v5-testnet/main/deployments/arbitrumSepolia/contracts.json"
const url = "https://raw.githubusercontent.com/GenerationSoftware/pt-v5-mainnet/main/deployments/world/contracts.json"
 
//const jsonFile = require('./gnosisDeployment.json')

// Mapping of types to their corresponding keys (case-insensitive)
const typeKeyMapping = {
    PrizePool: "PRIZEPOOL",
    Claimer: "CLAIMER",
    TokenFaucet: "TOKENFAUCET",
    LiquidationRouter: "LIQUIDATIONROUTER",
    PrizeVaultFactory: "VAULTFACTORY",
    TwabController: "TWABCONTROLLER",
    LiquidationPairFactory: "LIQUIDATIONPAIRFACTORY",
    RngBlockHash: "RNGBLOCKHASH",
    ClaimerFactory: "CLAIMERFACTORY",
    RngWitnet: "RNG",
    DrawManager: "DRAWMANAGER",
    ClaimerFactory: "CLAIMERFACTORY",
    //LiquidationRouter: "LIQUIDATIONROUTER",
   TpdaLiquidationRouter: "LIQUIDATIONROUTER",
   TwabRewards: "TWABREWARDS",
};

// Function to fetch JSON data from the provided URL
function fetchData(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                resolve(JSON.parse(data));
            });

        }).on('error', (error) => {
            reject(error);
        });
    });
}

function extractAddressesAndABIs(contracts, mapping) {
    let addresses = {};
    let abis = {};

    // Directly handle VAULTS and DRAWMANAGER ordering here
    contracts.forEach(contract => {
        const { type, address, abi } = contract;
        const key = mapping[type];

        if (key) {
            // Handling for regular contract types
            addresses[key] = address;
            abis[key] = abi;
        }

        // Special handling for PrizeVault
        if (type === 'PrizeVault') {
            if (!addresses['VAULTS']) {
                addresses['VAULTS'] = [];
            }
            addresses['VAULTS'].push({'VAULT': address});
            // Assuming same ABI for all VAULTS
            if (!abis['VAULT']) {
                abis['VAULT'] = abi;
            }
        }
    });

    // Ensure DRAWMANAGER precedes VAULTS
    if (addresses['DRAWMANAGER']) {
        const drawManagerAddr = addresses['DRAWMANAGER'];
        const drawManagerAbi = abis['DRAWMANAGER'];
        addresses = {'DRAWMANAGER': drawManagerAddr, ...addresses};
        abis = {'DRAWMANAGER': drawManagerAbi, ...abis};
    }

    return { addresses, abis };
}
// Function to write ABI to a file
function writeABIFile(contractName, abi) {
    const fileName = `./abis/${contractName.toLowerCase()}.js`;
    const fileContent = `const ABI = ${JSON.stringify(abi)};\nmodule.exports =  ABI ;`;

    fs.writeFile(fileName, fileContent, (err) => {
        if (err) throw err;
        console.log(`ABI file for ${contractName} has been saved as ${fileName}`);
    });
}
// Function to write ABI index to a file
function writeABIIndexFile(abis) {
    const fileName = 'abi.js';
    let indexContent = '';

    Object.entries(abis).forEach(([contractName]) => {
        indexContent += `const ${contractName} = require('./abis/${contractName.toLowerCase()}');\n`;
    });

    indexContent += '\nconst ABI = {\n';
    Object.entries(abis).forEach(([contractName]) => {
        indexContent += `  ${contractName}: ${contractName},\n`;
    });
    indexContent += '};\n\nmodule.exports = { ABI };\n';

    fs.writeFile(fileName, indexContent, (err) => {
        if (err) throw err;
        console.log(`ABI index file has been saved as ${fileName}`);
    });
}

// Main function to execute the script
async function main() {
// moved to top   
// const url = 'https://raw.githubusercontent.com/GenerationSoftware/pt-v5-testnet/v51/deployments/optimismSepolia/contracts.json';

    try {
        // Fetch JSON data from the URL
        
        let jsonData
        //if (jsonFile){jsonData=jsonFile}else{jsonData = await fetchData(url)}
        jsonData = await fetchData(url)
        // Extract contracts array from JSON data
        const contracts = jsonData.contracts || [];

        // Extract addresses and ABIs based on the mapping
        const { addresses, abis } = extractAddressesAndABIs(contracts, typeKeyMapping);

        // Output the addresses object
        console.log(addresses);

        // Write ABI index to a file
        writeABIIndexFile(abis);

        // Write each ABI to a separate file
        Object.entries(abis).forEach(([contractName, abi]) => {
            writeABIFile(contractName, abi);
        });

    } catch (error) {
        console.error('Error fetching or processing data:', error);
    }
}

// Execute the main function
main();
