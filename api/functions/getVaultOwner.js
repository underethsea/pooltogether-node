const ethers = require('ethers');
const { ABI } = require('../constants/abi');
const { PROVIDERS } = require("../../constants/providers")

// not sure this works right
async function isContractAddress(address, provider) {
    const code = await provider.getCode(address);
    return code !== '0x';
}

async function isGnosis(ownerAddress, provider) {
    try {
        const contract = new ethers.Contract(ownerAddress, ABI.GNOSIS, provider);
        const owners = await contract.getOwners();
        const threshold = await contract.getThreshold();
        return { confirmations: owners.length, threshold: Number(threshold) };
    } catch (e) {
        console.log(e);
        return { confirmations: 0, threshold: 0 };
    }
}

const OwnerInfo = async (vaultAddress, provider) => {
    let results = {
        required: 0,
        total: 0
    };

    // Get the owner address from the vault contract
    const vaultContract = new ethers.Contract(vaultAddress, ABI.VAULT, provider);
    const ownerAddress = await vaultContract.owner();

    if(ownerAddress==='0x0000000000000000000000000000000000000000') {
return results
}else{
    // Check if the owner address is a contract
    const isOwnerContract = await isContractAddress(ownerAddress, provider);
    console.log(`Owner Address ${ownerAddress} is ${isOwnerContract ? 'a contract' : 'not a contract'}`);

    if (isOwnerContract) {
        const gnosisInfo = await isGnosis(ownerAddress, provider);
        results.required = gnosisInfo.threshold;
        results.total = gnosisInfo.confirmations;
    } else {
        results.required = -1;
    }

    console.log('Results:', results);
    return results;
}
};

module.exports = { OwnerInfo };

//test on vault
//OwnerInfo("0xbd8fd33e53ab4120638c34cbd454112b39f6b382",PROVIDERS["OPTIMISM"])
