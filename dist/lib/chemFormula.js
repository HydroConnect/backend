const pHRange = {
    ideal: [[7, 7.5]],
    acceptable: [
        [6.5, 7],
        [7.5, 8.5],
    ],
    fail: [
        [6, 6.5],
        [8.5, 9],
    ],
};
const tdsRange = {
    ideal: [[50, 150]],
    acceptable: [[150, 300]],
    fail: [[300, 600]],
};
const turbidityRange = {
    ideal: [[0, 1]],
    acceptable: [[1, 5]],
    fail: [[5, 10]],
};
function linearMap(value, fromMin, fromMax, toMin, toMax, invert = false) {
    if (invert) {
        toMax = [toMin, (toMin = toMax)][0];
    }
    return toMin + ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin);
}
function isInRange(value, range) {
    return range[0] <= value && value <= range[1];
}
function round(num, precision) {
    return Math.round(num * 10 ** precision) / 10 ** precision;
}
function scorePH(pH) {
    const keys = Object.keys(pHRange);
    for (let i = 0; i < keys.length; i++) {
        const status = keys[i];
        for (let j = 0; j < pHRange[status].length; j++) {
            const range = pHRange[status][j];
            if (isInRange(pH, range)) {
                switch (status) {
                    case "ideal":
                        return 100;
                    case "acceptable":
                        return linearMap(pH, range[0], range[1], 50, 100, j === 1);
                    case "fail":
                        return linearMap(pH, range[0], range[1], 0, 50, j === 1);
                }
            }
        }
    }
    return 0;
}
function scoreTDS(tds) {
    if (tds > 0 && tds < 50) {
        return linearMap(tds, 0, 50, 20, 100);
    }
    const keys = Object.keys(tdsRange);
    for (let i = 0; i < keys.length; i++) {
        const status = keys[i];
        for (let j = 0; j < tdsRange[status].length; j++) {
            const range = tdsRange[status][j];
            if (isInRange(tds, range)) {
                switch (status) {
                    case "ideal":
                        return 100;
                    case "acceptable":
                        return linearMap(tds, range[0], range[1], 50, 100, true);
                    case "fail":
                        return linearMap(tds, range[0], range[1], 0, 50, true);
                }
            }
        }
    }
    return 0;
}
function scoreTurbidity(turbidity) {
    const keys = Object.keys(turbidityRange);
    for (let i = 0; i < keys.length; i++) {
        const status = keys[i];
        for (let j = 0; j < turbidityRange[status].length; j++) {
            const range = turbidityRange[status][j];
            if (isInRange(turbidity, range)) {
                switch (status) {
                    case "ideal":
                        return 100;
                    case "acceptable":
                        return linearMap(turbidity, range[0], range[1], 50, 100, true);
                    case "fail":
                        return linearMap(turbidity, range[0], range[1], 0, 50, true);
                }
            }
        }
    }
    return 0;
}
export function chemFormula(readings) {
    const value = {
        pH: scorePH(readings.pH),
        tds: scoreTDS(readings.tds),
        turbidity: scoreTurbidity(readings.turbidity),
    };
    const weights = {
        pH: 0.33,
        tds: 0.33,
        turbidity: 0.34,
    };
    const keys = Object.keys(weights);
    // IF SENSOR_ERROR
    if (((readings.control >> 3) & 1) === 0) {
        for (let i = 0; i < keys.length; i++) {
            weights[keys[i]] = 0;
        }
    }
    // Normalize weights
    let sumWeights = 0;
    for (let i = 0; i < keys.length; i++) {
        sumWeights += weights[keys[i]];
    }
    for (let i = 0; i < keys.length; i++) {
        weights[keys[i]] = weights[keys[i]] / sumWeights;
    }
    // Count overall score
    let score = 0;
    for (let i = 0; i < keys.length; i++) {
        score += weights[keys[i]] * value[keys[i]];
    }
    return Math.max(Math.min(100, round(score, 2)), 0);
}
