require('../env-setup');

// dotenv.config();
const pgp = require("pg-promise")(/* initialization options */);

const cn = {
  host: "localhost", // server name or IP address;
  port: 5432,
  database: process.env.DATABASE,
  user: process.env.USER,
  password: process.env.PASSWORD,
};
const DB = pgp(cn);
module.exports = { DB };


