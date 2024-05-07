const {PROVIDERS} = require("./constants/providers")
async function go(){
const gas = await PROVIDERS["OPSEPOLIA"].getGasPrice()
console.log(gas.toString()/1e9)
}
go()
