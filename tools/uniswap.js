require('../env-setup');
const { ChainId, Fetcher, WETH, Route, Trade, TokenAmount, TradeType } = require ('@uniswap/v3-sdk');
const ethers = require('ethers');  

const url = 'https://opt-goerli.g.alchemy.com/v2/' + process.env.ALCHEMY_KEY
const customHttpProvider = new ethers.providers.JsonRpcProvider(url);
console.log(ChainId)
const chainId = 10;
const usdcAddress = '0x7F5c764cBc14f9669B88837ca1490cCa17c31607'

const init = async () => {
    const usdc = await Fetcher.fetchTokenData(chainId, usdcAddress, customHttpProvider);
    const weth = WETH[chainId];
    const pair = await Fetcher.fetchPairData(usdc, weth, customHttpProvider);
    const route = new Route([pair], weth);
    const trade = new Trade(route, new TokenAmount(weth, '100000000000000000'), TradeType.EXACT_INPUT);
    console.log("Mid Price WETH --> USDC:", route.midPrice.toSignificant(6));
    console.log("Mid Price USDC --> WETH:", route.midPrice.invert().toSignificant(6));
    console.log("-".repeat(45));
    console.log("Execution Price WETH --> USDC:", trade.executionPrice.toSignificant(6));
    console.log("Mid Price after trade WETH --> USDC:", trade.nextMidPrice.toSignificant(6));
}

init();
