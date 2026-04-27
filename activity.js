let currentActivityRecognition = null;

async function addActivityEntry(name, caloriesBurned) { /* как раньше */ }
async function addWaterEntry(amount) { /* как раньше */ }
async function renderRecentActivities() { /* как раньше */ }
async function renderWaterProgress() { /* как раньше */ }

function parseActivityText(text) {
    const lower = text.toLowerCase();
    if (lower.includes('вода') || lower.includes('воды') || lower.includes('выпил')) {
        let mlMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(мл|миллилитр|литр|л)/i);
        if (mlMatch) {
            let amount = parseFloat(mlMatch[1].replace(',', '.'));
            if (mlMatch[2].toLowerCase() === 'литр' || mlMatch[2].toLowerCase() === 'л') amount *= 1000;
            return { type: 'water', water: amount };
        } else {
            const numMatch = text.match(/(\d+(?:[.,]\d+)?)/);
            if (numMatch) return { type: 'water', water: parseFloat(numMatch[1].replace(',', '.')) };
        }
    }
    let kcalMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(ккал|калорий|калории)/i);
    let calories = null;
    if (kcalMatch) calories = parseFloat(kcalMatch[1].replace(',', '.'));
    else {
        const numMatch = text.match(/(\d+(?:[.,]\d+)?)/);
        if (numMatch && !lower.includes('вода')) calories = parseFloat(numMatch[1].replace(',', '.'));
    }
    let words = text.split(/\s+/);
    let nameWords = [];
    for (let w of words) {
        if (!w.match(/\d/) && !w.match(/(ккал|калорий|минут|час|км)/i) && nameWords.length < 3) {
            nameWords.push(w);
        }
    }
    let name = nameWords.join(' ') || 'тренировка';
    if (calories === null) return { type: 'error', message: 'Не удалось определить калории. Скажите, например: "бег 300 ккал"' };
    return { type: 'activity', name, calories };
}

async function processActivityVoiceText(text) {
    const resultDiv = document.getElementById('activityVoiceResult');
    resultDiv.innerHTML = `Распознано: ${text}`;
    const parsed = parseActivityText(text);
    if (parsed.type === 'water') {
        await addWaterEntry(parsed.water);
    } else if (parsed.type === 'activity') {
        await addActivityEntry(parsed.name, parsed.calories);
    } else {
        resultDiv.innerHTML += `<br>⚠️ ${parsed.message}`;
    }
}

function startActivityVoiceRecognition() {
    if (currentActivityRecognition) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Голосовой ввод не поддерживается'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = true;
    currentActivityRecognition = recognition;
    const resultDiv = document.getElementById('activityVoiceResult');
    const voiceBtn = document.getElementById('activityVoiceBtn');
    resultDiv.innerHTML = '🎤 Слушаю... (нажмите кнопку ещё раз, чтобы остановить)';
    voiceBtn.textContent = '⏹️ Остановить';
    let finalText = '';
    recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalText += transcript + ' ';
            else interim += transcript;
        }
        resultDiv.innerHTML = `🎤 Распознаётся: ${finalText}${interim}`;
    };
    recognition.onerror = (event) => {
        resultDiv.innerHTML = `❌ Ошибка: ${event.error}`;
        currentActivityRecognition = null;
        voiceBtn.textContent = '🎤 Голос (активность)';
    };
    recognition.onend = async () => {
        resultDiv.innerHTML = `🎤 Обработка: ${finalText}`;
        if (finalText.trim()) await processActivityVoiceText(finalText.trim());
        else resultDiv.innerHTML = '🎤 Ничего не распознано.';
        currentActivityRecognition = null;
        voiceBtn.textContent = '🎤 Голос (активность)';
    };
    recognition.start();
}

function stopActivityVoiceRecognition() {
    if (currentActivityRecognition) {
        currentActivityRecognition.stop();
        currentActivityRecognition = null;
        const voiceBtn = document.getElementById('activityVoiceBtn');
        voiceBtn.textContent = '🎤 Голос (активность)';
        document.getElementById('activityVoiceResult').innerHTML = '🎤 Остановлено.';
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
            <div class="card">
                <h3>🎤 Голосовой ввод</h3>
                <button id="activityVoiceBtn" class="primary">🎤 Голос (активность)</button>
                <div id="activityVoiceResult"></div>
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
    const voiceBtn = document.getElementById('activityVoiceBtn');
    voiceBtn.addEventListener('click', () => {
        if (currentActivityRecognition) stopActivityVoiceRecognition();
        else startActivityVoiceRecognition();
    });
    renderRecentActivities();
    renderWaterProgress();
}