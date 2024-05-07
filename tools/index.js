const TOKENFAUCET = require('./abis/tokenfaucet');
const TWABCONTROLLER = require('./abis/twabcontroller');
const LIQUIDATIONPAIRFACTORY = require('./abis/liquidationpairfactory');
const LIQUIDATIONROUTER = require('./abis/liquidationrouter');
const VAULTFACTORY = require('./abis/vaultfactory');
const PRIZEPOOL = require('./abis/prizepool');
const CLAIMERFACTORY = require('./abis/claimerfactory');
const CLAIMER = require('./abis/claimer');
const VAULT = require('./abis/vault');

const ABI = {
  TOKENFAUCET: TOKENFAUCET,
  TWABCONTROLLER: TWABCONTROLLER,
  LIQUIDATIONPAIRFACTORY: LIQUIDATIONPAIRFACTORY,
  LIQUIDATIONROUTER: LIQUIDATIONROUTER,
  VAULTFACTORY: VAULTFACTORY,
  PRIZEPOOL: PRIZEPOOL,
  CLAIMERFACTORY: CLAIMERFACTORY,
  CLAIMER: CLAIMER,
  VAULT: VAULT,
};

module.exports = ABI;
