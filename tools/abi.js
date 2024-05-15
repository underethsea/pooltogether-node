const DRAWMANAGER = require('./abis/drawmanager');
const RNG = require('./abis/rng');
const TWABCONTROLLER = require('./abis/twabcontroller');
const TWABREWARDS = require('./abis/twabrewards');
const LIQUIDATIONROUTER = require('./abis/liquidationrouter');
const VAULTFACTORY = require('./abis/vaultfactory');
const PRIZEPOOL = require('./abis/prizepool');
const CLAIMERFACTORY = require('./abis/claimerfactory');
const CLAIMER = require('./abis/claimer');

const ABI = {
  DRAWMANAGER: DRAWMANAGER,
  RNG: RNG,
  TWABCONTROLLER: TWABCONTROLLER,
  TWABREWARDS: TWABREWARDS,
  LIQUIDATIONROUTER: LIQUIDATIONROUTER,
  VAULTFACTORY: VAULTFACTORY,
  PRIZEPOOL: PRIZEPOOL,
  CLAIMERFACTORY: CLAIMERFACTORY,
  CLAIMER: CLAIMER,
};

module.exports = { ABI };
