const { ABI } = require("../constants/abi");
const { ethers } = require("ethers");
const { PROVIDERS } = require("../../constants/providers");
const { ADDRESS } = require("../../constants/address");

const chains = Object.keys(ADDRESS); // Dynamically get the list of chains
const whiteLists = {
    OPTIMISM: [1, 2, 3, 4, 6, 7, 8, 9, 10, 11, 12, 13,14,15,16,17,18,19,20],
    BASESEPOLIA: [], // Add BASE whitelist here
    ARBITRUM: [1,2],    // Add more chain-specific whitelists as needed
    BASE: [2],
};
console.log("chains",chains)
async function GetTwabPromotions() {
    const chainResults = {};

    for (const chain of chains) {
        if (ADDRESS[chain] && ADDRESS[chain].TWABREWARDS) {
            console.log("chain",chain)
            const contract = new ethers.Contract(ADDRESS[chain].TWABREWARDS, ABI.TWABREWARDS, PROVIDERS[chain]);
            const promotionCreatedEvents = await contract.queryFilter(contract.filters.PromotionCreated());
            const promotionEndedEvents = await contract.queryFilter(contract.filters.PromotionEnded());

            // Extract unique token addresses
            const uniqueTokens = [...new Set(promotionCreatedEvents.map(event => event.args.token))];

            // Create contract instances for each token and fetch decimals
            const tokenContracts = uniqueTokens.map(tokenAddress =>
                new ethers.Contract(tokenAddress, ABI.ERC20, PROVIDERS[chain])
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
                    whitelist: (whiteLists[chain] || []).includes(event.args.promotionId.toNumber())
                };
            });

            // Process PromotionEnded events and update the promotions array
            promotionEndedEvents.forEach(event => {
                const promotionIndex = promotions.findIndex(promo => promo.promotionId === event.args.promotionId.toString());
                if (promotionIndex !== -1) {
                    if (ethers.BigNumber.isBigNumber(event.args.epochNumber)) {
                        const initialNumberOfEpochs = event.args.epochNumber.toNumber();
                        promotions[promotionIndex].initialNumberOfEpochs = Math.max(0, initialNumberOfEpochs);
                    } else {
                        promotions[promotionIndex].initialNumberOfEpochs = Math.max(0, event.args.epochNumber);
                    }
                }
            });

            // Remove promotions with initialNumberOfEpochs <= 0
            const filteredPromotions = promotions.filter(promo => promo.initialNumberOfEpochs > 0);

            chainResults[chain] = filteredPromotions;
        }
    }

    return chainResults;
}

module.exports = { GetTwabPromotions };

/*GetTwabPromotions().then(promotions => {
    console.log(promotions);
}).catch(error => {
    console.error(error);
});*/
