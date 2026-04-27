let syncInterval;
async function initSync() {
    console.log('Инициализация синхронизации...');
    await loadRemoteData();
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
async function loadRemoteData() {
    if (!window.supabaseClient || !window.currentUser) return;
    try {
        const { data: foodData } = await window.supabaseClient.from('food_entries').select('*').eq('user_id', window.currentUser.id);
        if (foodData) { await clearStore('food_entries'); await saveToLocal('food_entries', foodData); }
        const { data: activityData } = await window.supabaseClient.from('activity_entries').select('*').eq('user_id', window.currentUser.id);
        if (activityData) { await clearStore('activity_entries'); await saveToLocal('activity_entries', activityData); }
        if (window.refreshDashboard) window.refreshDashboard();
    } catch(e) { console.warn(e); }
}
async function syncFromLocalToRemote() {
    if (!window.supabaseClient || !window.currentUser) return;
    const foodEntries = await getAllFromLocal('food_entries');
    const activityEntries = await getAllFromLocal('activity_entries');
    for (let item of foodEntries) {
        if (!item.synced) {
            const payload = { ...item, user_id: window.currentUser.id, synced: true };
            delete payload.id;
            const { error } = await window.supabaseClient.from('food_entries').upsert(payload);
            if (!error) { item.synced = true; await saveToLocal('food_entries', [item]); }
        }
    }
    for (let item of activityEntries) {
        if (!item.synced) {
            const payload = { ...item, user_id: window.currentUser.id, synced: true };
            delete payload.id;
            const { error } = await window.supabaseClient.from('activity_entries').upsert(payload);
            if (!error) { item.synced = true; await saveToLocal('activity_entries', [item]); }
        }
    }
}
async function syncProducts() {
    if (!window.supabaseClient) return;
    try {
        const { data } = await window.supabaseClient.from('products').select('*');
        if (data && data.length) { await clearProductsCache(); await saveProductsToLocal(data); }
    } catch(e) {}
}
async function handleRemoteChange(payload) {
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (payload.new.user_id === window.currentUser?.id) {
            await saveToLocal(payload.table, [payload.new]);
            if (window.refreshDashboard) window.refreshDashboard();
        }
    }
}