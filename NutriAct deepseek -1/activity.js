async function addActivityEntry(name, caloriesBurned) {
    if (!window.currentUser) { alert('Ошибка: пользователь не авторизован'); return; }
    const entry = {
        name, calories_burned: caloriesBurned,
        date: new Date().toISOString().split('T')[0],
        user_id: window.currentUser.id,
        synced: false
    };
    try {
        await saveToLocal('activity_entries', [entry]);
        await syncFromLocalToRemote();
        alert('Активность добавлена');
        location.reload();
    } catch (err) { alert('Ошибка сохранения: ' + err.message); }
}
async function addWaterEntry(amount) {
    if (!window.currentUser) return;
    const entry = {
        name: 'Вода', water_ml: amount,
        date: new Date().toISOString().split('T')[0],
        user_id: window.currentUser.id,
        synced: false
    };
    try {
        await saveToLocal('activity_entries', [entry]);
        await syncFromLocalToRemote();
        alert('Вода добавлена');
        location.reload();
    } catch (err) { alert('Ошибка сохранения: ' + err.message); }
}
async function renderRecentActivities() {
    const activities = await getAllFromLocal('activity_entries');
    const today = new Date().toISOString().split('T')[0];
    const todayActivities = activities.filter(a => a.date === today && !a.water_ml);
    const container = document.getElementById('recentActivities');
    if (container) {
        container.innerHTML = `<h3>Сегодняшние тренировки</h3>` + todayActivities.map(a => `
            <div class="activity-item">
                <span>${a.name}: ${a.calories_burned} ккал</span>
                <button class="delete-btn" data-type="activity_entries" data-id="${a.id}">🗑️</button>
            </div>
        `).join('');
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
}
async function renderWaterProgress() {
    const activities = await getAllFromLocal('activity_entries');
    const today = new Date().toISOString().split('T')[0];
    const waterToday = activities.filter(a => a.date === today && a.water_ml).reduce((sum, a) => sum + a.water_ml, 0);
    const goal = (await getUserSettings()).dailyWaterGoal || 2000;
    const percent = Math.min(100, (waterToday / goal) * 100);
    const container = document.getElementById('waterProgress');
    if (container) {
        container.innerHTML = `<div>Вода: ${waterToday} / ${goal} мл</div><div class="macro-bar"><div style="width:${percent}%; background:#2196F3; height:8px;"></div></div>`;
    }
}
function renderActivityPage(container) {
    container.innerHTML = `
        <div class="page">
            <h2>Активность и вода</h2>
            <div class="card">
                <h3>Добавить тренировку</h3>
                <input type="text" id="activityName" placeholder="Название"><br>
                <input type="number" id="caloriesBurned" placeholder="Сожжено ккал"><br>
                <button id="addActivityBtn" class="primary">Добавить</button>
            </div>
            <div class="card">
                <h3>Вода</h3>
                <input type="number" id="waterAmount" placeholder="Количество мл"><br>
                <button id="addWaterBtn">Выпить</button>
                <div id="waterProgress"></div>
            </div>
            <div id="recentActivities"></div>
        </div>
    `;
    document.getElementById('addActivityBtn').addEventListener('click', async () => {
        const name = document.getElementById('activityName').value;
        const calories = parseFloat(document.getElementById('caloriesBurned').value);
        if (!name || isNaN(calories)) return;
        await addActivityEntry(name, calories);
        await renderRecentActivities();
    });
    document.getElementById('addWaterBtn').addEventListener('click', async () => {
        const amount = parseFloat(document.getElementById('waterAmount').value);
        if (isNaN(amount)) return;
        await addWaterEntry(amount);
        await renderWaterProgress();
    });
    renderRecentActivities();
    renderWaterProgress();
}