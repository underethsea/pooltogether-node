install with `yarn`
`cp .env.example .env` and fill with your keys
this repo requires a postgres db that is created by pooltogether-v5-node
run with `node api.js` or `go.sh` to use authbind

`/<chainId>-<prize pool address>-prizeresults`  
Prize awarded and claimed by draw

- `draw`: The draw number.
- `tiers`: An object where each key represents a tier, and its value is an object containing:
  - `value`: The value of one prize in this tier.
  - `totalWins`: The total number of wins awarded in this tier.
  - `totalClaims`: The total number of claims made in this tier.

`/<chainId>-<prize pool address>-bigwins`  
Array of biggest winners

- `p`: Pooler address.
- `v`: Prize value as full decimal string.
- `d`: Draw number.

`/<chainId>-<prize pool address>-vaults`  
Array of vaults that have one depositor and are connected to the prize pool

- `vault`: Vault address.
- `poolers`: Number of poolers in the vault.
- `name`: Vault name.
- `symbol`: Vault token Symbol.
- `decimals`: Vault token decimals.
- `liquidationPair`: Liquidation pair address.
- `asset`: Deposit asset address.
- `assetSymbol`: Deposit asset symbol.
- `owner`: Vault owner address.
- `gnosis`:
  - `required`: Total confirmation required.
  - `total`: Total signers on multisig.
- `price`: Token price.
- `contributed7d`: Amount of prize token contributed by vault to prize pool in 7 days.
- `contributed24h`: Amount of prize token contributed by vault to prize pool in 24 hours.
- `won7d`: Amount of prize won by vault in 7 days.


`/<chainId>-<prize pool address>-poolers`  
Returns an array of vaults with their respective number of poolers connected to the specified prize pool.

- `vault`: The address of the vault.
- `poolers`: The number of poolers in the vault.

`/<chainId>-<prize pool address>-history`  
Returns a historical overview of prize draws, including information on the number of wins, total payout, fees, tiers won, and unique winners for each draw associated with the specified prize pool.

- `draw`: The draw number.
- `wins`: The total number of wins in the draw.
- `totalPayout`: The total payout amount as a full decimal string.
- `totalFee`: The total fees collected as a full decimal string.
- `tiersWon`: An array indicating which tiers had winners.
- `uniqueWinners`: The number of unique winners in the draw.

`/player-claims?address=<player_address>&claims=true` (CLAIMS)

Returns a list of claim events for the specified player address, detailing each claim made across various draws and vaults.

- `network`: The network identifier where the draw occurred.
- `hash`: The transaction hash of the claim.
- `draw`: The number associated with the draw.
- `vault`: The address of the vault where the draw took place.
- `tier`: The prize tier of the claim.
- `index`: The index of the win within the draw.
- `payout`: The payout amount as a full decimal string.

`/player-wins?address=<player_address>&wins=true` (WINS)
Returns a list of win events for the specified player address, detailing each win across various draws and vaults.

- `network`: The network identifier where the win occurred.
- `draw`: The draw number associated with the win.
- `vault`: The address of the vault related to the win.
- `tier`: The prize tier of the win.
- `prizeindices`: An array of indices representing the specific prizes won within the tier.

`/twabrewards`  
Retrieves Time-Weighted Average Balance (TWAB) rewards information for all chains.

- `promotionId`: The identifier of the promotion.
- `vault`: The address of the vault associated with the promotion.
- `token`: The address of the reward token.
- `tokenDecimals`: The number of decimals for the reward token.
- `startTimestamp`: The start time of the promotion, in Unix timestamp format.
- `tokensPerEpoch`: The amount of tokens distributed per epoch.
- `epochDuration`: The duration of each epoch in seconds.
- `initialNumberOfEpochs`: The initial number of epochs for the promotion.
- `whitelist`: Indicates whether the promotion is restricted to a whitelist of addresses (boolean).

`/<chainId>-<prizePoolAddress>-overview`  
Provides an overview of a specific prize pool, including the total number of poolers, pool price, and detailed prize data.

- `poolers`: The total number of participants in the pool.
- `poolPrice`: The current price of the pool's token.
- `prizeData`: An object containing detailed information about the prize distribution, including:
  - `drawPeriodSeconds`: The duration of each draw period in seconds.
  - `nextDrawId`: The identifier for the next draw.
  - `numberOfTiers`: The total number of prize tiers.
  - `prizePoolPOOLBalance`: The total balance of the prize pool token.
  - `tierData`: An array of objects for each tier, each including:
    - `tier`: The tier number.
    - `value`: The value of the prize for this tier.
    - `count`: The number of prizes available in this tier.
    - `liquidity`: The liquidity provided by this tier's prizes.
