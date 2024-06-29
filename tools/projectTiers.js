const apiUrl = "https://poolexplorer.xyz/10-0xF35fE10ffd0a9672d0095c435fd8767A7fe29B55-history";

// Function to calculate number of tiers
function calculateTiers(tiersWon) {
    return Math.max(...tiersWon) + 1;
}

// Function to predict future number of tiers based on historical data
function predictTiers(history, windowSize) {
    if (history.length < windowSize) {
        return null;
    }
    const windowData = history.slice(-windowSize);
    const sum = windowData.reduce((acc, val) => acc + val, 0);
    return sum / windowSize;
}

// Function to evaluate accuracy of predictions
function evaluatePredictions(data, windowSize) {
    let actual = [];
    let predicted = [];
    
    for (let i = windowSize; i < data.length; i++) {
        let history = data.slice(0, i).map(item => item.tiers);
        for (let j = i; j < data.length; j++) {
            let actualTiers = data[j].tiers;
            let predictedTiers = predictTiers(history, windowSize);
            if (predictedTiers !== null) {
                actual.push(actualTiers);
                predicted.push(predictedTiers);
            }
        }
    }
    
    return calculateMSE(actual, predicted);
}

// Function to calculate mean squared error
function calculateMSE(actual, predicted) {
    let sumSquaredError = 0;
    for (let i = 0; i < actual.length; i++) {
        sumSquaredError += Math.pow(actual[i] - predicted[i], 2);
    }
    return sumSquaredError / actual.length;
}

// Function to predict future number of tiers based on the last draw only
function predictTiersLastDraw(history) {
    if (history.length < 1) {
        return null;
    }
    return history[history.length - 1];
}

// Function to evaluate accuracy of predictions using only the last draw
function evaluatePredictionsLastDraw(data) {
    let actual = [];
    let predicted = [];
    
    for (let i = 1; i < data.length; i++) {
        let history = data.slice(0, i).map(item => item.tiers);
        for (let j = i; j < data.length; j++) {
            let actualTiers = data[j].tiers;
            let predictedTiers = predictTiersLastDraw(history);
            if (predictedTiers !== null) {
                actual.push(actualTiers);
                predicted.push(predictedTiers);
            }
        }
    }
    
    return calculateMSE(actual, predicted);
}

// Fetch data from the API
fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
        // Process the data to calculate tiers
        data.forEach(item => {
            item.tiers = calculateTiers(item.tiersWon);
        });

        // Evaluate predictions using only the last draw
        let mseLastDraw = evaluatePredictionsLastDraw(data);
        console.log(`MSE using the last draw: ${mseLastDraw}`);

        // Evaluate predictions using various window sizes
        let windowSizes = [1, 2, 3, 4, 5, 7, 10];
        let bestMSE = Number.MAX_VALUE;
        let bestWindowSize = 0;

        windowSizes.forEach(windowSize => {
            let mse = evaluatePredictions(data, windowSize);
            console.log(`MSE using the last ${windowSize} draws: ${mse}`);
            if (mse < bestMSE) {
                bestMSE = mse;
                bestWindowSize = windowSize;
            }
        });

        console.log(`Best window size: ${bestWindowSize} with MSE: ${bestMSE}`);
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
