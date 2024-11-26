const https = require('https');

let successCount = 0;
let failureCount = 0;

function checkEndpoint() {
  https.get('https://poolexplorer.xyz/overview', (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const jsonResponse = JSON.parse(data);
        const gnosisTotal = jsonResponse?.pendingPrize?.GNOSIS?.total;

        if (gnosisTotal) {
          successCount++;
          console.log(`Success: GNOSIS total is ${gnosisTotal}`);
        } else {
          failureCount++;
          console.log(`Failure: GNOSIS total not found`);
        }

        console.log(`Successes: ${successCount}, Failures: ${failureCount}`);
      } catch (err) {
        failureCount++;
        console.error(`Error parsing response: ${err.message}`);
        console.log(`Successes: ${successCount}, Failures: ${failureCount}`);
      }
    });
  }).on('error', (err) => {
    failureCount++;
    console.error(`Request error: ${err.message}`);
    console.log(`Successes: ${successCount}, Failures: ${failureCount}`);
  });
}

// Check every 10 seconds
setInterval(checkEndpoint, 10000);

// Initial call to start immediately
checkEndpoint();
