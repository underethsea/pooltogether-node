const fs = require("fs");
const path = require("path");

const FetchFilePrizes = async (chain, draw, tiersToClaim) => {
console.log("file prizes!"
  try {
    const filePath = path.join(__dirname, "..", "winners.json");

    if (!fs.existsSync(filePath)) {
      console.error("winners.json not found.");
      return null;
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent);

    // This will return exactly [vault, user, tier, indices] just like API
    const winsToClaim = [];

    for (const entry of jsonData) {
      const { user, prizes, vault } = entry;

      for (const [tierStr, indices] of Object.entries(prizes)) {
        const tier = Number(tierStr);

        if (tiersToClaim.length === 0 || tiersToClaim.includes(tier)) {
          winsToClaim.push([vault, user, tier, indices]);
        }
      }
    }

    return winsToClaim;
  } catch (e) {
    console.error("Error reading local prize file:", e);
    return null;
  }
};

module.exports = { FetchFilePrizes };
