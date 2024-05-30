const { CHAINS } = require("../chains");

const GetChainName = (chainId) => {
  // Find the chain entry whose id matches the provided chainId
  for (const key in CHAINS) {
    if (CHAINS[key].id === chainId) {
      return key;
    }
  }
  // Optional: return a default value or undefined if not found
  return undefined; // or return a default chain name, e.g., "Unknown"
};

const ADDRESS = {
ARBITRUM: {

PRIZEPOOLSUBGRAPH: "https://api.studio.thegraph.com/query/63100/pt-v5-arbitrum/version/latest",
  DRAWMANAGER: '0xc00146957ff55fad7d27deb69ff95d79fdcd37e6',
  RNG: '0xad1b8ec0151f13ba563226092b5f7308d8dc107b',
 PRIZETOKEN: {
      ADDRESS: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      SYMBOL: "WETH",
      NAME: "WETH",
      DECIMALS: 18,
      GECKO: "weth",
    },
  TWABCONTROLLER: '0x971ecc4e75c5fcfd8fc3eadc8f0c900b5914dc75',
  TWABREWARDS: '0xe21ac38a7e80104c4f6512ce4908a22bc09c59be',
  LIQUIDATIONROUTER: '0x7b4a60964994422bf19ae48a90fbff806767db73',
  VAULTFACTORY: '0x44be003e55e7ce8a2e0ecc3266f8a9a9de2c07bc',
  PRIZEPOOL: '0x52e7910c4c287848c8828e8b17b8371f4ebc5d42',
  CLAIMERFACTORY: '0xc4824b6b0bb0559d919a606f258ee68a890757da',
  CLAIMER: '0x1e68e5e92d22aefdc791a61c874c06831023e571',
VAULTS: [
 {
    VAULT: '0x3c72a2a78c29d1f6454caa1bcb17a7792a180a2e',
    LIQUIDATIONPAIR: '0xf682c61Ef4a718491C446b259e1723eCa0Cc371C',
    SYMBOL: 'przUSDC',
    NAME: 'Prize USDC - Aave',
    DECIMALS: 6,
    ASSET: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    ASSETSYMBOL: 'USDC',
    ICON: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1547042389',
    GECKO: 'usd-coin',
    VAULTICON: 'https://app.cabana.fi/icons/pUSDC.e.svg'
  },
  {
    VAULT: '0xCACBa8Be4bc225FB8d15a9A3b702f84ca3EBa991',
    LIQUIDATIONPAIR: '0x46a3f4BA04aBE1c8fe9A86fE9f247f599A953558',
    SYMBOL: 'przUSDT',
    NAME: 'Prize USDT - Aave',
    DECIMALS: 6,
    ASSET: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    ASSETSYMBOL: 'USDT',
    ICON: '',
    GECKO: 'tether',
    VAULTICON: ''
  },
  {
    VAULT: '0x7b0949204e7da1b0bed6d4ccb68497f51621b574',
    LIQUIDATIONPAIR: '0x8F6C7737036A9743C8A569CADa41e4E8ED86AA6A',
    SYMBOL: 'przWETH',
    NAME: 'Prize WETH - Aave',
    DECIMALS: 18,
    ASSET: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    ASSETSYMBOL: 'WETH',
    ICON: 'https://uploads-ssl.webflow.com/631993187031511c025c721d/633c1ccea93ff4709ab091c2_633be870ec7f86530e8e5419_WETH.png',
    GECKO: 'ethereum',
    VAULTICON: 'https://app.cabana.fi/icons/pWETH.svg'
  }

],
BOOSTS : [
  {
    LIQUIDATIONPAIR: "0x6A6Cfef8D19C6bC99115Bf66A1879D8cf4eCc95f",
    SYMBOL:"wethBooster",
    NAME: "booster",
    DECIMALS: 18,
    ASSET: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    ASSETSYMBOL: "WETH",
    GECKO: "ethereum"
  },
{
    LIQUIDATIONPAIR: "0xf94BA45DDdFB1352B580A6a122E2ABA48B8D1107",
    SYMBOL:"wethBooster",
    NAME: "booster",
    DECIMALS: 18,
    ASSET: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    ASSETSYMBOL: "WETH",
    GECKO: "ethereum"
  },
{
    LIQUIDATIONPAIR: "0x646EE92a46DA3b9fe89492212c9A0eeb6Bb6a203",
    SYMBOL:"wethBooster",
    NAME: "booster",
    DECIMALS: 18,
    ASSET: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    ASSETSYMBOL: "WETH",
    GECKO: "ethereum"
  },

],
PAIRS: [{
        VAULT: "0x3c72a2a78c29d1f6454caa1bcb17a7792a180a2e",
        LIQUIDATIONPAIR: "0x3Ff4944F934300EBEc0e22474f3BD47D05874dB9",
        SYMBOL: "AaveUSDCARBReward",
        NAME: "Aave USDC ARB Rewards",
        DECIMALS: 18,
        ASSET: "0x912CE59144191C1204E64559FE8253a0e49E6548",
        ASSETSYMBOL: "ARB",
        GECKO: "arbitrum",
        NOVAULT: true,
      },]
}
,

  BASE: {
    PRIZEPOOLSUBGRAPH: "https://api.studio.thegraph.com/query/41211/pt-v5-base/version/latest",
    GASORACLE: "0x420000000000000000000000000000000000000F",
    SWAPPER: "0x0A52822Bf48c1FAfe1A89d2a41C74419FDC8864c",
    PRIZETOKEN: {
      ADDRESS: "0x4200000000000000000000000000000000000006",
      SYMBOL: "WETH",
      NAME: "WETH",
      DECIMALS: 18,
      GECKO: "weth",
    },
    DRAWMANAGER: '0x8a2782bedc79982ebfa3b68b315a2ee40daf6ab0',
    RNG: '0x74ebf391831c0757b5a4335f2f3abbb1499d18f0',
    TWABCONTROLLER: '0x7e63601f7e28c758feccf8cdf02f6598694f44c6',
    TWABREWARDS: '0x86f0923d20810441efc593eb0f2825c6bff2dc09',
    LIQUIDATIONROUTER: '0xa9c937a0d1d22ad79099aea10efa62a270dfc22c',
    VAULTFACTORY: '0xe32f6344875494ca3643198d87524519dc396ddf',
    PRIZEPOOL: '0x45b2010d8a4f08b53c9fa7544c51dfd9733732cb',
    CLAIMERFACTORY: '0xd58a04fc8d34ce6b3633bf81ee7d5d25c71401e3',
    CLAIMER: '0x5ffeee76d1e2d2d1d18ba0bc77d8d047b85e1e87',
    VAULTS: [

  {
    VAULT: '0x6B5a5c55E9dD4bb502Ce25bBfbaA49b69cf7E4dd',
    LIQUIDATIONPAIR: '0x0000000000000000000000000000000000000000',
    SYMBOL: 'przPOOL',
    NAME: 'Prize POOL',
    DECIMALS: 18,
    ASSET: '0xd652C5425aea2Afd5fb142e120FeCf79e18fafc3',
    ASSETSYMBOL: 'POOL',
    ICON: 'https://assets.coingecko.com/coins/images/14003/standard/PoolTogether.png?1696513732',
    GECKO: 'pooltogether',
    VAULTICON: ''
  },
  {
    VAULT: '0x7f5C2b379b88499aC2B997Db583f8079503f25b9',
    LIQUIDATIONPAIR: '0xEBa6Aa26ea2C51874a467cc310181617B3a4A266',
    SYMBOL: 'przUSDC',
    NAME: 'Prize USDC - Moonwell',
    DECIMALS: 6,
    ASSET: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    ASSETSYMBOL: 'USDC',
    ICON: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1547042389',
    GECKO: 'usd-coin',
    VAULTICON: 'https://app.cabana.fi/icons/pUSDC.e.svg'
  },
  {
    VAULT: '0x8d1322CaBe5Ef2949f6bf4941Cc7765187C1091A',
    LIQUIDATIONPAIR: '0xa0297868d4e7c886BdeB8C258767c0a6fC80dc6d',
    SYMBOL: 'przAERO',
    NAME: 'Prize AERO - Moonwell',
    DECIMALS: 18,
    ASSET: '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    ASSETSYMBOL: 'AERO',
    ICON: '',
    GECKO: 'aerodrome-finance',
    VAULTICON: ''
  },
  {
    VAULT: '0x5b623C127254C6fec04b492ecDF4b11c45FBB9D5',
    LIQUIDATIONPAIR: '0xeBD0A1161e833c090F88D57159c91eEC371E7e67',
    SYMBOL: 'przCBETH',
    NAME: 'Prize cbETH - Moonwell',
    DECIMALS: 18,
    ASSET: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    ASSETSYMBOL: 'cbETH',
    ICON: '',
    GECKO: 'coinbase-wrapped-staked-eth',
    VAULTICON: ''
  },
  {
    VAULT: '0x75D700F4C21528A2bb603b6Ed899ACFdE5c4B086',
    LIQUIDATIONPAIR: '0xF94F69EeDDDF0A088f0A16D9aC569C1729F6444F',
    SYMBOL: 'przWSTETH',
    NAME: 'Prize wstETH - Moonwell',
    DECIMALS: 18,
    ASSET: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
    ASSETSYMBOL: 'wstETH',
    ICON: '',
    GECKO: 'wrapped-steth',
    VAULTICON: ''
  }
	
    ],
BOOSTS : [
  {
    LIQUIDATIONPAIR: "0xAb4470Ef16f94da262B40A49360e8fC1AdCb6c1a",
    SYMBOL:"wethBooster",
    NAME: "booster",
    DECIMALS: 18,
    ASSET: "0x4200000000000000000000000000000000000006",
    ASSETSYMBOL: "WETH",
    GECKO: "ethereum"
  },
  {
    LIQUIDATIONPAIR: "0xC5e1f487c71fc6BadA3D9Ab44d57B417aF65710A",
    SYMBOL:"wethBooster",    
    NAME: "booster",
    DECIMALS: 18,
    ASSET: "0x4200000000000000000000000000000000000006",
    ASSETSYMBOL: "WETH",
    GECKO: "ethereum"
  },
  {
    LIQUIDATIONPAIR: "0xeC885af409f5Fe10264E9531257bde773c5596a5",
    SYMBOL:"wethBooster",
    NAME: "booster",
    DECIMALS: 18,
    ASSET: "0x4200000000000000000000000000000000000006",
    ASSETSYMBOL: "WETH",
    GECKO: "ethereum"
  },
  {
    LIQUIDATIONPAIR: "0x46909bA075129459E5060ddCaA42D7140E4808eF",
    SYMBOL:"wethBooster",
    NAME: "booster",
    DECIMALS: 18,
    ASSET: "0x4200000000000000000000000000000000000006",
    ASSETSYMBOL: "WETH",
    GECKO: "ethereum"
  }
],

PAIRS: [
 {
        VAULT: "0xFc266fE91b15B2c9FdA967552fEb8DDF69F06968",
        LIQUIDATIONPAIR: "0x906b6829cc14d74a4686af3900099f55771518a0",
        SYMBOL: "WELLCbethRwd",
        NAME: "MoonWell CBETH Reweard",
        DECIMALS: 18,
        ASSET: "0xA88594D404727625A9437C3f886C7643872296AE",
        ASSETSYMBOL: "WELL",
        GECKO: "moonwell-artemis",
        NOVAULT: true,
      },
 {
        VAULT: "0x7f5C2b379b88499aC2B997Db583f8079503f25b9",
        LIQUIDATIONPAIR: "0xbbFdf66eBFa713f6d9ade5f0cAa5C91cfdA8d56a",
        SYMBOL: "WELLUSDCRwd",
        NAME: "MoonWell USDC Reweard",
        DECIMALS: 6,
        ASSET: "0xA88594D404727625A9437C3f886C7643872296AE",
        ASSETSYMBOL: "WELL",
        GECKO: "moonwell-artemis",
        NOVAULT: true,
      },
{
        VAULT: "0x8d1322CaBe5Ef2949f6bf4941Cc7765187C1091A",
        LIQUIDATIONPAIR: "0xd7b8470CCEe4d2Cb56f2Ba354736aCA3AAe363a9",
        SYMBOL: "WELLAeroRWD",
        NAME: "MoonWell Aero Reweard",
        DECIMALS: 18,
        ASSET: "0xA88594D404727625A9437C3f886C7643872296AE",
        ASSETSYMBOL: "WELL",
        GECKO: "moonwell-artemis",
        NOVAULT: true,
      },
 {
        VAULT: "0x7f5C2b379b88499aC2B997Db583f8079503f25b9",
        LIQUIDATIONPAIR: "0xbbfdf66ebfa713f6d9ade5f0caa5c91cfda8d56a",
        SYMBOL: "WELLUSDCUSDRWD",
        NAME: "Moonwell Usdc Usdc RWD",
        DECIMALS: 18,
        ASSET: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        ASSETSYMBOL: "USDC",
        GECKO: "usd-coin",
        NOVAULT: true,
      },
      {
        VAULT: "0x75D700F4C21528A2bb603b6Ed899ACFdE5c4B086",
        LIQUIDATIONPAIR: "0x8b79cA469DE63ACBCbAf747F61E8EE71fa4Cc1eD",
        SYMBOL: "WELLwstETH",
        NAME: "MoonWell wstETH",
        DECIMALS: 18,
        ASSET: "0xA88594D404727625A9437C3f886C7643872296AE",
        ASSETSYMBOL: "WELL",
        GECKO: "moonwell-artemis",
        NOVAULT: true,
      },
/*
{
        VAULT: "0x850ec48d2605aad9c3de345a6a357a9a14b8cf1b",
        LIQUIDATIONPAIR: "0x0000000000000000000000000000000000000000",
        SYMBOL: "przPOOLLUSD",
        NAME: "Prize POOL/LUSD Beefy",
        DECIMALS: "18",
        ASSET: "0x0b15b1d434f86eCaa83d14398C8Db6d162F3921e",
        ASSETSYMBOL: "vAMM-LUSD/POOL",
        GECKO: "",
        UNIV2: true,
        PAIRBASETOKEN: "", // the token thats the base token
        PAIRFORBASE: "" // the pair for the base token / weth
      },

*/
    ],
  },
  OPTIMISM: {
    PRIZEPOOLSUBGRAPH:
      "https://api.studio.thegraph.com/proxy/63100/pt-v5-optimism/version/latest/",
    PRIZETOKEN: {
      ADDRESS: "0x4200000000000000000000000000000000000006",
      SYMBOL: "WETH",
      NAME: "WETH",
      DECIMALS: 18,
      GECKO: "weth",
    },
    TWABREWARDS: "0x90D383dEA4dcE52D3e5D3C93dE75eF36da3Ea9Ea",
    UNIFLASHLIQUIDATOR: "0xB56D699B27ca6ee4a76e68e585999E552105C10f",
    GASORACLE: "0x420000000000000000000000000000000000000F",
    SWAPPER: "0xc8dd1b10e45d7ae0be9bc656d094565d64e1b11b",
    DRAWMANAGER: "0x7eED7444dE862c4F79c5820ff867FA3A82641857",
    RNG: "0x3d2Ef6C091f7CB69f06Ec3117F36A28BC596aa7B",
    TWABCONTROLLER: "0xCB0672dE558Ad8F122C0E081f0D35480aB3be167",
    LIQUIDATIONROUTER: "0x7766b5E6839a1a218Fc861b0810C504490876136",
    // VAULTFACTORY: '0xF0F151494658baE060034c8f4f199F74910ea806',
    VAULTFACTORY: "0x0C379e9b71ba7079084aDa0D1c1Aeb85d24dFD39",
    PRIZEPOOL: "0xF35fE10ffd0a9672d0095c435fd8767A7fe29B55",
    CLAIMERFACTORY: "0x498C92bEF017A91018ecCAE29b3b3C531e3f4794",
    CLAIMER: "0x0b5a1dc536D5A67C66D00B337E6b189385BD8438",
    VAULTS: [
      {
        VAULT: "0x03d3ce84279cb6f54f5e6074ff0f8319d830dafe",
        LIQUIDATIONPAIR: "0x7d72e1043FBaCF54aDc0610EA8649b23055462f0",
        SYMBOL: "przUSDC",
        NAME: "Prize USDC",
        DECIMALS: 6,
        ASSET: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
        ASSETSYMBOL: "USDC",
        ICON: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1547042389",
        GECKO: "usd-coin",
        VAULTICON: "https://app.cabana.fi/icons/pUSDC.e.svg",
      },
      {
        VAULT: "0xa52e38a9147f5eA9E0c5547376c21c9E3F3e5e1f",
        LIQUIDATIONPAIR: "0x0000000000000000000000000000000000000000",
        SYMBOL: "przPOOL",
        NAME: "Prize POOL",
        DECIMALS: 18,
        ASSET: "0x395Ae52bB17aef68C2888d941736A71dC6d4e125",
        ASSETSYMBOL: "POOL",
        ICON: "https://assets.coingecko.com/coins/images/14003/standard/PoolTogether.png?1696513732",
        GECKO: "pooltogether",
        VAULTICON: "",
      },
      {
        VAULT: "0x3e8DBe51DA479f7E8aC46307af99AD5B4B5b41Dc",
        LIQUIDATIONPAIR: "0xC9a3ebe8D34941eC7974b439a346D5F6880A70e8",
        SYMBOL: "przDAI",
        NAME: "Prize DAI",
        DECIMALS: 18,
        ASSET: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
        ASSETSYMBOL: "DAI",
        ICON: "https://assets.coingecko.com/coins/images/9956/standard/Badge_Dai.png?1696509996",
        GECKO: "dai",
        VAULTICON: "https://app.cabana.fi/icons/pDAI.svg",
      },
      {
        VAULT: "0x1F16D3CCF568e96019cEdc8a2c79d2ca6257894E",
        LIQUIDATIONPAIR: "0xf040A530fE669Fc334ba924b1fC9971c17301281",
        SYMBOL: "przLUSD",
        NAME: "Prize LUSD",
        DECIMALS: 18,
        ASSET: "0xc40F949F8a4e094D1b49a23ea9241D289B7b2819",
        ASSETSYMBOL: "LUSD",
        ICON: "https://assets.coingecko.com/coins/images/14666/standard/Group_3.png?1696514341",
        GECKO: "liquity-usd",
        VAULTICON:
          "https://assets.coingecko.com/coins/images/14666/standard/Group_3.png?1696514341",
      },
      {
        VAULT: "0x2998c1685E308661123F64B333767266035f5020",
        LIQUIDATIONPAIR: "0x006e714accBFEecD561a9B590e919402e871a91D",
        SYMBOL: "przWETH",
        NAME: "Prize WETH",
        DECIMALS: 18,
        ASSET: "0x4200000000000000000000000000000000000006",
        ASSETSYMBOL: "WETH",
        ICON: "https://uploads-ssl.webflow.com/631993187031511c025c721d/633c1ccea93ff4709ab091c2_633be870ec7f86530e8e5419_WETH.png",
        GECKO: "ethereum",
        VAULTICON: "https://app.cabana.fi/icons/pWETH.svg",
      },
      {
        VAULT: "0x9b53ef6f13077727d22cb4acad1119c79a97be17",
        LIQUIDATIONPAIR: "0xA67E22FCd27f36AD699504e37D278DC4c6C89433",
        SYMBOL: "przPOOLWETH",
        NAME: "Prize POOL/WETH Beefy",
        DECIMALS: "18",
        ASSET: "0xDB1FE6DA83698885104DA02A6e0b3b65c0B0dE80",
        ASSETSYMBOL: "vAMMV2-POOL/WETH",
        GECKO: "",
        BEEFY: "velodrome-v2-pool-weth",
        UNIV2: true,
      },

      {
        VAULT: "0xF1d934D5A3c6E530ac1450c92Af5Ba01eb90d4dE",
        LIQUIDATIONPAIR: "0x9a0cc6bBa9D027154309d1338f528C499323BB72",
        SYMBOL: "przOP",
        NAME: "Prize OP - Beefy Sonne",
        DECIMALS: "18",
        ASSET: "0x4200000000000000000000000000000000000042",
        ASSETSYMBOL: "OP",
        GECKO: "optimism",
      },
    ],
    BOOSTS: [],
    PAIRS: [
      {
        VAULT: "0x4200000000000000000000000000000000000042",
        LIQUIDATIONPAIR: "0xBb15Bce7E4a076d2606838DCeE60De84f06b0611",
        SYMBOL: "aaveOPRewards",
        NAME: "Aave OP Rewards",
        DECIMALS: 18,
        ASSET: "0x4200000000000000000000000000000000000042",
        ASSETSYMBOL: "OP",
        GECKO: "optimism",
        NOVAULT: true,
      },
    ],
  },
  BASESEPOLIA: {
    PRIZETOKEN: {
      ADDRESS: "0x41D7dDF285A08C74A4cB9FDc979C703B10c30ab1",
      SYMBOL: "WETH",
      NAME: "WETH",
      DECIMALS: 18,
      GECKO: "weth",
    },

    GASORACLE: "0x420000000000000000000000000000000000000F",
    DRAWMANAGER: "0x9E5f630D7Abc1F528716a94e86e590199c5F1223",
    RNG: "0x370E0EEEE6f4fa0cc1B818134186Cee6BcE4801d",
    TOKENFAUCET: "0x620CBC19C1c6A66a1A948E84794a708d158Db00A",
    TWABCONTROLLER: "0x1F047dB1B146c25028a7DBEf9e6467E9835b024f",
    LIQUIDATIONROUTER: "0x926F4777c583f0C0BB11F25B3EBB0A32ed3107aA",
    VAULTFACTORY: "0x039846baE81b6Ad824188b090D6F0F808a9686bA",
    PRIZEPOOL: "0xC90625047f206f525a811a54BbEc05C23E08B58b",
    CLAIMERFACTORY: "0x4A3350708c3d497AA7CD6fB6f5eBeE70678f8C01",
    CLAIMER: "0x86E975c177F8C2d1351e5A469e01ee86993B45D3",
    VAULTS: [
      {
        VAULT: "0x52e119Db61648df0680616f2E9Bd59a8B470bF1e",
        LIQUIDATIONPAIR: "0x0000000000000000000000000000000000000000",
        SYMBOL: "pPOOL",
        NAME: "Prize POOL",
        DECIMALS: 18,
        ASSET: "0x71B271952c3335e7258fBdCAE5CD3a57E76b5b51",
        ASSETSYMBOL: "POOL",
        ICON: "https://assets.coingecko.com/coins/images/14003/standard/PoolTogether.png?1696513732",
        GECKO: "pooltogether",
        VAULTICON: "",
      },
      {
        VAULT: "0x01F6351FE2651C411cD98910AAe2ADEfCD034c59",
        LIQUIDATIONPAIR: "0xfF9A75922DfC76D5B6735125994fE8A90C5a39d1",
        SYMBOL: "pDAI",
        NAME: "Prize DAI",
        DECIMALS: 18,
        ASSET: "0x82557c5157fcBEddD80aE09647Ec018a0083a638",
        ASSETSYMBOL: "DAI",
        ICON: "https://assets.coingecko.com/coins/images/9956/standard/Badge_Dai.png?1696509996",
        GECKO: "dai",
        VAULTICON: "https://app.cabana.fi/icons/pDAI.svg",
      },
      {
        VAULT: "0xA51D2A8dd481800E9576aeb341340411b2B28679",
        LIQUIDATIONPAIR: "0x05Fea7CFFD04bB554aea042B8ea6E08a8A5dC2F3",
        SYMBOL: "pUSDC",
        NAME: "Prize USDC",
        DECIMALS: 6,
        ASSET: "0xC88130e55Db4a3BA162984d6EFE4fF982BC0E227",
        ASSETSYMBOL: "USDC",
        ICON: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1547042389",
        GECKO: "usd-coin",
        VAULTICON: "https://app.cabana.fi/icons/pUSDC.e.svg",
      },
      {
        VAULT: "0x137a5E9cF386eA09bE2304f17052613609D24660",
        LIQUIDATIONPAIR: "0xa02563F927A14Bae5F2044B1a63Dd90E944619AE",
        SYMBOL: "pWETH",
        NAME: "Prize WETH",
        DECIMALS: 18,
        ASSET: "0x41D7dDF285A08C74A4cB9FDc979C703B10c30ab1",
        ASSETSYMBOL: "WETH",
        ICON: "https://uploads-ssl.webflow.com/631993187031511c025c721d/633c1ccea93ff4709ab091c2_633be870ec7f86530e8e5419_WETH.png",
        GECKO: "ethereum",
        VAULTICON: "https://app.cabana.fi/icons/pWETH.svg",
      },
      {
        VAULT: "0xeD665c4c6ec4315131ea5266dA4c3Be4694D0615",
        LIQUIDATIONPAIR: "0x8a3D9696563A73e627399f13b9a3998B904A3685",
        SYMBOL: "pGUSD",
        NAME: "Prize GUSD",
        DECIMALS: 2,
        ASSET: "0x431bf0FE8acB5C79C4f4FBc63f6De0756e928Dd3",
        ASSETSYMBOL: "GUSD",
        ICON: "https://assets.coingecko.com/coins/images/5992/standard/gemini-dollar-gusd.png?1696506408",
        GECKO: "gemini-dollar",
        VAULTICON: "",
      },
      {
        VAULT: "0x7BA33795f824c3494a7D8285E7cc20b83A7d7dBa",
        LIQUIDATIONPAIR: "0x0C5e3E7Ee6850f56dfF3539e19f5998dd65D91bF",
        SYMBOL: "pWBTC",
        NAME: "Prize WBTC",
        DECIMALS: 8,
        ASSET: "0x214e35Ca60a828cC44Fae2f2b97D37C116B02229",
        ASSETSYMBOL: "WBTC",
        ICON: "https://assets.coingecko.com/coins/images/7598/standard/wrapped_bitcoin_wbtc.png?1696507857",
        GECKO: "wrapped-bitcoin",
        VAULTICON: "",
      },
    ],
    BOOSTS: [],
  },
  ARBSEPOLIA: {
      PRIZEPOOLSUBGRAPH: "https://api.studio.thegraph.com/query/41211/pt-v5-arbitrum-sepolia/version/latest",  
  PRIZETOKEN: {
      ADDRESS: "0x1A586a874f7C6ca5C3220C434fb5096dDe2ec3f0",
      SYMBOL: "WETH",
      NAME: "WETH",
      DECIMALS: 18,
      GECKO: "weth",
    },

    DRAWMANAGER: "0x0ada25201d33e4a491d4ec6d54fb59e8397a9254",
    RNG: "0x273e7bb6399285ada1a13c579054d1fbaeb8b189",
    TOKENFAUCET: "0xb46f459c5e8dd6bd5f8e715f15d3bab58774951f",
    TWABCONTROLLER: "0xc91bb5ca3b0df407cb12c7696741a1dda6413308",
    TWABREWARDS: "0xab342fcf99a71ef54b9f3c0cd24d851ab0e3d6ec",
    LIQUIDATIONROUTER: "0xf1cc7c16df4e7c2ba62edcbe634a90dfff9df3e4",
    VAULTFACTORY: "0xfee52eb76262e9c0e97a28ab9f2e0309b2d30cc7",
    PRIZEPOOL: "0xdbbc646d78ca1752f2db6ea76dc467f740f9f816",
    CLAIMERFACTORY: "0xcf871cad98c8f400ce1ab480b1f7898f1d28de85",
    CLAIMER: "0x57efbae195ee330cc92206c458c738a18ebb0402",
    VAULTS: [
      {
        VAULT: '0xaab8f5125451c7cc6f9e2d4bd381415e8e38fa29',
        LIQUIDATIONPAIR: '0x0000000000000000000000000000000000000000',
        SYMBOL: 'pPOOL',
        NAME: 'Prize POOL',
        DECIMALS: 18,
        ASSET: '0xE02919b18388C666297D24d56CB794C440d33245',
        ASSETSYMBOL: 'POOL',
        ICON: 'https://assets.coingecko.com/coins/images/14003/standard/PoolTogether.png?1696513732',
        GECKO: 'pooltogether',
        VAULTICON: ''
      },
      {
        VAULT: '0xaa7b1d6a8aaf3ec564c071a9ed9f0d4bcb96a797',
        LIQUIDATIONPAIR: '0xF85Caa325FfB06c991CBE75e3F7059d47ED4bba4',
        SYMBOL: 'pDAI',
        NAME: 'Prize DAI',
        DECIMALS: 18,
        ASSET: '0x837F6ec55793c49B2994BA703a3D2331649B09EA',
        ASSETSYMBOL: 'DAI',
        ICON: 'https://assets.coingecko.com/coins/images/9956/standard/Badge_Dai.png?1696509996',
        GECKO: 'dai',
        VAULTICON: 'https://app.cabana.fi/icons/pDAI.svg'
      },
      {
        VAULT: '0x748c49421687017b9159e32f14d439cd38a156f7',
        LIQUIDATIONPAIR: '0xa748080Ae0c673c41ee690E1F16d340d8973779B',
        SYMBOL: 'pUSDC',
        NAME: 'Prize USDC',
        DECIMALS: 6,
        ASSET: '0x45B32D0C3Cf487e11C3b80AF564878bea83cCe67',
        ASSETSYMBOL: 'USDC',
        ICON: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png?1547042389',
        GECKO: 'usd-coin',
        VAULTICON: 'https://app.cabana.fi/icons/pUSDC.e.svg'
      },
      {
        VAULT: '0x6528c06563fa390ec67ac13973cd10089aa1d58f',
        LIQUIDATIONPAIR: '0x65Cd841dBdf9E9fBa4989034b284CE475594Ae12',
        SYMBOL: 'pWETH',
        NAME: 'Prize WETH',
        DECIMALS: 18,
        ASSET: '0x1A586a874f7C6ca5C3220C434fb5096dDe2ec3f0',
        ASSETSYMBOL: 'WETH',
        ICON: 'https://uploads-ssl.webflow.com/631993187031511c025c721d/633c1ccea93ff4709ab091c2_633be870ec7f86530e8e5419_WETH.png',
        GECKO: 'ethereum',
        VAULTICON: 'https://app.cabana.fi/icons/pWETH.svg'
      }
    ],
    
  },
};
const STARTBLOCK = {
  OPTIMISM: {
    PRIZEPOOL: 118900268,
  },
};

module.exports = { ADDRESS, STARTBLOCK, GetChainName };
