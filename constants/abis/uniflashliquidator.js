const UNIFLASHLIQUIDATOR = [
  {
    "inputs": [
      {
        "internalType": "contract IERC20",
        "name": "_weth",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "NotWethPair",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_sender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amountOut",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "_flashSwapData",
        "type": "bytes"
      }
    ],
    "name": "flashSwapCallback",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract ILiquidationPair",
        "name": "_pair",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_receiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "_swapAmountOut",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_minProfit",
        "type": "uint256"
      }
    ],
    "name": "flashSwapExactAmountOut",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract IUniswapV2Pair",
        "name": "uniswapLp",
        "type": "address"
      }
    ],
    "name": "getLpAssets",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "token0",
        "type": "address"
      },
      {
        "internalType": "contract IERC20",
        "name": "token1",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "contract ILiquidationPair",
        "name": "_pair",
        "type": "address"
      }
    ],
    "name": "isValidLiquidationPair",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "weth",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
]


module.exports = UNIFLASHLIQUIDATOR;
