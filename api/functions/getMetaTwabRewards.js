const { ABI } = require("../../constants/abi");
const { ethers } = require("ethers");
const { PROVIDERS } = require("../../constants/providers");
const { ADDRESS } = require("../../constants/address");

const chains = Object.keys(ADDRESS); // Get the list of chains dynamically

const whiteLists = {
    OPTIMISM: [],
    BASESEPOLIA: [],
    ARBITRUM: [],
    BASE: [],
    ETHEREUM: [],
};

async function GetMetaTwabRewards() {
    const chainResults = {};

    console.log("Starting Meta TWAB Rewards Fetch...");
    console.log("Chains detected:", chains);

    for (const chain of chains) {
        if (!ADDRESS[chain] || !ADDRESS[chain].METAREWARDS) {
            console.warn(`Skipping chain ${chain}: METAREWARDS address not defined.`);
            continue;
        }

        console.log(`Fetching promotions for chain: ${chain}`);
        try {
            const contract = new ethers.Contract(
                ADDRESS[chain].METAREWARDS,
                ABI.METAREWARDS,
                PROVIDERS[chain]
            );

            // Get the latest promotion ID
            let latestPromotionId;
            try {
                latestPromotionId = await contract.latestPromotionId();
                console.log(`Latest promotion ID for ${chain}: ${latestPromotionId.toString()}`);
            } catch (error) {
                console.error(`Error getting latest promotion ID for ${chain}:`, error);
                continue;
            }

            const filteredPromotions = [];

            // Loop through each promotion ID from 1 to latestPromotionId
            for (let promotionId = 1; promotionId <= latestPromotionId; promotionId++) {
                try {
                    // Fetch the promotion details
                    const promotion = await contract.getPromotion(promotionId);
console.log(promotion)
                    // Destructure the promotion struct
                    const {
                        token,
                        epochDuration,
                        createdAt,
                        numberOfEpochs,
                        startTimestamp,
                        tokensPerEpoch,
                        rewardsUnclaimed,
                    } = promotion;
const initialNumberOfEpochs=numberOfEpochs
console.log("epochs",initialNumberOfEpochs)
                    // Explicitly check remaining rewards using the correct method
                    let remainingRewards;
                    try {
                        remainingRewards = await contract.getRemainingRewards(promotionId);
                    } catch (err) {
                        console.error(`Error checking remaining rewards for promotion ${promotionId} on ${chain}:`, err);
                        continue;
                    }

                    // Ensure the remaining rewards are greater than zero
                    if (remainingRewards && remainingRewards.gt(0)) {
                        console.log(
                            `Promotion ${promotionId} on ${chain} has remaining rewards: ${remainingRewards.toString()}`
                        );

                        // Fetch token decimals
                        let tokenDecimals = 18; // Default to 18 decimals
                        try {
                            const tokenContract = new ethers.Contract(token, ABI.ERC20, PROVIDERS[chain]);
                            tokenDecimals = await tokenContract.decimals();
                        } catch (decError) {
                            console.warn(`Error fetching decimals for token ${token} on ${chain}:`, decError);
                        }

                        // Add the promotion to the results
                        filteredPromotions.push({
                            promotionId: promotionId.toString(),
                            token,
                            tokenDecimals,
                            epochDuration: epochDuration.toString(),
                            createdAt: createdAt.toString(),
                            initialNumberOfEpochs: numberOfEpochs.toString(),
                            startTimestamp: startTimestamp.toString(),
                            tokensPerEpoch: tokensPerEpoch.toString(),
                            rewardsUnclaimed: rewardsUnclaimed.toString(),
                            remainingRewards: remainingRewards.toString(),
                            //whitelist: (whiteLists[chain] || []).includes(promotionId),
                       whitelist: true,
				 });
                    } else {
                        console.log(
                            `Promotion ${promotionId} on ${chain} has no remaining rewards. Skipping.`
                        );
                    }
                } catch (err) {
                    console.error(`Error fetching promotion ${promotionId} on ${chain}:`, err);
                }
            }

            chainResults[chain] = filteredPromotions;
        } catch (error) {
            console.error(`Error fetching data for chain ${chain}:`, error);
            chainResults[chain] = { error: `Failed to fetch data for ${chain}` };
        }
    }

    console.log("Final Meta TWAB Rewards Data:");
    console.log(JSON.stringify(chainResults, null, 2));

    return chainResults;
}

module.exports = { GetMetaTwabRewards };

// Run the function and print results
/*GetMetaTwabRewards()
    .then((results) => {
        console.log("Successfully fetched Meta TWAB Rewards:");
        console.log(JSON.stringify(results, null, 2));
    })
    .catch((error) => {
        console.error("Error occurred during Meta TWAB Rewards Fetch:", error);
    });

*/
