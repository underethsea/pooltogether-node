const { ABI } = require("../constants/abi");
const { ethers } = require("ethers");
const { PROVIDERS } = require("../constants/providers");
const ADDRESS = "0x90D383dEA4dcE52D3e5D3C93dE75eF36da3Ea9Ea"
const whiteList = [1, 2, 3, 4];

async function GetTwabPromotions() {
    const contract = new ethers.Contract(ADDRESS, ABI.TWABREWARDS, PROVIDERS["OPTIMISM"]);
    const promotionCreatedEvents = await contract.queryFilter(contract.filters.PromotionCreated());
    const promotionEndedEvents = await contract.queryFilter(contract.filters.PromotionEnded());

    // Extract unique token addresses
    const uniqueTokens = [...new Set(promotionCreatedEvents.map(event => event.args.token))];

    // Create contract instances for each token and fetch decimals
    const tokenContracts = uniqueTokens.map(tokenAddress =>
        new ethers.Contract(tokenAddress, ABI.ERC20, PROVIDERS["OPTIMISM"])
    );
    const decimalsPromises = tokenContracts.map(contract => contract.decimals());
    const decimals = await Promise.all(decimalsPromises);

    // Map decimals to tokens
    const tokenDecimalsMap = Object.fromEntries(uniqueTokens.map((token, index) => [token, decimals[index]]));

    // Process PromotionCreated events
    const promotions = promotionCreatedEvents.map(event => {
        return {
            promotionId: event.args.promotionId.toString(),
            vault: event.args.vault,
            token: event.args.token,
            tokenDecimals: tokenDecimalsMap[event.args.token],
            startTimestamp: event.args.startTimestamp.toString(),
            tokensPerEpoch: event.args.tokensPerEpoch.toString(),
            epochDuration: event.args.epochDuration.toString(),
            initialNumberOfEpochs: event.args.initialNumberOfEpochs,
            whitelist: whiteList.includes(event.args.promotionId.toNumber())
        };
    });

// ...

// Process PromotionEnded events and update the promotions array
promotionEndedEvents.forEach(event => {
    const promotionIndex = promotions.findIndex(promo => promo.promotionId === event.args.promotionId.toString());
    if (promotionIndex !== -1) {
        // Check if event.args.epochNumber is a BigNumber
        if (ethers.BigNumber.isBigNumber(event.args.epochNumber)) {
            // Adjust the initialNumberOfEpochs based on the epochNumber of the PromotionEnded event
            const initialNumberOfEpochs = event.args.epochNumber.toNumber()
            promotions[promotionIndex].initialNumberOfEpochs = Math.max(0, initialNumberOfEpochs);
        } else {
            // Handle the case when epochNumber is not a BigNumber (e.g., it's already a number)
            promotions[promotionIndex].initialNumberOfEpochs = Math.max(0, event.args.epochNumber);
        }
    }
});

// ...
    // Remove promotions with initialNumberOfEpochs <= 0
    const filteredPromotions = promotions.filter(promo => promo.initialNumberOfEpochs > 0);

    return { OPTIMISM: filteredPromotions };
}

module.exports = { GetTwabPromotions };


/*GetTwabPromotions().then(promotions => {
    console.log(promotions);
}).catch(error => {
    console.error(error);
});*/
