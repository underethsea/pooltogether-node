const {CONTRACTS} = require("../constants/contracts")
const {CONFIG} = require("../constants/config")

async function confirmWinner(vault, winners, tier, indicesArray) {
    for (let i = 0; i < winners.length; i++) {
        let pooler = winners[i];
        let indices = indicesArray[i];

        for (let index of indices) {
            await checkWinnerForIndex(vault, pooler, tier, index);
        }
    }
}

async function checkWinnerForIndex(vault, pooler, tier, index) {
    console.log("Checking for pooler:", pooler, "index:", index);

    const didWin = await CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].isWinner(vault, pooler, tier, index);
    console.log( didWin, "vault", vault, "add:", pooler, "tier", tier, "index", index);

}

/*
//{"v":"0x31515cfc4550d9c83e2d86e8a352886d1364e2d9","p":"0xde107b82e3e47ed281d276644b8115548c085c24","t":4,"i":[10,83,127],"c":[]},
const vault= '0x31515cfc4550d9c83e2d86e8a352886d1364e2d9'
const tier = 4
const winners = [
'0xde107b82e3e47ed281d276644b8115548c085c24']
const prizeIndicesBeingClaimed =  [ [ 10, 83, 127 ]]

*/
const vault = "0x6d02b0ce229abee2f155248e66d8e090d3c86bb2"
const tier = "5"
const winners =  [
  '0x966004a0f02B034288c3e1F540b5dFBD8717Da3c',
  '0x50CAf7E5Ae02d95F204E42A83e4E597fc04C4CFA',
  '0xC7624908FD5Abd6A2CD5A228ce580E93741b9E2C',
  '0xAf19DE7f6aAf402C5974976709fa2a9457Ed3fdb',
  '0x9a438d351217c26c569d8140190E1D8A6Ed545cF',
  '0x1524768a24f12B2A4730cce79111EbEC1a254050',
  '0xD42eFb5fEBC0A890aD6Dc9f43522a6E7e81Febed',
  '0xfaf5a4296b8DE0570cB50e35D2C1bF2a1FcF473F',
  '0x10A07df90c32B36459Ba5a409F347D2c027cB1E4',
  '0x8EbB36f60Ee5bF12250ab85b15f5290298Bac28A'
]
const prizeIndicesBeingClaimed = [
  [ 118 ],      [ 576 ],
  [ 703 ],      [ 984 ],
  [ 978 ],      [ 772, 973 ],
  [ 626, 921 ], [ 962 ],
  [ 224 ],      [ 57 ]
]

//fee recipient 0xE5860FF1c57DDCEF024Cb43B37b8A20bfE4c9822
//min fee 0


confirmWinner(vault, winners, tier, prizeIndicesBeingClaimed);
