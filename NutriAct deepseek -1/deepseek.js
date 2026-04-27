// deepseek.js — исправленный парсер с проверкой ответа
async function parseWithDeepseek(text, apiKey) {
    const prompt = `Ты — нутрициолог. Разбери следующий текст на отдельные продукты. Для каждого продукта укажи: название, вес в граммах (если указан), калории на 100 г (если знаешь типичное значение). Ответ верни в формате JSON массива объектов: [{"name": "...", "weight": число, "calories_per_100g": число}]. Если вес не указан, поставь null. Если калорийность неизвестна, поставь null. Текст: "${text}"`;
    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.1,
                max_tokens: 500
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Deepseek API error:', errorData);
            throw new Error(`HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
        }
        
        const data = await response.json();
        console.log('Deepseek raw response:', data); // для отладки
        
        // Проверяем наличие choices
        if (data && data.choices && data.choices.length > 0) {
            const content = data.choices[0].message.content;
            console.log('Deepseek content:', content);
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            } else {
                // Попробуем извлечь весь content как JSON (если массив)
                try {
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) return parsed;
                } catch(e) {}
                throw new Error('JSON массив не найден');
            }
        } else {
            throw new Error('Некорректный ответ: отсутствует choices');
        }
    } catch (err) {
        console.error('Ошибка Deepseek:', err);
        return null;
    }
}