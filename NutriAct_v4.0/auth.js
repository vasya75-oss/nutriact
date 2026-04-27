// auth.js — инициализация Supabase и работа с аутентификацией
let _supabaseClient = null;

async function getSupabaseClient() {
    if (_supabaseClient) return _supabaseClient;
    const settings = await getUserSettings();
    const supabaseUrl = settings.supabaseUrl;
    const supabaseKey = settings.supabaseAnonKey;
    if (!supabaseUrl || !supabaseKey) {
        return null;
    }
    _supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);
    return _supabaseClient;
}

async function checkAuth() {
    const client = await getSupabaseClient();
    if (!client) return { user: null, client: null };
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return { user: null, client };
    return { user, client };
}

async function signUp(email, password) {
    const client = await getSupabaseClient();
    if (!client) return { error: new Error('Supabase не настроен. Зайдите в профиль и введите ключи.') };
    const { data, error } = await client.auth.signUp({ email, password });
    return { user: data?.user, error };
}

async function signIn(email, password) {
    const client = await getSupabaseClient();
    if (!client) return { error: new Error('Supabase не настроен. Зайдите в профиль и введите ключи.') };
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    return { user: data?.user, error };
}