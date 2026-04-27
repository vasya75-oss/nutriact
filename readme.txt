Инструкция по установке и настройке NutriAct v3.0 (Deepseek)

1. Создайте папку и скопируйте в неё все файлы.
2. Запустите локальный сервер: python -m http.server 8000
3. Откройте в браузере http://localhost:8000
4. Настройте Supabase:
   - Создайте проект на https://supabase.com
   - Выполните SQL для создания таблиц (см. ниже)
   - Получите URL и anon key (Settings -> API)
5. Получите API ключ Deepseek на https://platform.deepseek.com/
6. В приложении введите ключи в профиле.
7. Для установки на Android: откройте в Chrome, нажмите "Установить приложение".

SQL для Supabase:
CREATE TABLE food_entries (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    weight NUMERIC,
    calories NUMERIC,
    protein NUMERIC,
    fat NUMERIC,
    carbs NUMERIC,
    date DATE NOT NULL,
    synced BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now()
);
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
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    calories_per_100g NUMERIC NOT NULL,
    protein_per_100g NUMERIC,
    fat_per_100g NUMERIC,
    carbs_per_100g NUMERIC,
    created_at TIMESTAMP DEFAULT now()
);
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own food" ON food_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own food" ON food_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own food" ON food_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own food" ON food_entries FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can view own activity" ON activity_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON activity_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own activity" ON activity_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own activity" ON activity_entries FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Allow authenticated read" ON products FOR SELECT USING (auth.role() = 'authenticated');