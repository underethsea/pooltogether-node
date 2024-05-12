const DRAWMANAGER = require('./abis/drawmanager');
const RNG = require('./abis/rng');
const TOKENFAUCET = require('./abis/tokenfaucet');
const TWABCONTROLLER = require('./abis/twabcontroller');
const LIQUIDATIONROUTER = require('./abis/liquidationrouter');
const VAULTFACTORY = require('./abis/vaultfactory');
const PRIZEPOOL = require('./abis/prizepool');
const CLAIMERFACTORY = require('./abis/claimerfactory');
const CLAIMER = require('./abis/claimer');
const VAULT = require('./abis/vault');

const ABI = {
  DRAWMANAGER: DRAWMANAGER,
  RNG: RNG,
  TOKENFAUCET: TOKENFAUCET,
  TWABCONTROLLER: TWABCONTROLLER,
  LIQUIDATIONROUTER: LIQUIDATIONROUTER,
  VAULTFACTORY: VAULTFACTORY,
  PRIZEPOOL: PRIZEPOOL,
  CLAIMERFACTORY: CLAIMERFACTORY,
  CLAIMER: CLAIMER,
  VAULT: VAULT,
};

module.exports = { ABI };
