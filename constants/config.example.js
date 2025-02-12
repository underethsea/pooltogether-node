require("../env-setup.js");
const CONFIG = {
  // General Constants
  CHAINNAME: "OPTIMISM", // Name of the blockchain network
  CHAINID: 10,
  WALLET: process.env.WALLET, // Signing wallet address

  USEEXPLORERPRICING: true,
  PRIORITYFEE: ".00105", // priority fee for sending transactions ".001" is .001 gwei
  // Prize Calculator Configuration
  BATCHSIZE: 100, // Number of wins to calculate per multicall
  useCoinGecko: true, // Use CoinGecko for pricing (false uses 1inch)
  // Timing Configuration for looping claimer and liquidator apps
  // retries will be a random time between min and max
  minTimeInMilliseconds: 180 * 1000, // Minimum polling interval (180* 1000 = 3 minutes)
  maxTimeInMilliseconds: 300 * 1000, // Maximum polling interval (300* 1000 = 5 minutes)

  // Claimer Configuration
  USEAPI: "pooltime", // "none" or "pooltime" or "g9"
  TIERSTOCLAIM: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  TXDELAY: 10000, // Delay between transactions in milliseconds
  MINPROFIT: 0.05, // Minimum acceptable profit in $ for a claim transaction
  MINPROFITPERCENTAGE: 1.001, // Minimum profit percentage for acceptance, 1.01 = 101%
  MAXWINNERS: 10, // Maximum number of winners to claim per transaction
  MAXINDICES: 15, // Maximum number of prize indices to claim per transaction
  //  USESANTA: false, // Use contract for claims with contract to sell claim fees back to WETH
  REWARDS_CLAIM_WAIT: 8, // hours to wait to check if rewards are claimable (reduces RPC pings)
  MINTOCLAIM: 0.005, // the claimer will collect rewards once the minimum is reached (.1 = .1 or more prize tokens)
  LAST_IN_LINE: [
    // these addresses are pushed to back of claim list (deprioritized)
  ],
  // Liquidator Configuration
  slippage: 0, // Slippage tolerance for transactions (basis points)
  profitThreshold: 0.10, // Profit threshold in $ for considering a transaction
  profitPercentage: 1.0001, // Required profit percentage over cost
  //  ONLYLIQUIDATE: ['0x7d72e1043FBaCF54aDc0610EA8649b23055462f0','0x006e714accBFEecD561a9B590e919402e871a91D'], // array of pairs to liquidate
  MIN_LIQUIDATE: 0.10, // min to liquidate
  ONLYLIQUIDATE: [],
  DONTLIQUIDATE: [], // array of pairs to exclude
SWAPPERS: {BASE:"0xf152cec8b04695705772012764d2abe2e5cbfd38",
OPTIMISM:"0xf152cec8b04695705772012764d2abe2e5cbfd38",
ARBITRUM:"0xf152CEC8B04695705772012764D2ABE2e5cbfd38",
//ETHEREUM:"0xf152CEC8B04695705772012764D2ABE2e5cbfd38"
},

  // WinBooster Configuration
  FEE: 4, // claimer fee (ex 5 = 5%)
  MAX_INDICES: 22, // max indices claim in one tx
  PERCENTAGE_CLAIM_COST: 80, // 80 = 80% maximum claim cost as % of prize value
  MIN_PERCENTAGE_CLAIM_COST: 8, // 12 = 12% min "  "
  MIN_TO_SEND_CLAIM: ".05", // minimum balance of user needed to attempt a claim
  MAX_GAS: 32,
  MAX_CLAIM_INDICES: 22, // max indices to claim in one tx
  RETRY: 4, // minutes to retry winbooster claims
  CLAIM_WINDOW_OPEN: 0,
  CLAIM_WINDOW_CLOSED: 24, // 14 is 2pm
  SECOND_CLAIM_WINDOW_OPEN: 22,
  SECOND_CLAIM_WINDOW_CLOSED: 24,
  BLACKLIST: [],

  // DrawAuction Config
  RNGRETRY: 80, // seconds to retry
};

Object.freeze(CONFIG);

// USE TO OVERRIDE DEFAULT CONFIG
const CHAIN_CONFIG = {
BASE: { 
 minTimeInMilliseconds: 60 * 1000, // Minimum polling interval (60 * 1000 = 1 minutes)
 maxTimeInMilliseconds: 120 * 1000, // Maximum polling interval (120 * 1000 = 2 minutes)
 MIN_LIQUIDATE: 0.05,
 profitThreshold: 0.10, // Profit threshold in $ for considering a transaction
 profitPercentage: 0.0002, // Required profit percentage over cost
 },
},
}

// Dynamic configuration function
function Config(chainName) {
  const chainKey = (chainName || CONFIG.CHAINNAME).toUpperCase();
  const chainOverrides = CHAIN_CONFIG[chainKey] || {};
  return { ...CONFIG, ...chainOverrides };
}

module.exports = { Config,CONFIG };

// Additional network and wallet configurations
// MUMBAI Testnet CHAINID: 80001
// SEPOLIA Testnet CHAINID: 11155111
// OP SEPOLIA Testnet CHAINID: 11155420
