const SWAPPER = [{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approveToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_liquidationPair","type":"address"},{"internalType":"uint256","name":"_amountOut","type":"uint256"},{"internalType":"uint256","name":"_amountInMax","type":"uint256"},{"internalType":"address","name":"_vaultAddress","type":"address"},{"internalType":"bytes","name":"swapBackData","type":"bytes"}],"name":"lapThePool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_liquidationPair","type":"address"},{"internalType":"uint256","name":"_amountOut","type":"uint256"},{"internalType":"uint256","name":"_amountInMax","type":"uint256"},{"internalType":"bytes","name":"swapBackData","type":"bytes"}],"name":"outAndBack","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"withdrawERC20","outputs":[],"stateMutability":"nonpayable","type":"function"}]
module.exports = SWAPPER;
