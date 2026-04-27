async function renderProfile(container) {
    const settings = await getUserSettings();
    container.innerHTML = `
        <div class="page">
            <h2>Профиль и настройки</h2>
            <div class="card">
                <h3>Цели</h3>
                <label>Дневная норма калорий: <input type="number" id="dailyCalorieGoal" value="${settings.dailyCalorieGoal || 2000}"></label><br>
                <label>Дневная норма воды (мл): <input type="number" id="dailyWaterGoal" value="${settings.dailyWaterGoal || 2000}"></label><br>
                <button id="saveGoalsBtn">Сохранить цели</button>
            </div>
            <div class="card">
                <h3>API настройки</h3>
                <label>Supabase URL: <input type="text" id="supabaseUrl" value="${settings.supabaseUrl || ''}" style="width:100%"></label><br>
                <label>Supabase Anon Key: <input type="text" id="supabaseAnonKey" value="${settings.supabaseAnonKey || ''}" style="width:100%"></label><br>
                <label>Gemini API Key: <input type="text" id="geminiApiKey" value="${settings.geminiApiKey || ''}" style="width:100%"></label><br>
                <label>Yandex SpeechKit API Key: <input type="text" id="yandexApiKey" value="${settings.yandexApiKey || ''}" style="width:100%"></label><br>
                <button id="saveApiBtn">Сохранить API</button>
            </div>
            <div class="card">
                <h3>Экспорт данных</h3>
                <button id="exportFoodBtn">Экспорт питания (CSV)</button>
                <button id="exportActivityBtn">Экспорт активности (CSV)</button>
            </div>
        </div>
    `;
    document.getElementById('saveGoalsBtn').addEventListener('click', async () => {
        const dailyCalorieGoal = parseFloat(document.getElementById('dailyCalorieGoal').value);
        const dailyWaterGoal = parseFloat(document.getElementById('dailyWaterGoal').value);
        await saveUserSettings({ dailyCalorieGoal, dailyWaterGoal });
        alert('Цели сохранены');
    });
    document.getElementById('saveApiBtn').addEventListener('click', async () => {
        const supabaseUrl = document.getElementById('supabaseUrl').value;
        const supabaseAnonKey = document.getElementById('supabaseAnonKey').value;
        const geminiApiKey = document.getElementById('geminiApiKey').value;
        const yandexApiKey = document.getElementById('yandexApiKey').value;
        await saveUserSettings({ supabaseUrl, supabaseAnonKey, geminiApiKey, yandexApiKey });
        alert('API ключи сохранены. Перезагрузите страницу.');
    });
    document.getElementById('exportFoodBtn').addEventListener('click', async () => {
        const entries = await getAllFromLocal('food_entries');
        const csv = convertToCSV(entries);
        downloadCSV(csv, 'food_entries.csv');
    });
    document.getElementById('exportActivityBtn').addEventListener('click', async () => {
        const entries = await getAllFromLocal('activity_entries');
        const csv = convertToCSV(entries);
        downloadCSV(csv, 'activity_entries.csv');
    });
}

function convertToCSV(data) {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(header => JSON.stringify(obj[header] || '')).join(','));
    return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}