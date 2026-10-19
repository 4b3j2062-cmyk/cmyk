const countdown = document.getElementById("倒數");
const targetDate = new Date(countdown.dataset.date);

if (Number.isNaN(targetDate.getTime())) {
    countdown.textContent = "演出日期尚未設定";
} else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    const daysUntilShow = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilShow > 0) {
        countdown.textContent = `還有 ${daysUntilShow} 天`;
    } else if (daysUntilShow === 0) {
        countdown.textContent = "就是今天";
    } else {
        countdown.textContent = "期待下次相見";
    }
}

const playButton = document.getElementById("play-button");
const playIcon = playButton.querySelector(".play-icon");
const playerProgress = document.getElementById("track-progress");
const trackTime = document.getElementById("track-time");
const trackStatus = document.getElementById("track-status");
const audioNote = document.getElementById("audio-note");
const recordArt = document.querySelector(".listen-art");
const clipDuration = 24;
const melody = [392, 440, 523.25, 587.33, 523.25, 440, 392, 329.63, 392, 440, 523.25, 659.25, 587.33, 523.25, 440, 392];

let audioContext;
let activeOscillators = [];
let playbackTimer;
let playbackOffset = 0;
let playbackStartedAt = 0;
let isPlaying = false;

function formatTime(seconds) {
    const wholeSeconds = Math.floor(seconds);
    return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function setPlaybackProgress(seconds) {
    const progress = Math.min(seconds, clipDuration);
    playerProgress.value = progress;
    trackTime.textContent = `${formatTime(progress)} / ${formatTime(clipDuration)}`;
}

function stopScheduledNotes() {
    activeOscillators.forEach((oscillator) => {
        try {
            oscillator.stop();
        } catch (error) {
            if (error.name !== "InvalidStateError") {
                throw error;
            }
        }
    });
    activeOscillators = [];
}

function scheduleMelody(startAt) {
    stopScheduledNotes();
    const firstNote = Math.floor(startAt / 0.75);

    for (let index = firstNote; index < Math.ceil(clipDuration / 0.75); index += 1) {
        const noteTime = audioContext.currentTime + Math.max(0, index * 0.75 - startAt);
        const noteDuration = Math.min(0.62, clipDuration - index * 0.75);
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = melody[index % melody.length];
        gain.gain.setValueAtTime(0.0001, noteTime);
        gain.gain.exponentialRampToValueAtTime(0.12, noteTime + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + noteDuration);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(noteTime);
        oscillator.stop(noteTime + noteDuration + 0.02);
        activeOscillators.push(oscillator);
    }
}

function stopPlaybackTimer() {
    window.clearInterval(playbackTimer);
    playbackTimer = undefined;
}

function updatePlayback() {
    const elapsed = playbackOffset + (performance.now() - playbackStartedAt) / 1000;

    if (elapsed >= clipDuration) {
        playbackOffset = 0;
        stopScheduledNotes();
        stopPlaybackTimer();
        isPlaying = false;
        setPlaybackProgress(0);
        updatePlayerControls();
        trackStatus.textContent = "播放片段";
        return;
    }

    setPlaybackProgress(elapsed);
}

function updatePlayerControls() {
    const label = isPlaying ? "暫停新曲試聽" : "播放新曲試聽";
    playButton.setAttribute("aria-label", label);
    playButton.setAttribute("aria-pressed", String(isPlaying));
    playIcon.textContent = isPlaying ? "Ⅱ" : "▶";
    recordArt.classList.toggle("is-playing", isPlaying);
}

async function startPlayback() {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextConstructor) {
        audioNote.textContent = "此瀏覽器不支援音訊播放，請使用較新版的瀏覽器。";
        playButton.disabled = true;
        return;
    }

    try {
        audioContext ||= new AudioContextConstructor();
        await audioContext.resume();
        playbackStartedAt = performance.now();
        scheduleMelody(playbackOffset);
        isPlaying = true;
        trackStatus.textContent = "正在試聽";
        updatePlayerControls();
        stopPlaybackTimer();
        playbackTimer = window.setInterval(updatePlayback, 100);
    } catch (error) {
        audioNote.textContent = `音訊無法播放：${error.message}`;
        playButton.disabled = true;
    }
}

function pausePlayback() {
    playbackOffset += (performance.now() - playbackStartedAt) / 1000;
    stopScheduledNotes();
    stopPlaybackTimer();
    isPlaying = false;
    trackStatus.textContent = "已暫停";
    updatePlayerControls();
    audioContext.suspend();
}

playButton.addEventListener("click", () => {
    if (isPlaying) {
        pausePlayback();
    } else {
        if (playbackOffset >= clipDuration) {
            playbackOffset = 0;
        }
        startPlayback();
    }
});

playerProgress.addEventListener("input", () => {
    playbackOffset = Number(playerProgress.value);
    setPlaybackProgress(playbackOffset);

    if (isPlaying) {
        playbackStartedAt = performance.now();
        scheduleMelody(playbackOffset);
    } else {
        trackStatus.textContent = playbackOffset === 0 ? "播放片段" : "已選擇試聽位置";
    }
});
