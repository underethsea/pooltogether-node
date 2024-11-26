const { DB } = require("./dbConnection");
  const pgp = require('pg-promise')();

async function AddClaim(network, prizepool, claim) {
    prizepool = prizepool.toLowerCase();

    try {
        // Define query and parameters for checking existence
        const checkClaimExistsQuery = `
            SELECT EXISTS (
                SELECT 1 FROM claims 
                WHERE network = $1 
                  AND block = $2 
                  AND hash = $3 
                  AND draw = $4 
                  AND vault = $5 
                  AND winner = $6 
                  AND payout = $7 
                  AND miner = $8 
                  AND fee = $9 
                  AND tier = $10 
                  AND index = $11 
                  AND prizepool = $12
            )
        `;

        // Create params array for the query
        const params = [
            network,
            claim.block,
            claim.hash,
            claim.drawId,
            claim.vault,
            claim.winner,
            claim.payout.toString(), // Ensure consistent type
            claim.miner,
            claim.fee.toString(),   // Ensure consistent type
            claim.tier,
            claim.index,
            prizepool
        ];

        // Execute the query
        const exists = await DB.one(checkClaimExistsQuery, params);

        // If claim exists, return early
        if (exists.exists) {
            console.log(`Duplicate claim found: tx ${claim.hash}, winner ${claim.winner}`);
            return "existing";
        }

        // Add the claim if it doesn't exist
        const addClaimQuery = `
            INSERT INTO claims (network, block, hash, draw, vault, winner, payout, miner, fee, tier, index, prizepool) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
        await DB.any(addClaimQuery, params);

        console.log(`${network}: Claim added to db, tx ${claim.hash}, winner ${claim.winner}, tier/index ${claim.tier}/${claim.index}, amt ${claim.payout}`);
        return "added";
    } catch (error) {
        console.error("Failed to process claim:", error);
        return "error";
    }
}

/*async function AddClaim(network,prizepool, claim) {
prizepool = prizepool.toLowerCase()
    try {
        // Check if claim already exists
        const checkClaimExistsQuery = `
            SELECT 1 FROM claims 
            WHERE network = $1 
                AND block = $2 
                AND hash = $3 
                AND draw = $4 
                AND vault = $5 
                AND winner = $6 
                AND payout = $7 
                AND miner = $8 
                AND fee = $9 
                AND tier = $10
                AND index = $11 
                AND LOWER(prizepool) = LOWER($12)
        `;
        const existingClaim = await DB.oneOrNone(checkClaimExistsQuery, [
            network,
            claim.block,
            claim.hash,
            claim.drawId,
            claim.vault,
            claim.winner,
            claim.payout.toString(),
            claim.miner,
            claim.fee.toString(),
            claim.tier,
            claim.index,
            prizepool
        ]);

        if (existingClaim) {
            console.log("Dup claim found in db, skipping: tx ", claim.hash," winner ",claim.winner);
            return "existing";
        }

        // Add claim to the table if it doesn't exist
        const addClaimQuery = `
            INSERT INTO claims (network, block, hash, draw, vault, winner, payout, miner, fee, tier, index, prizepool) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;
        await DB.any(addClaimQuery, [
            network,
            claim.block,
            claim.hash,
            claim.drawId,
            claim.vault,
            claim.winner,
            claim.payout.toString(),
            claim.miner,
            claim.fee.toString(),
            claim.tier,
          claim.index,  
          prizepool
        ]);
     console.log(network,"claim added to db, tx ",claim.hash," winner ",claim.winner," tier/index ",claim.tier,"/",claim.index,"amt",claim.payout.toString())
return "added";  
  } catch (error) {
        // Handle error
        console.error("Failed to process claim:", error);
return "error";    
}
}
*/





  async function AddPoolers(network,draw, poolers) {
    const poolersData = poolers.map(({ address, ...rest }) => ({
      network: network,
      draw: draw,
      pooler: address,
      ...rest,
    }));
  
        try {
          const cs = new pgp.helpers.ColumnSet(['network', 'draw', 'vault', 'pooler', 'balance'], { table: 'poolers' });
          const insertQuery = pgp.helpers.insert(poolersData, cs);
      
          await DB.none(insertQuery);
          console.log('Poolers data updated.');
        } catch (error) {
          console.error('Error inserting poolers data', error);
        }
      // await removeDuplicates()
      }
      
      async function removeDuplicates() {
        try {
          const deleteQuery = `
            DELETE FROM poolers p1
            WHERE EXISTS (
              SELECT 1
              FROM poolers p2
              WHERE p1.network = p2.network
                AND p1.draw = p2.draw
                AND p1.vault = p2.vault
                AND p1.pooler = p2.pooler
                AND p1.balance = p2.balance
                AND p1.ctid <> p2.ctid
            )
            RETURNING network, draw, vault, pooler, balance;
          `;
          
          const result = await DB.result(deleteQuery);
          const deletedCount = result.rowCount;
          
          console.log(`Deleted ${deletedCount} duplicate rows.`);
          return deletedCount;
        } catch (error) {
          console.error('Error removing duplicates', error);
          return 0;
        }
      }
      
        
  
async function AddDraw(
  network,
  draw,
  //startedAt,
  //periodSeconds,
  tiers,
  //grandPrizePeriod,
  tierValues,
  prizesForTier,
  block,
  prizePool
) {
  prizePool = prizePool.toLowerCase();
  try {
    const checkForDrawQuery =
      "SELECT * FROM draws WHERE network = $1 and draw = $2 and prizepool = $3";
    let checkingForDraw = [];
    try {
      checkingForDraw = await DB.any(checkForDrawQuery, [network.toString(), draw, prizePool]);
      if (checkingForDraw.length > 0) {
        console.log("duplicate draw='" + draw + "'  and network='" + network + " and prize pool=" + prizePool);
        return "Draw already in db";
      }
    } catch (error) {
      checkingForDraw = [];
    }

    const addDrawQuery =
      "INSERT INTO draws (network, draw, tiers, tierValues, prizeIndices, block, prizePool, calculated) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
    console.log("add draw query ", addDrawQuery);
    console.log(network, draw, tiers, tierValues, prizesForTier, parseInt(block));

    await DB.any(addDrawQuery, [
      network,
      draw,
      tiers,
      tierValues,
      prizesForTier,
      parseInt(block),
      prizePool,
      false // Set calculated to false
    ]);

    return "Draw added";
  } catch (error) {
    console.log(error);
    return "Could not add draw";
  }
}

async function UpdateDrawCalculated(network, draw, prizePool) {
  prizePool = prizePool.toLowerCase();
  try {
    const updateQuery = "UPDATE draws SET calculated = $1 WHERE network = $2 AND draw = $3 AND prizepool = $4";
    await DB.any(updateQuery, [true, network, draw, prizePool]);
    console.log(`Draw ${draw} on network ${network} for prize pool ${prizePool} marked as calculations done.`);
    return "Draw calculations updated";
  } catch (error) {
    console.log(error);
    return "Could not update draw calculations";
  }
}

  async function AddWin(network, draw, vault, pooler, tier, indices, prizePool) {
prizePool = prizePool.toLowerCase()
pooler=pooler.toLowerCase()

      console.log("adddding ",network, draw, vault, pooler, tier, indices)
      
    try {
      // does not check that tiers are exactly the same, just looking for player already winning that draw on that vault
      const checkForWinQuery =
        "SELECT * FROM wins WHERE network = $1 AND draw = $2 AND vault = $3 AND pooler = $4 and tier = $5 and prizepool = $6";

      let checkingForWin = [];
      try {
        checkingForWin = await DB.any(checkForWinQuery, [
          network.toString(),
          draw,
          vault,
          pooler,
          tier,
          prizePool
        ]);
        if (checkingForWin.length > 0) {
          console.log(
            "duplicate win network" +
              network +
              "draw='" +
              draw +
              "'  and vault='" +
              vault +
              " and pooler = " +
              pooler + " and tier " + tier
          );
          return "Win already in db";
        }
      } catch (error) {
        checkingForWin = [];
      }

      const addWinQuery =
        "INSERT INTO wins (network, draw, vault, pooler, tier, prizeIndices,prizePool) VALUES ($1, $2, $3, $4, $5, $6, $7)";
      await DB.any(addWinQuery, [network.toString(), draw, vault, pooler, tier, indices, prizePool]);
//console.log("win added",network,pooler,tier,prizeIndices)
      return "Win added";
    } catch (error) {
      console.log(error);
      return "Could not add win";
    }
  }
module.exports = { AddWin, AddDraw, AddPoolers, AddClaim, UpdateDrawCalculated };


  /*
    CREATE TABLE draws (
    id SERIAL PRIMARY KEY,
    network INTEGER,
    draw INTEGER,
    startedAt TIMESTAMP,
    periodSeconds INTEGER,
    tiers INTEGER,
    grandPrizePeriod INTEGER,
    tiervalues NUMERIC[],
    prizeIndices INTEGER[],
    block INTEGER
  );
  */
  /*
  CREATE TABLE wins (
    win_id SERIAL PRIMARY KEY,
    network INTEGER,
    draw INTEGER,
    vault VARCHAR,
    pooler VARCHAR,
    tier INTEGER[],
    prizeIndices INTEGER[]
    claimedIndices INTEGER[]
  );
  CREATE TABLE poolers (
    network INTEGER,
    draw INTEGER,
    pooler VARCHAR,
    vault VARCHAR,
    balance NUMERIC,
  )
  CREATE TABLE claims(
    network INTEGER,
    block INTEGER,
    hash VARCHAR,
    draw INTEGER,
    vault VARCHAR,
    winner VARCHAR,
    payout TEXT,
    miner VARCHAR,
    fee TEXT,
    tier INTEGER,
    index INTEGER,
  )
  */
