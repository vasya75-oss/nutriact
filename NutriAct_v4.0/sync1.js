// sync.js — синхронизация с Supabase
let syncInterval;

async function initSync() {
    await syncFromLocalToRemote();
    await syncProducts();
    if (window.supabaseClient) {
        window.supabaseClient.channel('public:food_entries')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'food_entries' }, handleRemoteChange)
            .subscribe();
        window.supabaseClient.channel('public:activity_entries')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_entries' }, handleRemoteChange)
            .subscribe();
    }
    syncInterval = setInterval(() => {
        syncFromLocalToRemote();
        syncProducts();
    }, 60000);
}

async function syncFromLocalToRemote() {
    if (!window.supabaseClient || !window.currentUser) return;
    let localFood, localActivity;
    try {
        localFood = await getAllFromLocal('food_entries');
        localActivity = await getAllFromLocal('activity_entries');
    } catch (e) {
        console.warn('Ошибка получения локальных данных:', e);
        return;
    }
    if (!Array.isArray(localFood)) localFood = [];
    if (!Array.isArray(localActivity)) localActivity = [];

    for (let item of localFood) {
        if (!item.synced) {
            const { error } = await window.supabaseClient.from('food_entries').upsert({ ...item, user_id: window.currentUser.id, synced: true });
            if (!error) {
                item.synced = true;
                await saveToLocal('food_entries', [item]);
            }
        }
    }
    for (let item of localActivity) {
        if (!item.synced) {
            const { error } = await window.supabaseClient.from('activity_entries').upsert({ ...item, user_id: window.currentUser.id, synced: true });
            if (!error) {
                item.synced = true;
                await saveToLocal('activity_entries', [item]);
            }
        }
    }
}

async function syncProducts() {
    if (!window.supabaseClient) return;
    try {
        const { data, error } = await window.supabaseClient.from('products').select('*');
        if (!error && data && data.length) {
            await clearProductsCache();
            await saveProductsToLocal(data);
        }
    } catch (e) {
        console.warn('Ошибка синхронизации продуктов:', e);
    }
}

async function handleRemoteChange(payload) {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const newItem = payload.new;
        await saveToLocal(payload.table, [newItem]);
    }
}