// food.js — добавление приёмов пищи (поиск, ручной ввод, голос Yandex/Web Speech)

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
    { name: 'Гречка', calories_per_100g: 110, protein_per_100g: 3.4, fat_per_100g: 1.2, carbs_per_100g: 21 },
    { name: 'Суп', calories_per_100g: 50, protein_per_100g: 2, fat_per_100g: 1.5, carbs_per_100g: 6 },
    { name: 'Салат овощной', calories_per_100g: 40, protein_per_100g: 1, fat_per_100g: 2, carbs_per_100g: 4 },
    { name: 'Йогурт', calories_per_100g: 70, protein_per_100g: 3, fat_per_100g: 1.5, carbs_per_100g: 12 },
    { name: 'Творог', calories_per_100g: 120, protein_per_100g: 18, fat_per_100g: 4, carbs_per_100g: 3 }
];

async function searchProducts(query) {
    query = query.toLowerCase().trim();
    if (!query) return [];

    if (window.supabaseClient && navigator.onLine) {
        try {
            const { data, error } = await window.supabaseClient
                .from('products')
                .select('*')
                .ilike('name', `%${query}%`)
                .limit(20);
            if (!error && data && data.length) {
                await saveProductsToLocal(data);
                return data;
            }
        } catch (e) {
            console.warn('Ошибка запроса продуктов из Supabase:', e);
        }
    }

    const localProducts = await getAllProductsLocal();
    if (localProducts && localProducts.length) {
        const filtered = localProducts.filter(p => p.name.toLowerCase().includes(query));
        if (filtered.length) return filtered;
    }

    return STATIC_PRODUCTS.filter(p => p.name.toLowerCase().includes(query));
}

function parseVoiceText(text) {
    const items = [];
    // Регулярное выражение для поиска веса (число и единица измерения)
    const weightRegex = /(\d+(?:[.,]\d+)?)\s*(гр?|грамм|г)/gi;
    let lastIndex = 0;
    let match;

    // Собираем все совпадения
    const matches = [];
    while ((match = weightRegex.exec(text)) !== null) {
        matches.push({
            start: match.index,
            end: match.index + match[0].length,
            weight: parseFloat(match[1].replace(',', '.')),
            raw: match[0]
        });
    }

    if (matches.length === 0) {
        // Нет веса — пытаемся обработать как один продукт без веса
        items.push({ productName: text.trim(), weight: null });
        return items;
    }

    // Проходим по каждому совпадению, извлекаем продукт от предыдущего конца до начала этого совпадения
    for (let i = 0; i < matches.length; i++) {
        const current = matches[i];
        const start = i === 0 ? 0 : matches[i-1].end;
        const productRaw = text.substring(start, current.start).trim();
        let productName = productRaw;

        // Удаляем возможные союзы в конце названия продукта
        productName = productName.replace(/[,;+и]\s*$/, '').trim();

        if (productName) {
            items.push({
                productName: productName,
                weight: current.weight
            });
        } else {
            // Если название не извлеклось, возможно продукт был указан после веса? Редко, но попробуем взять текст до следующего совпадения
            // В нашем случае не нужно, просто пропускаем
        }
    }

    // Если после последнего продукта остался текст без веса (редко), игнорируем
    return items;
}

async function addFoodEntryWithWeight(name, weight, caloriesPer100g, proteinPer100g = 0, fatPer100g = 0, carbsPer100g = 0) {
    console.log('addFoodEntryWithWeight called', { name, weight, caloriesPer100g });
    if (!window.currentUser) {
        console.error('currentUser not defined');
        alert('Ошибка: пользователь не авторизован');
        return;
    }
    const factor = weight / 100;
    const calories = Math.round(caloriesPer100g * factor);
    const protein = proteinPer100g * factor;
    const fat = fatPer100g * factor;
    const carbs = carbsPer100g * factor;

    const entry = {
        name,
        weight,
        calories,
        protein,
        fat,
        carbs,
        date: new Date().toISOString().split('T')[0],
        user_id: window.currentUser.id,
        synced: false
    };
    try {
        await saveToLocal('food_entries', [entry]);
        console.log('Saved locally');
        await syncFromLocalToRemote();
        alert(`Добавлено: ${name} (${weight} г) — ${calories} ккал`);
        location.reload();
    } catch (err) {
        console.error('Save error:', err);
        alert('Ошибка сохранения: ' + err.message);
    }
}

async function processVoiceText(text) {
    const resultDiv = document.getElementById('voiceResult');
    resultDiv.innerHTML = `Распознано: ${text}`;

    const items = parseVoiceText(text);
    if (items.length === 0) {
        resultDiv.innerHTML += '<br>⚠️ Не удалось распознать продукты. Попробуйте сказать, например: "котлеты 100 грамм, пюре 200 грамм"';
        return;
    }

    let addedCount = 0;
    let notFound = [];

    for (let item of items) {
        const productName = item.productName;
        let weight = item.weight;

        const products = await searchProducts(productName);
        if (!products.length) {
            notFound.push(productName);
            continue;
        }
        const product = products[0];

        if (weight === null) {
            const userWeight = prompt(`Сколько грамм ${product.name}?`, '100');
            if (userWeight === null) {
                notFound.push(`${product.name} (ввод веса отменён)`);
                continue;
            }
            weight = parseFloat(userWeight);
            if (isNaN(weight) || weight <= 0) {
                notFound.push(`${product.name} (некорректный вес)`);
                continue;
            }
        }

        await addFoodEntryWithWeight(
            product.name, weight,
            product.calories_per_100g,
            product.protein_per_100g || 0,
            product.fat_per_100g || 0,
            product.carbs_per_100g || 0
        );
        addedCount++;
        resultDiv.innerHTML += `<br>✅ Добавлено: ${product.name} (${weight} г)`;
    }

    if (notFound.length) {
        resultDiv.innerHTML += `<br>⚠️ Не найдены: ${notFound.join(', ')}`;
    }
    if (addedCount === 0 && notFound.length) {
        resultDiv.innerHTML += '<br>Ничего не добавлено. Проверьте названия продуктов.';
    }
}

function startWebSpeechRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('Голосовой ввод не поддерживается в этом браузере');
        return;
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
            if (event.results[i].isFinal) {
                finalText += transcript + ' ';
            } else {
                interim += transcript;
            }
        }
        resultDiv.innerHTML = `🎤 Распознаётся: ${finalText}${interim}`;
    };

    recognition.onerror = (event) => {
        resultDiv.innerHTML = `❌ Ошибка распознавания: ${event.error}`;
    };

    recognition.onend = async () => {
        resultDiv.innerHTML = `🎤 Обработка: ${finalText}`;
        if (finalText.trim()) {
            await processVoiceText(finalText.trim());
        } else {
            resultDiv.innerHTML = '🎤 Ничего не распознано. Попробуйте ещё раз.';
        }
    };

    recognition.start();
}

async function startVoiceRecognition() {
    const settings = await getUserSettings();
    const yandexKey = settings.yandexApiKey;
    const voiceBtn = document.getElementById('voiceBtn');
    const resultDiv = document.getElementById('voiceResult');

    if (yandexKey && yandexKey.trim()) {
        if (typeof isYandexRecordingActive === 'undefined' || !isYandexRecordingActive()) {
            resultDiv.innerHTML = '🎤 Запускаем микрофон...';
            try {
                await startYandexRecording(yandexKey,
                    async (text) => {
                        await processVoiceText(text);
                        voiceBtn.textContent = '🎤 Голос (Yandex)';
                    },
                    (error) => {
                        resultDiv.innerHTML = `❌ Ошибка Yandex: ${error}. Используем встроенный...`;
                        voiceBtn.textContent = '🎤 Голос (Yandex)';
                        startWebSpeechRecognition();
                    }
                );
                voiceBtn.textContent = '⏹️ Остановить';
                resultDiv.innerHTML = '🎤 Говорите... Нажмите "Остановить", когда закончите.';
            } catch (err) {
                resultDiv.innerHTML = `❌ Ошибка доступа к микрофону: ${err.message}`;
                voiceBtn.textContent = '🎤 Голос (Yandex)';
            }
        } else {
            stopYandexRecording();
            voiceBtn.textContent = '🎤 Голос (Yandex)';
            resultDiv.innerHTML = '🎤 Обработка...';
        }
    } else {
        startWebSpeechRecognition();
    }
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
                <input type="text" id="foodName" placeholder="Название"><br><br>
                <input type="number" id="foodWeight" placeholder="Вес (г)"><br><br>
                <input type="number" id="foodCalories" placeholder="Калории на 100г"><br><br>
                <button id="manualAddBtn" class="primary">Добавить</button>
            </div>
            <div class="card">
                <h3>🎤 Голосовой ввод</h3>
                <button id="voiceBtn">🎤 Голос (Yandex)</button>
                <div id="voiceResult"></div>
            </div>
        </div>
    `;

    // Поиск
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('searchResults');
    let timeoutId;

    searchInput.addEventListener('input', async (e) => {
        clearTimeout(timeoutId);
        const query = e.target.value;
        if (query.length < 2) {
            resultsDiv.innerHTML = '';
            return;
        }
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
                    if (isNaN(weight) || weight <= 0) {
                        alert('Введите вес в граммах');
                        return;
                    }
                    addFoodEntryWithWeight(name, weight, caloriesPer100g, proteinPer100g, fatPer100g, carbsPer100g);
                });
            });
        }, 300);
    });

    // Ручной ввод
    document.getElementById('manualAddBtn').addEventListener('click', () => {
        const name = document.getElementById('foodName').value;
        const weight = parseFloat(document.getElementById('foodWeight').value);
        const caloriesPer100g = parseFloat(document.getElementById('foodCalories').value);
        if (!name || isNaN(weight) || isNaN(caloriesPer100g)) {
            alert('Заполните название, вес и калорийность на 100г');
            return;
        }
        addFoodEntryWithWeight(name, weight, caloriesPer100g);
    });

    // Голос
    document.getElementById('voiceBtn').addEventListener('click', startVoiceRecognition);
}