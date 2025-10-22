function _filterMongo(entry) {
    const keys = Object.keys(entry);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key == "_id" || key == "__v") {
            entry[key] = undefined;
            delete entry[key];
            continue;
        }
        if (typeof entry[key] === "object") {
            entry[key] = _filterMongo(entry[key]);
        }
    }
    return entry;
}
export function filterMongo(mongoResult) {
    return mongoResult.map((entry) => {
        return _filterMongo(entry.toObject());
    });
}
