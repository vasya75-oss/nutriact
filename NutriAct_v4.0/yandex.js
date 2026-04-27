// yandex.js — распознавание речи через Yandex SpeechKit (с управляемой записью)
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

async function startYandexRecording(apiKey, onResult, onError) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            // Отправляем в Yandex SpeechKit
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');

            try {
                const response = await fetch(`https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?topic=general&lang=ru-RU`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Api-Key ${apiKey}`
                    },
                    body: audioBlob // отправляем как raw данные, не FormData
                });
                const result = await response.json();
                if (result.result) {
                    onResult(result.result);
                } else {
                    onError(result.error_message || 'Не удалось распознать речь');
                }
            } catch (err) {
                onError(err.message);
            } finally {
                stream.getTracks().forEach(track => track.stop());
                mediaRecorder = null;
                isRecording = false;
            }
        };

        mediaRecorder.start(1000); // собираем данные каждую секунду
        isRecording = true;
        return true;
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

function isYandexRecordingActive() {
    return isRecording;
}