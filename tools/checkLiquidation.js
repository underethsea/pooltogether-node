const { ethers } = require("ethers");
const { PROVIDERS } = require("../constants/providers");
const { CONFIG } = require("../constants/config");
const { ABI } = require("../constants/abi");

// Input liquidation pairs to check status
const pairs = ["0x685fb53798FEf73C79F485eF436C33F866E0c969", "0x055bFA086ecEbC21e6D6De0BB2e2b6BcE0401d58"];

const go = async () => {
    for (const pairAddress of pairs) {
        const pairContract = new ethers.Contract(pairAddress, ABI.LIQUIDATIONPAIR, PROVIDERS[CONFIG.CHAINNAME]);
        const vaultAddress = await pairContract.source();
        const vaultContract = new ethers.Contract(vaultAddress, ABI.VAULT, PROVIDERS[CONFIG.CHAINNAME]);
        const vaultName = await vaultContract.name();
        const maxOut = await pairContract.callStatic.maxAmountOut();
        let amountIn
        if(maxOut.gt(0)){amountIn = await pairContract.callStatic.computeExactAmountIn(maxOut);
        console.log(vaultName, "amt in",amountIn.toString(),"max out",maxOut.toString())
}
        else{console.log(vaultName,"max out", maxOut.toString())}
    }
};

go();
