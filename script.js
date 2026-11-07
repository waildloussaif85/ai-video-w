// @ts-nocheck
/* eslint-disable */

const unityGameId = "800419967";
const unityPlacementId = "BP_Interstitial_Android";
const googleBannerId = "ca-app-pub-3620129121552586/4258571441";

function initUnityAds() { 
    if (typeof WTN !== 'undefined' && WTN.UnityAds) {
        try {
            WTN.UnityAds.initialize({
                gameId: unityGameId,
                testMode: false
            });
            console.log("Unity Ready ✅ via WTN");
        } catch(e) { console.log("Unity Init Error:", e); }
    }
}

function showUnityAd() { 
    if (typeof WTN !== 'undefined' && WTN.UnityAds) {
        try {
            WTN.UnityAds.showInterstitial({
                placementId: unityPlacementId
            });
            console.log("Unity Interstitial Requested 🎬");
        } catch(e) { console.log("Unity Show Error:", e); }
    }
}

function saveVideoToDevice(b, f) {
    if (window.cordova && cordova.file) {
        const t = cordova.file.externalRootDirectory || cordova.file.dataDirectory;
        window.resolveLocalFileSystemURL(t, function (dir) {
            dir.getFile(f, { create: true, exclusive: false }, function (e) {
                e.createWriter(function (w) {
                    w.onwriteend = function () { alert("تم حفظ الفيديو بنجاح في ذاكرة الهاتف المحلي! 📂"); };
                    w.onerror = function (x) { alert("حدث خطأ أثناء الكتابة: " + x.toString()); };
                    w.write(b);
                });
            });
        }, function (e) { alert("صلاحية الوصول غير مفعلة: " + JSON.stringify(e)); });
    } else {
        const u = URL.createObjectURL(b), l = document.createElement('a');
        l.href = u; l.download = f; document.body.appendChild(l); l.click(); document.body.removeChild(l);
    }
}

document.addEventListener("deviceready", () => {
    if (typeof WTN !== 'undefined' && WTN.AdMob) {
        try {
            WTN.AdMob.bannerAd({ 
                adId: googleBannerId 
            });
            console.log("Google AdMob Banner Ready ✅ via WTN");
        } catch (e) { console.log("AdMob Error:", e); }
    }
    initUnityAds();
}, false);

let ctx, loadedImages = [], mediaRecorder = null, chunks = [], animationFrameId = null, isGenerating = false;
let bgAudioPlayer = new Audio(); bgAudioPlayer.loop = true; bgAudioPlayer.crossOrigin = "anonymous";

document.addEventListener("DOMContentLoaded", () => {
    const startBtn = document.getElementById("start-btn"), welcomeScreen = document.getElementById("welcome-screen"), mainAppScreen = document.getElementById("main-app-screen"), videoOutputScreen = document.getElementById("video-output-screen"), generateBtn = document.getElementById("generate-btn"), backBtn = document.getElementById("back-btn"), imageInput = document.getElementById("image-input"), musicInput = document.getElementById("music-input"), fileStatus = document.getElementById("file-status"), canvas = document.getElementById("videoCanvas"), outputVideo = document.getElementById("outputVideo"), downloadBtn = document.getElementById("download-btn"), mainTextInput = document.getElementById("main-c"), topLeftInput = document.getElementById("main-l") || document.getElementById("top-left-text"), topRightInput = document.getElementById("main-r") || document.getElementById("top-right-text"), textSizeInput = document.getElementById("text-size");
    ctx = canvas ? canvas.getContext("2d") : null;
    
    if (startBtn) startBtn.addEventListener("click", () => { welcomeScreen.style.display = "none"; mainAppScreen.style.display = "block"; });
    
    if (imageInput) imageInput.addEventListener("change", (e) => {
        loadedImages = []; let files = e.target.files, loadedCount = 0; if (!files || files.length === 0) return;
        for (let i = 0; i < files.length; i++) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => { loadedCount++; loadedImages.push(img); if (fileStatus) fileStatus.innerText = `تم تحميل ${loadedCount} صور بنجاح 📸`; };
                img.src = event.target.result;
            };
            reader.readAsDataURL(files[i]);
        }
    });
    
    if (musicInput) musicInput.addEventListener("change", (e) => {
        const files = e.target.files; if (!files || files.length === 0) return;
        const reader = new FileReader(); reader.onload = (event) => { bgAudioPlayer.src = event.target.result; if (fileStatus) fileStatus.innerText = "تم تحميل الموسيقى بنجاح 🎵"; };
        reader.readAsDataURL(files[0]);
    });
    
    if (backBtn) backBtn.addEventListener("click", () => {
        isGenerating = false; if (animationFrameId) cancelAnimationFrame(animationFrameId); if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop(); bgAudioPlayer.pause(); bgAudioPlayer.currentTime = 0; videoOutputScreen.style.display = "none"; mainAppScreen.style.display = "block"; if (outputVideo) { outputVideo.pause(); outputVideo.src = ""; }
    });
    
    if (generateBtn && canvas && ctx && outputVideo) {
        generateBtn.addEventListener("click", () => {
            if (loadedImages.length === 0) { alert("الرجاء رفع الصور أولاً!"); return; }
            isGenerating = true; chunks = []; mainAppScreen.style.display = "none"; videoOutputScreen.style.display = "block"; canvas.width = 1080; canvas.height = 1920;
            const durationSlider = document.getElementById("durationPerImg"), durationPerImg = durationSlider ? parseFloat(durationSlider.value) : 3, totalDuration = loadedImages.length * durationPerImg * 1000;
            const videoStream = canvas.captureStream(30); let combinedStream = videoStream, audioContext = null;
            
            if (bgAudioPlayer.src) {
                try {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const source = audioContext.createMediaElementSource(bgAudioPlayer), dest = audioContext.createMediaStreamDestination();
                    source.connect(dest); source.connect(audioContext.destination);
                    const audioTracks = dest.stream.getAudioTracks(); if (audioTracks.length > 0) { videoStream.addTrack(audioTracks[0]); }
                    combinedStream = videoStream;
                } catch (err) { console.log("Audio Context fallback:", err); }
            }
            
            outputVideo.srcObject = combinedStream; outputVideo.play().catch(e => console.log(e));
            if (bgAudioPlayer.src) { bgAudioPlayer.currentTime = 0; bgAudioPlayer.play().catch(e => console.log(e)); }
            
            let options = { mimeType: 'video/webm; codecs=vp8,opus', videoBitsPerSecond: 2000000 }; if (!MediaRecorder.isTypeSupported(options.mimeType)) { options = { mimeType: 'video/mp4' }; }
            mediaRecorder = new MediaRecorder(combinedStream, options); mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            
            mediaRecorder.onstop = () => {
                if (chunks.length > 0) {
                    const videoBlob = new Blob(chunks, { type: options.mimeType.includes('mp4') ? 'video/mp4' : 'video/webm' });
                    if (downloadBtn) {
                        downloadBtn.style.display = "block"; const newDownloadBtn = downloadBtn.cloneNode(true); downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
                        newDownloadBtn.addEventListener("click", (evt) => { evt.preventDefault(); saveVideoToDevice(videoBlob, "ai-video-" + Date.now() + ".mp4"); });
                    }
                }
                if (audioContext) audioContext.close();
            };
            
            mediaRecorder.start(); let startTime = Date.now();
            
            function drawFrame() {
                if (!isGenerating) return; let elapsed = Date.now() - startTime;
                if (elapsed >= totalDuration) {
                    isGenerating = false; if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop(); bgAudioPlayer.pause();
                    if (chunks.length > 0) { const videoBlob = new Blob(chunks, { type: options.mimeType.includes('mp4') ? 'video/mp4' : 'video/webm' }); outputVideo.srcObject = null; outputVideo.src = URL.createObjectURL(videoBlob); outputVideo.load(); outputVideo.play(); }
                    showUnityAd(); return;
                }
                let img = loadedImages[Math.floor(elapsed / (durationPerImg * 1000)) % loadedImages.length];
                if (img) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
                    let scale = Math.max(canvas.width / img.width, canvas.height / img.height); ctx.drawImage(img, (canvas.width - img.width * scale) / 2, (canvas.height - img.height * scale) / 2, img.width * scale, img.height * scale); ctx.restore(); ctx.save();
                    const currentTextSize = textSizeInput ? parseInt(textSizeInput.value) : 50; ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    if (mainTextInput && mainTextInput.value) { ctx.font = `bold ${currentTextSize}px sans-serif`; ctx.shadowColor = "#ff007f"; ctx.shadowBlur = 25; ctx.fillText(mainTextInput.value, canvas.width / 2, canvas.height / 2); ctx.shadowBlur = 0; }
                    ctx.font = "bold 40px sans-serif"; if (topLeftInput && topLeftInput.value) { ctx.textAlign = "left"; ctx.fillText(topLeftInput.value, 80, 200); }
                    if (topRightInput && topRightInput.value) { ctx.textAlign = "right"; ctx.fillText(topRightInput.value, canvas.width - 80, 200); }
                    ctx.restore();
                }
                animationFrameId = requestAnimationFrame(drawFrame);
            }
            drawFrame();
        });
    }
});
