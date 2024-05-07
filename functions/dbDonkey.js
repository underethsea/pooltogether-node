const { DB } = require("./dbConnection");
  const pgp = require('pg-promise')();

async function AddClaim(network,prizepool, claim) {
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
                AND prizepool = $12
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
            console.log("Duplicate claim found in db, skipping adding it again: tx ", claim.hash," winner ",claim.winner);
            return;
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
    } catch (error) {
        // Handle error
        console.error("Failed to process claim:", error);
    }
}


/*
  async function AddClaim(network, claim) {


    const isTargetDraw = claim.drawId === 134;

    try {
        // Add claim to claim table
        const addClaimQuery = "INSERT INTO claims (network, block, hash, draw, vault, winner, payout, miner, fee, tier, index) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)";
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
            claim.index
        ]);

        // Fetch matching row from win table
        const selectQuery = `
            SELECT *
            FROM wins
            WHERE network = $1
              AND pooler = $2
              AND draw = $3
              AND tier = $4
              AND vault = $5;
        `;
        const selectParams = [claim.network, claim.winner.toLowerCase(), claim.drawId, claim.tier, claim.vault];
        const rows = await DB.any(selectQuery, selectParams);

        if (rows.length === 1) {
            const { prizeindices, claimedindices } = rows[0];

            // Initialize claimedIndices if not present
            let updatedClaimedIndices = claimedindices || new Array(prizeindices.length).fill("-1");

            for (let i = 0; i < prizeindices.length; i++) {
                if (prizeindices[i] == claim.index) {
                    updatedClaimedIndices[i] = String(claim.payout);
                }
            }

            const updateQuery = `
                UPDATE wins
                SET claimedindices = $1
                WHERE network = $2
                  AND pooler = $3
                  AND draw = $4
                  AND tier = $5
                  AND vault = $6;
            `;
            const updateParams = [updatedClaimedIndices, claim.network, claim.winner.toLowerCase(), claim.drawId, claim.tier, claim.vault];

            if (isTargetDraw) {
                console.log("Claim index:", claim.index);
                console.log("DB Indices:", claimedindices);
                console.log("Updated Indices:", updatedClaimedIndices);
                console.log("Executing update query with params:", updateParams);
            }

            await DB.any(updateQuery, updateParams);
        } else if (rows.length === 0) {
            // Create a new win row if no matching row found
            const insertWinQuery = `
                INSERT INTO wins (network, draw, vault, pooler, tier, prizeindices, claimedindices)
                VALUES ($1, $2, $3, $4, $5, $6, $7);
            `;
            // Placeholder for prizeindices, adjust as necessary
            const defaultPrizeIndices = [claim.index];
            // Placeholder for claimedindices, marking the current claim index as claimed
            const defaultClaimedIndices = [String(claim.payout)];
            
            const insertWinParams = [claim.network, claim.drawId, claim.vault, claim.winner.toLowerCase(), claim.tier, defaultPrizeIndices, defaultClaimedIndices];
            await DB.any(insertWinQuery, insertWinParams);

            if (isTargetDraw) {
                console.log("No matching row found, inserting new win entry for claim:", claim);
            }
        } else {
            if (isTargetDraw) {
                console.error("Multiple matching rows found for claim:", claim);
            }
        }
    } catch (error) {
        if (isTargetDraw) {
            console.error('Error in AddClaim for draw 134:', error);
        } else {
            console.error('Error in AddClaim:', error);
        }
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
prizePool = prizePool.toLowerCase()
    try {

      const checkForDrawQuery =
        "SELECT * FROM draws WHERE network = $1 and draw = $2 and prizepool = $3";
      let checkingForDraw = [];
      try {
        checkingForDraw = await DB.any(checkForDrawQuery, [network.toString(), draw,prizePool]);
        if (checkingForDraw.length > 0) {
          console.log("duplicate draw='" + draw + "'  and network='" + network + " and prize pool=" +prizePool);
          return "Draw already in db";
        }
      } catch (error) {
        checkingForDraw = [];
      }

      //const startedAtTimestamp = new Date(startedAt * 1000);

      const addDrawQuery =
        "INSERT INTO draws (network,draw,tiers, tierValues, prizeIndices, block, prizePool) VALUES ($1, $2, $3, $4, $5, $6, $7)";
      console.log("add draw query ", addDrawQuery);
  console.log( network,
        draw,
       // startedAtTimestamp,
       // periodSeconds,
        tiers,
        //grandPrizePeriod,
        tierValues,
        prizesForTier,
        parseInt(block))

      await DB.any(addDrawQuery, [
        network,
        draw,
       // startedAtTimestamp,
       // periodSeconds,
        tiers,
        //grandPrizePeriod,
        tierValues,
        prizesForTier,
        parseInt(block),
        prizePool
      ]);

      return "Win added";
    } catch (error) {
      console.log(error);
      return "Could not add draw";
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

  module.exports = { AddWin, AddDraw , AddPoolers, AddClaim};

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
