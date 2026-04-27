function formatDate(date) {
    return new Date(date).toLocaleDateString('ru-RU');
}
function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
    }
}
// Функция удаления записи
async function deleteEntry(storeName, id) {
    if (!window.currentUser) {
        console.error('Пользователь не авторизован');
        return;
    }
    // Удаляем из локального хранилища
    let entries = await getAllFromLocal(storeName);
    const filtered = entries.filter(entry => entry.id !== id);
    await clearStore(storeName);
    await saveToLocal(storeName, filtered);
    // Удаляем из Supabase
    if (window.supabaseClient) {
        const { error } = await window.supabaseClient
            .from(storeName)
            .delete()
            .eq('id', id)
            .eq('user_id', window.currentUser.id);
        if (error) console.error('Ошибка удаления из Supabase:', error);
        else console.log('Запись удалена из Supabase');
    }
    // Обновляем интерфейс
    if (window.refreshDashboard) window.refreshDashboard();
    else location.reload();
}
window.deleteEntry = deleteEntry;