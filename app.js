// app.js — полная версия с удалением и БЖУ
window.currentUser = null;
window.supabaseClient = null;

async function initApp() {
    const settings = await getUserSettings();
    const hasKeys = settings.supabaseUrl && settings.supabaseAnonKey;
    if (!hasKeys) { renderApiSetup(); return; }
    const { user, client } = await checkAuth();
    window.currentUser = user;
    window.supabaseClient = client;
    if (user) {
        document.getElementById('logoutBtn').style.display = 'block';
        await initSync();
        renderPage('dashboard');
    } else {
        document.getElementById('logoutBtn').style.display = 'none';
        renderAuthForm();
    }
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.dataset.page;
            if (window.currentUser && page) renderPage(page);
            else if (!window.currentUser) renderAuthForm();
        });
    });
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (window.supabaseClient) await window.supabaseClient.auth.signOut();
        window.currentUser = null;
        window.supabaseClient = null;
        renderAuthForm();
        document.getElementById('logoutBtn').style.display = 'none';
    });
}

function renderApiSetup() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="card" style="max-width: 500px; margin: 2rem auto;">
            <h2>Настройка подключения</h2>
            <p>Введите данные вашего проекта Supabase.</p>
            <label>Supabase URL:</label>
            <input type="text" id="setupSupabaseUrl" placeholder="https://xxxxx.supabase.co" style="width:100%"><br>
            <label>Supabase Anon Key:</label>
            <input type="text" id="setupSupabaseKey" placeholder="eyJ... или sb_publishable_..." style="width:100%"><br>
            <button id="saveSetupBtn" class="primary">Сохранить</button>
            <div id="setupMessage"></div>
        </div>
    `;
    document.getElementById('saveSetupBtn').addEventListener('click', async () => {
        const url = document.getElementById('setupSupabaseUrl').value.trim();
        const key = document.getElementById('setupSupabaseKey').value.trim();
        if (!url || !key) { showMessage('setupMessage', 'Заполните оба поля', 'error'); return; }
        await saveUserSettings({ supabaseUrl: url, supabaseAnonKey: key });
        showMessage('setupMessage', 'Ключи сохранены. Перезагружаем...', 'success');
        setTimeout(() => location.reload(), 1500);
    });
}

function renderPage(page) {
    const content = document.getElementById('pageContent');
    switch(page) {
        case 'dashboard': renderDashboard(content); break;
        case 'food': renderFoodPage(content); break;
        case 'diary': renderDiary(content); break;
        case 'activity': renderActivityPage(content); break;
        case 'analytics': renderAnalytics(content); break;
        case 'profile': renderProfile(content); break;
        default: renderDashboard(content);
    }
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });
}

function renderAuthForm() {
    const content = document.getElementById('pageContent');
    content.innerHTML = `
        <div class="card" style="max-width: 400px; margin: 2rem auto;">
            <h2>Вход / Регистрация</h2>
            <form id="authForm">
                <input type="email" id="email" placeholder="Email" required><br>
                <input type="password" id="password" placeholder="Пароль" required><br>
                <button type="submit" class="primary">Войти</button>
                <button type="button" id="registerBtn">Зарегистрироваться</button>
            </form>
            <div id="authMessage"></div>
        </div>
    `;
    document.getElementById('authForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const { error } = await signIn(email, password);
        if (error) showMessage('authMessage', error.message, 'error');
        else location.reload();
    });
    document.getElementById('registerBtn').addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const { error } = await signUp(email, password);
        if (error) showMessage('authMessage', error.message, 'error');
        else showMessage('authMessage', 'Проверьте почту для подтверждения', 'success');
    });
}

async function renderDashboard(container) {
    const today = new Date().toISOString().split('T')[0];
    const foodEntries = await getAllFromLocal('food_entries');
    const activityEntries = await getAllFromLocal('activity_entries');
    const settings = await getUserSettings();
    const calorieGoal = settings.dailyCalorieGoal || 2000;
    const waterGoal = settings.dailyWaterGoal || 2000;
    const todayFood = foodEntries.filter(e => e.date === today);
    const todayActivity = activityEntries.filter(e => e.date === today);
    const totalCalories = todayFood.reduce((s, e) => s + (e.calories || 0), 0);
    const burnedCalories = todayActivity.reduce((s, e) => s + (e.calories_burned || 0), 0);
    const waterMl = todayActivity.reduce((s, e) => s + (e.water_ml || 0), 0);
    const netCalories = totalCalories - burnedCalories;
    const percent = Math.min(100, Math.max(0, (netCalories / calorieGoal) * 100));
    const protein = todayFood.reduce((s, e) => s + (e.protein || 0), 0);
    const fat = todayFood.reduce((s, e) => s + (e.fat || 0), 0);
    const carbs = todayFood.reduce((s, e) => s + (e.carbs || 0), 0);
    const totalMacro = protein + fat + carbs || 1;
    const radius = 90;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - percent / 100);
    container.innerHTML = `
        <div class="page">
            <div class="card" style="text-align:center">
                <div class="calorie-circle">
                    <div class="calorie-value">${Math.round(netCalories)}</div>
                    <div class="calorie-label">из ${calorieGoal} ккал</div>
                    <svg class="progress-ring" width="192" height="192" viewBox="0 0 192 192">
                        <circle cx="96" cy="96" r="${radius}" fill="none" stroke="#2c2c2c" stroke-width="12"/>
                        <circle cx="96" cy="96" r="${radius}" fill="none" stroke="#4CAF50" stroke-width="12"
                                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
                                stroke-linecap="round" transform="rotate(-90 96 96)"/>
                    </svg>
                </div>
                <div class="macro-bar">
                    <div class="macro-protein" style="width:${(protein/totalMacro)*100}%"></div>
                    <div class="macro-fat" style="width:${(fat/totalMacro)*100}%"></div>
                    <div class="macro-carbs" style="width:${(carbs/totalMacro)*100}%"></div>
                </div>
                <div>🥩 ${Math.round(protein)}г | 🧈 ${Math.round(fat)}г | 🍚 ${Math.round(carbs)}г</div>
            </div>
            <div class="grid-2">
                <div class="card">
                    <h3>🍽️ Приёмы пищи сегодня</h3>
                    ${todayFood.map(f => `
                        <div class="food-item">
                            <span>${f.name} — ${f.calories} ккал (${f.weight}г)</span>
                            <button class="delete-btn" data-type="food_entries" data-id="${f.id}">🗑️</button>
                        </div>
                    `).join('') || '<div>Нет записей</div>'}
                </div>
                <div class="card">
                    <h3>🏃 Активность</h3>
                    ${todayActivity.filter(a => a.calories_burned).map(a => `
                        <div class="activity-item">
                            <span>${a.name} — ${a.calories_burned} ккал</span>
                            <button class="delete-btn" data-type="activity_entries" data-id="${a.id}">🗑️</button>
                        </div>
                    `).join('') || '<div>Нет активности</div>'}
                    <h3>💧 Вода</h3>
                    ${todayActivity.filter(a => a.water_ml).map(a => `
                        <div class="activity-item">
                            <span>💧 ${a.water_ml} мл</span>
                            <button class="delete-btn" data-type="activity_entries" data-id="${a.id}">🗑️</button>
                        </div>
                    `).join('') || '<div>Нет записей воды</div>'}
                    <div>${waterMl} / ${waterGoal} мл</div>
                    <div class="macro-bar"><div style="width:${Math.min(100, (waterMl/waterGoal)*100)}%; background:#2196F3; height:8px;"></div></div>
                </div>
            </div>
        </div>
    `;
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const type = btn.dataset.type;
            const id = parseInt(btn.dataset.id);
            if (confirm('Удалить запись?')) {
                await deleteEntry(type, id);
            }
        });
    });
}

async function renderDiary(container) {
    const foodEntries = await getAllFromLocal('food_entries');
    const activityEntries = await getAllFromLocal('activity_entries');
    const allDates = [...new Set([...foodEntries.map(e => e.date), ...activityEntries.map(e => e.date)])].sort().reverse();
    let html = `<div class="page"><h2>Дневник</h2>`;
    for (let date of allDates) {
        const foods = foodEntries.filter(e => e.date === date);
        const activities = activityEntries.filter(e => e.date === date);
        const totalFood = foods.reduce((s, e) => s + e.calories, 0);
        const totalBurn = activities.reduce((s, e) => s + (e.calories_burned || 0), 0);
        const totalWater = activities.reduce((s, e) => s + (e.water_ml || 0), 0);
        html += `
            <div class="card">
                <h3>${date}</h3>
                <div><strong>🍽️ Еда:</strong> ${totalFood} ккал</div>
                <div><strong>🏃 Активность:</strong> ${totalBurn} ккал</div>
                <div><strong>💧 Вода:</strong> ${totalWater} мл</div>
                <details>
                    <summary>Подробно</summary>
                    ${foods.map(f => `<div>${f.name} — ${f.calories} ккал (${f.weight}г) <button class="delete-btn" data-type="food_entries" data-id="${f.id}">🗑️</button></div>`).join('')}
                    ${activities.filter(a => a.calories_burned).map(a => `<div>${a.name} — ${a.calories_burned} ккал <button class="delete-btn" data-type="activity_entries" data-id="${a.id}">🗑️</button></div>`).join('')}
                    ${activities.filter(a => a.water_ml).map(a => `<div>💧 ${a.water_ml} мл <button class="delete-btn" data-type="activity_entries" data-id="${a.id}">🗑️</button></div>`).join('')}
                </details>
            </div>
        `;
    }
    if (allDates.length === 0) html += `<div class="card">Нет записей</div>`;
    html += `</div>`;
    container.innerHTML = html;
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const type = btn.dataset.type;
            const id = parseInt(btn.dataset.id);
            if (confirm('Удалить запись?')) {
                await deleteEntry(type, id);
            }
        });
    });
}

function showMessage(containerId, text, type) {
    const div = document.getElementById(containerId);
    if (div) div.innerHTML = `<div style="color:${type === 'error' ? '#ff8888' : '#88ff88'}">${text}</div>`;
    setTimeout(() => { if(div) div.innerHTML = ''; }, 3000);
}

window.renderPage = renderPage;
window.refreshDashboard = () => renderPage('dashboard');
initApp();