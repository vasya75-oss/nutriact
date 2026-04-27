// Статическая база продуктов
const STATIC_PRODUCTS = [
    { name: 'Яблоко', calories_per_100g: 52, protein_per_100g: 0.3, fat_per_100g: 0.2, carbs_per_100g: 14 },
    { name: 'Куриная грудка', calories_per_100g: 165, protein_per_100g: 31, fat_per_100g: 3.6, carbs_per_100g: 0 },
    { name: 'Рис отварной', calories_per_100g: 130, protein_per_100g: 2.7, fat_per_100g: 0.3, carbs_per_100g: 28 },
    { name: 'Овсянка', calories_per_100g: 68, protein_per_100g: 2.4, fat_per_100g: 1.4, carbs_per_100g: 12 },
    { name: 'Хлеб', calories_per_100g: 265, protein_per_100g: 9, fat_per_100g: 3.2, carbs_per_100g: 49 },
    { name: 'Котлета домашняя', calories_per_100g: 240, protein_per_100g: 18, fat_per_100g: 18, carbs_per_100g: 10 },
    { name: 'Котлеты домашние', calories_per_100g: 240, protein_per_100g: 18, fat_per_100g: 18, carbs_per_100g: 10 },
    { name: 'Пюре картофельное', calories_per_100g: 110, protein_per_100g: 2, fat_per_100g: 5, carbs_per_100g: 15 },
    { name: 'Макароны', calories_per_100g: 158, protein_per_100g: 5.8, fat_per_100g: 0.9, carbs_per_100g: 30 },
    { name: 'Гречка', calories_per_100g: 110, protein_per_100g: 3.4, fat_per_100g: 1.2, carbs_per_100g: 21 }
];

async function searchProducts(query) {
    query = query.toLowerCase().trim();
    if (!query) return [];
    if (window.supabaseClient && navigator.onLine) {
        try {
            const { data } = await window.supabaseClient.from('products').select('*').ilike('name', `%${query}%`).limit(20);
            if (data && data.length) { await saveProductsToLocal(data); return data; }
        } catch(e) {}
    }
    const localProducts = await getAllProductsLocal();
    if (localProducts.length) {
        const filtered = localProducts.filter(p => p.name.toLowerCase().includes(query));
        if (filtered.length) return filtered;
    }
    return STATIC_PRODUCTS.filter(p => p.name.toLowerCase().includes(query));
}

async function addFoodEntryWithWeight(name, weight, caloriesPer100g, proteinPer100g = 0, fatPer100g = 0, carbsPer100g = 0) {
    if (!window.currentUser) { alert('Ошибка: пользователь не авторизован'); return; }
    const factor = weight / 100;
    const calories = Math.round(caloriesPer100g * factor);
    const protein = proteinPer100g * factor;
    const fat = fatPer100g * factor;
    const carbs = carbsPer100g * factor;
    const entry = {
        name, weight, calories, protein, fat, carbs,
        date: new Date().toISOString().split('T')[0],
        user_id: window.currentUser.id,
        synced: false
    };
    try {
        await saveToLocal('food_entries', [entry]);
        await syncFromLocalToRemote();
        alert(`Добавлено: ${name} (${weight} г) — ${calories} ккал`);
        location.reload();
    } catch (err) { alert('Ошибка сохранения: ' + err.message); }
}

async function processVoiceText(text) {
    const resultDiv = document.getElementById('voiceResult');
    resultDiv.innerHTML = `Распознано: ${text}`;
    const settings = await getUserSettings();
    const deepseekKey = settings.deepseekApiKey;
    let items = null;
    if (deepseekKey && deepseekKey.trim()) {
        resultDiv.innerHTML += '<br>🔍 Анализируем через Deepseek...';
        items = await parseWithDeepseek(text, deepseekKey);
        if (items && items.length) resultDiv.innerHTML += '<br>✅ Deepseek распознал продукты.';
        else resultDiv.innerHTML += '<br>⚠️ Deepseek не дал результата, используем встроенный парсер.';
    }
    if (!items || !items.length) {
        items = parseVoiceText(text);
    }
    console.log('Parsed items:', items);
    if (items.length === 0) {
        resultDiv.innerHTML += '<br>⚠️ Не удалось распознать продукты.';
        return;
    }
    let addedCount = 0, notFound = [];
    for (let item of items) {
        const productName = item.name || item.productName;
        let weight = item.weight;
        let caloriesPer100g = item.calories_per_100g;
        let product = null;
        if (!caloriesPer100g) {
            const products = await searchProducts(productName);
            if (products.length) product = products[0];
        }
        if (!product && !caloriesPer100g) { notFound.push(productName); continue; }
        if (!weight) {
            const userWeight = prompt(`Сколько грамм ${productName}?`, '100');
            if (!userWeight) { notFound.push(`${productName} (вес не указан)`); continue; }
            weight = parseFloat(userWeight);
            if (isNaN(weight) || weight <= 0) { notFound.push(`${productName} (некорректный вес)`); continue; }
        }
        const finalCalories = caloriesPer100g || product.calories_per_100g;
        const finalProtein = product ? product.protein_per_100g : 0;
        const finalFat = product ? product.fat_per_100g : 0;
        const finalCarbs = product ? product.carbs_per_100g : 0;
        await addFoodEntryWithWeight(productName, weight, finalCalories, finalProtein, finalFat, finalCarbs);
        addedCount++;
        resultDiv.innerHTML += `<br>✅ Добавлено: ${productName} (${weight} г)`;
    }
    if (notFound.length) resultDiv.innerHTML += `<br>⚠️ Не найдены: ${notFound.join(', ')}`;
    if (addedCount === 0 && notFound.length) resultDiv.innerHTML += '<br>Ничего не добавлено.';
}

function parseVoiceText(text) {
    const items = [];
    const separators = /[,;+и]\s*/i;
    const parts = text.split(separators).map(s => s.trim()).filter(s => s);
    for (let part of parts) {
        const weightMatch = part.match(/(\d+(?:[.,]\d+)?)\s*(гр?|грамм|г)/i);
        if (weightMatch) {
            const weight = parseFloat(weightMatch[1].replace(',', '.'));
            const productName = part.substring(0, weightMatch.index).trim();
            if (productName && !isNaN(weight)) items.push({ productName, weight });
        } else {
            items.push({ productName: part, weight: null });
        }
    }
    if (items.length === 0 && text.trim()) {
        const weightMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(гр?|грамм|г)/i);
        if (weightMatch) {
            const weight = parseFloat(weightMatch[1].replace(',', '.'));
            const productName = text.substring(0, weightMatch.index).trim();
            if (productName) items.push({ productName, weight });
            else items.push({ productName: text, weight: null });
        } else {
            items.push({ productName: text, weight: null });
        }
    }
    return items;
}

function startWebSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Голосовой ввод не поддерживается в этом браузере'); return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalText = '';
    const resultDiv = document.getElementById('voiceResult');
    resultDiv.innerHTML = '🎤 Слушаю... (говорите, после паузы будет добавлено)';
    recognition.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalText += transcript + ' ';
            else interim += transcript;
        }
        resultDiv.innerHTML = `🎤 Распознаётся: ${finalText}${interim}`;
    };
    recognition.onerror = (event) => { resultDiv.innerHTML = `❌ Ошибка распознавания: ${event.error}`; };
    recognition.onend = async () => {
        resultDiv.innerHTML = `🎤 Обработка: ${finalText}`;
        if (finalText.trim()) await processVoiceText(finalText.trim());
        else resultDiv.innerHTML = '🎤 Ничего не распознано. Попробуйте ещё раз.';
    };
    recognition.start();
}

function renderFoodPage(container) {
    container.innerHTML = `
        <div class="page">
            <h2>Добавить приём пищи</h2>
            <div class="card">
                <h3>🔍 Поиск продукта</h3>
                <input type="text" id="searchInput" placeholder="Начните вводить название...">
                <div id="searchResults"></div>
            </div>
            <div class="card">
                <h3>✏️ Ручной ввод</h3>
                <input type="text" id="foodName" placeholder="Название"><br>
                <input type="number" id="foodWeight" placeholder="Вес (г)"><br>
                <input type="number" id="foodCalories" placeholder="Калории на 100г"><br>
                <button id="manualAddBtn" class="primary">Добавить</button>
            </div>
            <div class="card">
                <h3>🎤 Голосовой ввод (Deepseek)</h3>
                <button id="voiceBtn">🎤 Голос</button>
                <div id="voiceResult"></div>
            </div>
        </div>
    `;
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('searchResults');
    let timeoutId;
    searchInput.addEventListener('input', async (e) => {
        clearTimeout(timeoutId);
        const query = e.target.value;
        if (query.length < 2) { resultsDiv.innerHTML = ''; return; }
        timeoutId = setTimeout(async () => {
            const products = await searchProducts(query);
            resultsDiv.innerHTML = products.map(p => `
                <div class="food-item" data-name="${p.name}" data-calories="${p.calories_per_100g}" 
                     data-protein="${p.protein_per_100g || 0}" data-fat="${p.fat_per_100g || 0}" 
                     data-carbs="${p.carbs_per_100g || 0}">
                    <span>${p.name} (${p.calories_per_100g} ккал/100г)</span>
                    <div>
                        <input type="number" placeholder="Вес (г)" class="product-weight" style="width:80px;">
                        <button class="add-food-btn">+</button>
                    </div>
                </div>
            `).join('');
            document.querySelectorAll('.add-food-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const item = e.target.closest('.food-item');
                    const name = item.dataset.name;
                    const caloriesPer100g = parseFloat(item.dataset.calories);
                    const proteinPer100g = parseFloat(item.dataset.protein);
                    const fatPer100g = parseFloat(item.dataset.fat);
                    const carbsPer100g = parseFloat(item.dataset.carbs);
                    const weightInput = item.querySelector('.product-weight');
                    let weight = parseFloat(weightInput.value);
                    if (isNaN(weight) || weight <= 0) { alert('Введите вес в граммах'); return; }
                    addFoodEntryWithWeight(name, weight, caloriesPer100g, proteinPer100g, fatPer100g, carbsPer100g);
                });
            });
        }, 300);
    });
    document.getElementById('manualAddBtn').addEventListener('click', () => {
        const name = document.getElementById('foodName').value;
        const weight = parseFloat(document.getElementById('foodWeight').value);
        const caloriesPer100g = parseFloat(document.getElementById('foodCalories').value);
        if (!name || isNaN(weight) || isNaN(caloriesPer100g)) { alert('Заполните все поля'); return; }
        addFoodEntryWithWeight(name, weight, caloriesPer100g);
    });
    document.getElementById('voiceBtn').addEventListener('click', startWebSpeechRecognition);
}
window.renderFoodPage = renderFoodPage;