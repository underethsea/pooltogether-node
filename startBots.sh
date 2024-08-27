#!/bin/bash

# Start processes for the base chain
pm2 start listening.js --name "base-listen" -- base
pm2 start liquidator.js --name "base-liq8r" -- base
pm2 start claimer.js --name "base-claim" -- base
pm2 start rngAuction.js --name "base-rng" -- base

# Start processes for the optimism chain
pm2 start listening.js --name "optimism-listen" -- optimism
pm2 start liquidator.js --name "optimism-liq8r" -- optimism
pm2 start claimer.js --name "optimism-claim" -- optimism
pm2 start rngAuction.js --name "optimism-rng" -- optimism

# Start processes for the arbitrum chain
pm2 start listening.js --name "arb-listen" -- arbitrum
pm2 start liquidator.js --name "arb-liq8r" -- arbitrum
pm2 start claimer.js --name "arb-claim" -- arbitrum
pm2 start rngAuction.js --name "arb-rng" -- arbitrum

# Save the current process list
pm2 save

echo "All processes have been started and saved in PM2."
