const {CONTRACTS} = require("../constants/contracts")
const {CONFIG} = require("../constants/config")

async function confirmWinner(vault,pooler,tier,index) {
	console.log("chain ",CONFIG.CHAINNAME)
	const didWin = await CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].isWinner(vault,pooler,tier,index)
	console.log(didWin, " vault ",vault,"add: ",pooler," tier ",tier,"index ",index)
 
// 	109378956
// const didWin2 = await CONTRACTS.PRIZEPOOL[CONFIG.CHAINNAME].isWinner(vault,pooler,tier,index,{blockTag:109378956})
// console.log("block 109378956 ",didWin2, " vault ",vault,"add: ",pooler," tier ",tier,"index ",index)

}



//0x4d8a650230d9909c1cac2a25ebe4e15debed4e2c  won tier 3  indices [ 7, 8 ] on vault 0x31515cfc4550d9c83e2d86e8a352886d1364e2d9
//confirmWinner("0x31515cfc4550d9c83e2d86e8a352886d1364e2d9","0x4d8a650230d9909c1cac2a25ebe4e15debed4e2c",3,7)
//confirmWinner("0x31515cfC4550d9C83E2d86E8a352886d1364E2D9","0x52b9783f1F955Ac10d50c7D4AB62d7F2288D6446",3,21)
confirmWinner("0x31515cfC4550d9C83E2d86E8a352886d1364E2D9","0xDE107B82e3e47eD281D276644b8115548C085C24",3,36)
/*	0x31515cfC4550d9C83E2d86E8a352886d1364E2D9
1	_tier	uint8	3
2	_winners	address[]	0xDE107B82e3e47eD281D276644b8115548C085C24
3	_prizeIndices	uint32[][]	36*/
