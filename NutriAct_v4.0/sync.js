// sync.js — полная синхронизация (загрузка, отправка, realtime)
let syncInterval;

async function initSync() {
    console.log('Инициализация синхронизации...');
    await loadRemoteData();          // 1. Загружаем все данные с сервера
    await syncFromLocalToRemote();   // 2. Отправляем локальные неподтверждённые
    await syncProducts();            // 3. Синхронизируем продукты

    if (window.supabaseClient) {
        // Подписка на изменения в реальном времени
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

// Загрузка всех записей пользователя с сервера
async function loadRemoteData() {
    if (!window.supabaseClient || !window.currentUser) return;
    console.log('Загрузка данных с сервера...');
    try {
        // Загрузка приёмов пищи
        const { data: foodData, error: foodError } = await window.supabaseClient
            .from('food_entries')
            .select('*')
            .eq('user_id', window.currentUser.id);
        if (!foodError && foodData) {
            await clearStore('food_entries');
            await saveToLocal('food_entries', foodData);
            console.log('Загружено записей еды:', foodData.length);
        } else if (foodError) {
            console.error('Ошибка загрузки еды:', foodError);
        }

        // Загрузка активности
        const { data: activityData, error: activityError } = await window.supabaseClient
            .from('activity_entries')
            .select('*')
            .eq('user_id', window.currentUser.id);
        if (!activityError && activityData) {
            await clearStore('activity_entries');
            await saveToLocal('activity_entries', activityData);
            console.log('Загружено записей активности:', activityData.length);
        } else if (activityError) {
            console.error('Ошибка загрузки активности:', activityError);
        }

        // Обновляем главную страницу
        if (window.refreshDashboard) window.refreshDashboard();
    } catch (e) {
        console.warn('Ошибка загрузки данных с сервера:', e);
    }
}

async function syncFromLocalToRemote() {
    if (!window.supabaseClient || !window.currentUser) {
        console.log('syncFromLocalToRemote: нет клиента или пользователя');
        return;
    }
    console.log('Синхронизация локальных данных...');

    const foodEntries = await getAllFromLocal('food_entries');
    const activityEntries = await getAllFromLocal('activity_entries');

    console.log('Еда локально:', foodEntries.length);
    console.log('Активность локально:', activityEntries.length);

    for (let item of foodEntries) {
        if (!item.synced) {
            console.log('Отправка еды:', item.name);
            const payload = {
                name: item.name,
                weight: item.weight,
                calories: item.calories,
                protein: item.protein,
                fat: item.fat,
                carbs: item.carbs,
                date: item.date,
                user_id: window.currentUser.id,
                synced: true
            };
            const { error } = await window.supabaseClient.from('food_entries').upsert(payload);
            if (!error) {
                item.synced = true;
                await saveToLocal('food_entries', [item]);
                console.log('Еда отправлена успешно');
            } else {
                console.error('Ошибка отправки еды:', error);
            }
        }
    }

    for (let item of activityEntries) {
        if (!item.synced) {
            console.log('Отправка активности:', item.name);
            const payload = {
                name: item.name,
                calories_burned: item.calories_burned,
                water_ml: item.water_ml,
                date: item.date,
                user_id: window.currentUser.id,
                synced: true
            };
            const { error } = await window.supabaseClient.from('activity_entries').upsert(payload);
            if (!error) {
                item.synced = true;
                await saveToLocal('activity_entries', [item]);
                console.log('Активность отправлена успешно');
            } else {
                console.error('Ошибка отправки активности:', error);
            }
        }
    }
}

async function syncProducts() {
    if (!window.supabaseClient) return;
    try {
        const { data, error } = await window.supabaseClient.from('products').select('*');
        if (!error && data && data.length) {
            await clearStore('products');
            await saveToLocal('products', data);
            console.log('Продукты синхронизированы, загружено:', data.length);
        }
    } catch (e) {
        console.warn('Ошибка синхронизации продуктов:', e);
    }
}

async function handleRemoteChange(payload) {
    console.log('Получено изменение от сервера:', payload);
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const newItem = payload.new;
        // Проверяем, что запись принадлежит текущему пользователю
        if (newItem.user_id === window.currentUser?.id) {
            await saveToLocal(payload.table, [newItem]);
            if (window.refreshDashboard) window.refreshDashboard();
        }
    }
}