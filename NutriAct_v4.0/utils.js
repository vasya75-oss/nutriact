function formatDate(date) {
    return new Date(date).toLocaleDateString('ru-RU');
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
    }
}