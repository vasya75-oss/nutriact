async function renderAnalytics(container) {
    const foodEntries = await getAllFromLocal('food_entries');
    const activityEntries = await getAllFromLocal('activity_entries');
    const last7Days = getLastNDays(7);
    const caloriesPerDay = {};
    let maxCalories = 0;
    for (let day of last7Days) {
        const foodCal = foodEntries.filter(f => f.date === day).reduce((sum, f) => sum + f.calories, 0);
        const activityCal = activityEntries.filter(a => a.date === day && a.calories_burned).reduce((sum, a) => sum + a.calories_burned, 0);
        const net = foodCal - activityCal;
        caloriesPerDay[day] = net;
        if (net > maxCalories) maxCalories = net;
    }
    if (maxCalories === 0) maxCalories = 1;
    const chartHtml = `
        <div style="text-align: center; margin-bottom: 1rem;">
            <h3>Чистые калории за последние 7 дней</h3>
            <p style="font-size: 0.9rem; color: #aaa;">(еда − активность)</p>
        </div>
        <canvas id="caloriesChart" width="600" height="300" style="width:100%; max-width:600px; height:auto; margin:0 auto;"></canvas>
    `;
    container.innerHTML = `<div class="page"><h2>Аналитика</h2><div class="card">${chartHtml}</div></div>`;
    const canvas = document.getElementById('caloriesChart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width, height = canvas.height;
        ctx.clearRect(0, 0, width, height);
        const barWidth = (width - 80) / last7Days.length - 10;
        const startX = 50;
        for (let i = 0; i < last7Days.length; i++) {
            const day = last7Days[i];
            const net = caloriesPerDay[day] || 0;
            const barHeight = (net / maxCalories) * (height - 60);
            const x = startX + i * (barWidth + 15);
            const y = height - 40 - barHeight;
            ctx.fillStyle = net >= 0 ? '#4CAF50' : '#ff4444';
            ctx.fillRect(x, y, barWidth, barHeight);
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.fillText(day.slice(5), x + barWidth/2 - 15, height - 20);
            ctx.fillText(Math.round(net), x + barWidth/2 - 10, y - 5);
        }
        ctx.fillStyle = '#aaa';
        ctx.fillText('Дата', width/2 - 20, height - 5);
        ctx.save();
        ctx.translate(20, height/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillText('Калории (нетто)', -20, 0);
        ctx.restore();
    }
}
function getLastNDays(n) {
    const days = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
}