# Listening script processes
pm2 start listening.js --name "base-listen" -- base
pm2 start listening.js --name "optimism-listen" -- optimism
pm2 start listening.js --name "arb-listen" -- arbitrum
pm2 start listening.js --name "gnosis-listen" -- gnosis
pm2 start listening.js --name "scroll-listen" -- scroll
pm2 start listening.js --name "ethereum-listen" -- ethereum

# Liquidator script processes
pm2 start liquidator.js --name "base-liq8r" -- base
pm2 start liquidator.js --name "optimism-liq8r" -- optimism
pm2 start liquidator.js --name "arb-liq8r" -- arbitrum
pm2 start liquidator.js --name "gnosis-liq8r" -- gnosis
pm2 start liquidator.js --name "scroll-liq8r" -- scroll
pm2 start liquidator.js --name "ethereum-liq8r" -- ethereum

# Claimer script processes
pm2 start claimer.js --name "base-claim" -- base
pm2 start claimer.js --name "optimism-claim" -- optimism
pm2 start claimer.js --name "arb-claim" -- arbitrum
pm2 start claimer.js --name "gnosis-claim" -- gnosis
pm2 start claimer.js --name "scroll-claim" -- scroll
pm2 start claimer.js --name "ethereum-claim" -- ethereum

# RNG Auction script processes
pm2 start rngAuction.js --name "base-rng" -- base
pm2 start rngAuction.js --name "optimism-rng" -- optimism
pm2 start rngAuction.js --name "arb-rng" -- arbitrum
pm2 start rngAuction.js --name "gnosis-rng" -- gnosis
pm2 start rngAuction.js --name "scroll-rng" -- scroll
pm2 start rngAuction.js --name "ethereum-rng" -- ethereum
