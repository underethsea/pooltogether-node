# pooltogether-node

This repo includes prize calculations and database population for a postgres DB.

Also included are bots for liquidating yield from PoolTogether vaults, claiming prizes from the prize pool, completing the RNG auctions.

Theres some other tools scripts and ideas laying around too!

warning: These bots execute financial transactions and can result in a loss. Use at your own risk. To minimize risk you can keep a lower amount of funds on the wallet being used to send transactions. 

# Getting started

You will need
-Node JS > v18 https://nodejs.org/en/download
-Yarn https://classic.yarnpkg.com/lang/en/docs/install/
-Free Alchemy RPC key https://www.alchemy.com/

`git clone` this repo, or download

`yarn` to install dependencies

`cp .env.example .env` to copy environment variable setup

`cp constants/config.example.js constants/config.js` all of the configurations can be specified and changed here 

put key for ALCHEMY in .env

to create a wallet use `node tools/newWallet`

add wallet address and private key to .env

you will need ETH gas on your new wallet. Alchemy has free faucets for testnets

you will need the prize token to liquidate yield. for testnets you can use the faucet and drip to your wallet specified in .env.  do so by running `node tools/dripTestnet <chain>`

`<chain>` is the chain name defined in constants/address or the id in ./chains
 
you will need to approve of the prize token spend by the liquidation router, this can be done by running `node tools/approveLiquidationRouter <chain>`

new prize network deployments/chains can be added in constants/address.js

## `node claimer <chain>`

- Recent claim events are checked to avoid duplicate claims
- Tier timestamps are used to fetch the Poolers for each tier using the TWAB subgraph
- The script uses multicall to check if Poolers won (or API) and if they have not already claimed
- Checks for profitability of claim
- Sends claims if conditions are met
- Logs claims which can be read back with claimerResults.js

## `node liquidator <chain>`

- Iterrates through the vaults on the configured chain to search for profitable swaps
- If conditions are met sends the swap
- Logs liquidations which can be read back with liquidatorResults.js (has bug)

## `node rngAuction <chain>`
- runs the bot to complete the RNG auction by sending ETH for a random number
- also finishes awarding the auction

## `node listening <chain>`
- note this is setup to use Infura websocket providers if included in providers.js
- listens for complete draw and claim events to trigger prize calcs and update prize database with draws and claims
- requires additional setup

## swapper
Use your own contract to make no loss liquidations that redeem the liquidated asset back to the prize token

- deploy a swapper contract ex: https://optimistic.etherscan.io/address/0xfd9ec0d04062356e086f5df9ea681a77a8a6f725
- call the approve function on the swapper to approve the routers to spend the various prize assets
- send prize tokens to the swapper contract to be used for swapping
- update your contract addresses for `SWAPPERS` in config.js

## this is an evolving set of scripts. your feedback is appreciated!

# pooltogether-node
