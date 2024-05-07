require("../env-setup.js")
const CONFIG = {
  // General Constants
  CHAINNAME: "OPTIMISM", // Name of the blockchain network
  CHAINID: 10,
  WALLET: process.env.WALLET, // Signing wallet address

  PRIORITYFEE: ".001", // priority fee for sending transactions ".001" is .001 gwei
  // Prize Calculator Configuration
  BATCHSIZE: 100, // Number of wins to calculate per multicall
  useCoinGecko: true, // Use CoinGecko for pricing (false uses 1inch)

  // Timing Configuration for looping claimer and liquidator apps
  // retries will be a random time between min and max
  minTimeInMilliseconds: 08 * 60 * 1000, // Minimum polling interval (5 * 60 = 5 minutes)
  maxTimeInMilliseconds: 15 * 60 * 1000, // Maximum polling interval (12 * 60 = 12 minutes)

  // Claimer Configuration
  USEAPI: "pooltime", // "none" or "pooltime" or "g9"
  TIERSTOCLAIM: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  TXDELAY: 10000, // Delay between transactions in milliseconds
  MINPROFIT: .01, // Minimum acceptable profit in $ for a claim transaction
  MINPROFITPERCENTAGE: 1.001, // Minimum profit percentage for acceptance, 1.01 = 101%
  MAXWINNERS: 14, // Maximum number of winners to claim per transaction
  MAXINDICES: 16, // Maximum number of prize indices to claim per transaction
//  GASCOSTFACTOR: 1.2, // Multiplier for estimated gas cost calculation
//  USESANTA: false, // Use contract for claims with contract to sell claim fees back to WETH
  MINTOCLAIM: .005, // the claimer will collect rewards once the minimum is reached (.1 = .1 or more prize tokens)
  LAST_IN_LINE: [ // these addresses are pushed to back of claim list (deprioritized)
],
  // Liquidator Configuration
  slippage: 5, // Slippage tolerance for transactions (basis points)
  maxGas: 600000, // Estimated gas amount per transaction
  profitThreshold: .001, // Profit threshold in $ for considering a transaction
  profitPercentage: 1.0001, // Required profit percentage over cost
//  ONLYLIQUIDATE: ['0x7d72e1043FBaCF54aDc0610EA8649b23055462f0','0x006e714accBFEecD561a9B590e919402e871a91D'], // array of pairs to liquidate
  ONLYLIQUIDATE: [],
  DONTLIQUIDATE: [], // array of pairs to exclude
  USESWAPPER: false, // use contract for swapping prize asset back to prize token

  // WinBooster Configuration
  FEE: 4, // claimer fee (ex 5 = 5%)   
  MAX_INDICES: 22, // max indices claim in one tx
  PERCENTAGE_CLAIM_COST: 80, // 80 = 80% maximum claim cost as % of prize value
  MIN_PERCENTAGE_CLAIM_COST: 8, // 12 = 12% min "  "  
  MIN_TO_SEND_CLAIM : ".05" , // minimum balance of user needed to attempt a claim
  MAX_GAS: 32,
  MAX_CLAIM_INDICES: 22, // max indices to claim in one tx
  RETRY: 4, // minutes to retry winbooster claims
  CLAIM_WINDOW_OPEN: 0, 
  CLAIM_WINDOW_CLOSED: 24, // 14 is 2pm
  SECOND_CLAIM_WINDOW_OPEN: 22,
  SECOND_CLAIM_WINDOW_CLOSED: 24,
  BLACKLIST: [],

  // DrawAuction Config
  RNGRETRY: 80,// seconds to retry
};
Object.freeze(CONFIG)

module.exports = { CONFIG };

// Additional network and wallet configurations
// MUMBAI Testnet CHAINID: 80001
// SEPOLIA Testnet CHAINID: 11155111
// OP SEPOLIA Testnet CHAINID: 11155420
