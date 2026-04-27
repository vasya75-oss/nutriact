// db.js — работа с localStorage
async function getUserSettings() {
    const settings = {};
    const keys = ['supabaseUrl', 'supabaseAnonKey', 'dailyCalorieGoal', 'dailyWaterGoal', 'geminiApiKey', 'yandexApiKey'];
    for (let key of keys) {
        const value = localStorage.getItem(`nutriact_${key}`);
        if (value !== null) settings[key] = value;
    }
    return settings;
}

async function saveUserSettings(settings) {
    for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined && value !== null) {
            localStorage.setItem(`nutriact_${key}`, value);
        }
    }
    return true;
}

function getStorageKey(storeName) {
    return `nutriact_${storeName}`;
}

async function saveToLocal(storeName, data) {
    const key = getStorageKey(storeName);
    let existing = [];
    try {
        const stored = localStorage.getItem(key);
        if (stored) existing = JSON.parse(stored);
    } catch(e) {}
    for (let newItem of data) {
        const index = existing.findIndex(item => item.id === newItem.id);
        if (index !== -1) existing[index] = newItem;
        else existing.push(newItem);
    }
    localStorage.setItem(key, JSON.stringify(existing));
    return true;
}

async function getAllFromLocal(storeName) {
    const key = getStorageKey(storeName);
    const stored = localStorage.getItem(key);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch(e) { return []; }
    }
    return [];
}

async function clearStore(storeName) {
    localStorage.removeItem(getStorageKey(storeName));
    return true;
}

async function getAllProductsLocal() {
    return getAllFromLocal('products');
}
async function saveProductsToLocal(products) {
    return saveToLocal('products', products);
}
async function clearProductsCache() {
    return clearStore('products');
}