async function parseWithDeepseek(text, apiKey) {
    const prompt = `Ты — нутрициолог. Разбери следующий текст на отдельные продукты. Для каждого продукта укажи: название, вес в граммах (если указан), калории на 100 г, белки (г), жиры (г), углеводы (г). Ответ верни в формате JSON массива объектов: [{"name": "...", "weight": число, "calories_per_100g": число, "protein_per_100g": число, "fat_per_100g": число, "carbs_per_100g": число}]. Если вес не указан, поставь null. Если какое-то значение неизвестно, поставь 0. Текст: "${text}"`;
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
            throw new Error(`HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
        }
        const data = await response.json();
        if (data.choices && data.choices.length > 0) {
            const content = data.choices[0].message.content;
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            else throw new Error('JSON не найден');
        } else {
            throw new Error('Некорректный ответ');
        }
    } catch (err) {
        console.error('Deepseek error:', err);
        return null;
    }
}