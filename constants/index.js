const CONFIG = require("./config")
const ABI = require("./abi")
const ADDRESS = require("./address");
const { PROVIDERS, SIGNER } = require("./providers");
const CONTRACTS = require("./contracts");

const CHAINIDTONAME = {
    11155111: "SEPOLIA",
    80001: "MUMBAI",
    420: "OPGOERLI"
}

module.exports = {
  CONTRACTS,
  ADDRESS,
  PROVIDERS,
  ABI,
  CONFIG,
  SIGNER,
  CHAINIDTONAME
};
