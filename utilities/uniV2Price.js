const { ethers } = require('ethers');
const { PROVIDERS } = require('../constants/providers');
const { Multicall } = require('./multicall');

const {getChainConfig } = require('../chains');

const CHAINNAME = getChainConfig().CHAINNAME;

// Uniswap V2 Pair ABI including totalSupply
const uniswapV2PairAbi = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
  'function totalSupply() external view returns (uint)'
];

async function uniV2LPPriceInWeth(lpAddress, wethAddress) {
  const pairContract = new ethers.Contract(lpAddress, uniswapV2PairAbi, PROVIDERS[CHAINNAME]);

  try {
    const [[reserve0, reserve1], token0Address, token1Address, totalSupply] = await Multicall([
      pairContract.getReserves(),
      pairContract.token0(),
      pairContract.token1(),
      pairContract.totalSupply()
    ]);

    let wethReserve;

    if (token0Address.toLowerCase() === wethAddress.toLowerCase()) {
      wethReserve = reserve0; // BigNumber
    } else if (token1Address.toLowerCase() === wethAddress.toLowerCase()) {
      wethReserve = reserve1; // BigNumber
    } else {
      return 'No WETH in this pair';
    }

    // Increase precision by multiplying wethReserve by a large factor before division
    const totalValueInWETH = wethReserve.mul(ethers.BigNumber.from('2')); // Calculating total value
    const pricePerLPTokenInWETH = totalValueInWETH.mul(ethers.BigNumber.from('1000000000000000000')).div(totalSupply); // Scale up to maintain precision

    return pricePerLPTokenInWETH;
  } catch (error) {
    console.error('Failed to get reserves or total supply:', error);
  }
}

//example
/*
const lpAddress = '0xDB1FE6DA83698885104DA02A6e0b3b65c0B0dE80';
const wethAddress = '0x4200000000000000000000000000000000000006';

uniV2LPPriceInWeth(lpAddress, wethAddress).then(price => {
  console.log('Price per LP token in WETH:', ethers.utils.formatUnits(price, 18));
}).catch(err => console.error(err));
*/

module.exports = { uniV2LPPriceInWeth }
