// yandex.js — распознавание речи через Yandex SpeechKit (с управляемой записью)
let mediaRecorder = null;
let audioChunks = [];

async function startYandexRecording(apiKey, onResult, onError) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            try {
                const response = await fetch(`https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?topic=general&lang=ru-RU`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Api-Key ${apiKey}`
                    },
                    body: audioBlob
                });
                const result = await response.json();
                if (result.result) {
                    onResult(result.result);
                } else {
                    onError('Не удалось распознать речь');
                }
            } catch (err) {
                onError(err.message);
            } finally {
                stream.getTracks().forEach(track => track.stop());
                mediaRecorder = null;
            }
        };

        // Начинаем запись и ждём, пока она реально начнётся
        mediaRecorder.start();
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Таймаут старта записи')), 5000);
            if (mediaRecorder.state === 'recording') {
                clearTimeout(timeout);
                resolve();
            } else {
                mediaRecorder.onstart = () => {
                    clearTimeout(timeout);
                    resolve();
                };
            }
        });
    } catch (err) {
        onError(err.message);
        throw err;
    }
}

function stopYandexRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}