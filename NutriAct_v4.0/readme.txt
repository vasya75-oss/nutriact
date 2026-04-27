Инструкция по установке NutriAct v3.0

1. Создайте проект в Supabase (https://supabase.com)
2. Выполните следующий SQL в редакторе SQL Supabase:

-- Таблица приёмов пищи
CREATE TABLE food_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    calories NUMERIC,
    protein NUMERIC,
    fat NUMERIC,
    carbs NUMERIC,
    date DATE NOT NULL,
    synced BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);

-- Таблица активности
CREATE TABLE activity_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    calories_burned NUMERIC,
    water_ml NUMERIC,
    date DATE NOT NULL,
    synced BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);

-- Включить Row Level Security
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;

-- Политики
CREATE POLICY "Users can view own food" ON food_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own food" ON food_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own food" ON food_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own food" ON food_entries FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own activity" ON activity_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON activity_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity" ON activity_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activity" ON activity_entries FOR DELETE USING (auth.uid() = user_id);

3. Получите URL проекта (Settings -> API) и anon public key.
4. Все файлы приложения разместите в одной папке.
5. Запустите локальный сервер: python -m http.server 8000 (или используйте любой статический сервер)
6. Откройте http://localhost:8000 в браузере.
7. Зарегистрируйтесь, затем в профиле введите Supabase URL и anon key.
8. Приложение готово к работе. Установите как PWA (кнопка "Установить" в браузере).