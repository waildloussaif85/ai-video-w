// @ts-nocheck
/* eslint-disable */
document.addEventListener("DOMContentLoaded", () => {
    const startBtn = document.getElementById("start-btn"),
          welcomeScreen = document.getElementById("welcome-screen"),
          mainAppScreen = document.getElementById("main-app-screen"),
          videoOutputScreen = document.getElementById("video-output-screen"),
          generateBtn = document.getElementById("generate-btn"),
          backBtn = document.getElementById("back-btn"),
          imageInput = document.getElementById("image-input"),
          musicInput = document.getElementById("music-input"),
          fileStatus = document.getElementById("file-status"),
          canvas = document.getElementById("videoCanvas"),
          outputVideo = document.getElementById("outputVideo"),
          downloadBtn = document.getElementById("download-btn"),
          mainTextInput = document.getElementById("main-c"),
          topLeftInput = document.getElementById("main-l") || document.getElementById("top-left-text"),
          topRightInput = document.getElementById("main-r") || document.getElementById("top-right-text"),
          textSizeInput = document.getElementById("text-size");

    let ctx = canvas ? canvas.getContext("2d") : null, loadedImages = [], mediaRecorder = null, chunks = [], animationFrameId = null, isGenerating = false;
    let bgAudioPlayer = new Audio(); bgAudioPlayer.loop = true;
    bgAudioPlayer.crossOrigin = "anonymous"; // لتفادي مشاكل الأمان عند تسجيل الصوت

    const unityGameId = "800419967", unityPlacementId = "BP_Interstitial_Android";

    function initUnityAds() {
        if (typeof unityAds !== 'undefined') {
            unityAds.init(unityGameId, false, () => console.log("Unity Ready ✅"));
        }
    }

    function showUnityAd() {
        if (typeof unityAds !== 'undefined') unityAds.show(unityPlacementId);
    }

    document.addEventListener("deviceready", () => {
        if (typeof admob !== 'undefined') {
            try {
                admob.start();
                new admob.BannerAd({ adUnitId: 'ca-app-pub-3620129121552586/4258571441', position: 'bottom', offset: 0 }).show();
            } catch (e) { console.log(e); }
        }
        initUnityAds();
    }, false);

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
        const reader = new FileReader();
        reader.onload = (event) => { bgAudioPlayer.src = event.target.result; bgAudioPlayer.load(); if (fileStatus) fileStatus.innerText = "تم تحميل الموسيقى بنجاح 🎵"; };
        reader.readAsDataURL(files[0]);
    });

    if (backBtn) backBtn.addEventListener("click", () => {
        isGenerating = false; if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
        bgAudioPlayer.pause(); bgAudioPlayer.currentTime = 0;
        videoOutputScreen.style.display = "none"; mainAppScreen.style.display = "block";
        if (outputVideo) { outputVideo.pause(); outputVideo.src = ""; }
    });

    if (generateBtn && canvas && ctx && outputVideo) {
        generateBtn.addEventListener("click", () => {
            if (loadedImages.length === 0) { alert("الرجاء رفع الصور أولاً!"); return; }
            isGenerating = true; chunks = []; mainAppScreen.style.display = "none"; videoOutputScreen.style.display = "block";
            canvas.width = 1080; canvas.height = 1920;
            const durationSlider = document.getElementById("durationPerImg");
            const durationPerImg = durationSlider ? parseFloat(durationSlider.value) : 3;
            const totalDuration = loadedImages.length * durationPerImg * 1000;
            
            // مجرى الفيديو الأصلي من الـ Canvas
            const videoStream = canvas.captureStream(30); 
            
            // دمج الصوت برمجياً داخل الـ Stream
            let combinedStream = videoStream;
            let audioContext = null;
            if (bgAudioPlayer.src) {
                try {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const source = audioContext.createMediaElementSource(bgAudioPlayer);
                    const dest = audioContext.createMediaStreamDestination();
                    source.connect(dest);
                    source.connect(audioContext.destination); // للسماح بسماع الصوت أثناء المعاينة
                    
                    // دمج مسار الصوت مع مسار الفيديو
                    const audioTrack = dest.stream.getAudioTracks()[0];
                    videoStream.addTrack(audioTrack);
                    combinedStream = videoStream;
                } catch(err) {
                    console.log("Audio Context system fallback:", err);
                }
            }

            outputVideo.srcObject = combinedStream; 
            outputVideo.play().catch(e => console.log(e));
            
            if (bgAudioPlayer.src) { bgAudioPlayer.currentTime = 0; bgAudioPlayer.play().catch(e => console.log(e)); }

            // تسجيل المجرى المدمج (صوت وصورة)
            mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm; codecs=vp8,opus', videoBitsPerSecond: 2000000 });
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
            mediaRecorder.onstop = () => {
                if (chunks.length > 0) {
                    const fileURL = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
                    if (downloadBtn) { downloadBtn.href = fileURL; downloadBtn.download = "video.webm"; downloadBtn.style.display = "block"; }
                }
                if (audioContext) audioContext.close();
            };
            mediaRecorder.start(); let startTime = Date.now();

            function drawFrame() {
                if (!isGenerating) return; let elapsed = Date.now() - startTime;
                if (elapsed >= totalDuration) {
                    isGenerating = false; if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
                    bgAudioPlayer.pause();
                    if (chunks.length > 0) { outputVideo.srcObject = null; outputVideo.src = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })); outputVideo.load(); outputVideo.play(); }
                    showUnityAd(); return;
                }
                let img = loadedImages[Math.floor(elapsed / (durationPerImg * 1000)) % loadedImages.length];
                if (img) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.save(); ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
                    let scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                    ctx.drawImage(img, (canvas.width - img.width * scale) / 2, (canvas.height - img.height * scale) / 2, img.width * scale, img.height * scale); ctx.restore(); ctx.save();
                    const currentTextSize = textSizeInput ? parseInt(textSizeInput.value) : 50; ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
                    if (mainTextInput && mainTextInput.value) { ctx.font = `bold ${currentTextSize}px sans-serif`; ctx.shadowColor = "#ff007f"; ctx.shadowBlur = 25; ctx.fillText(mainTextInput.value, canvas.width / 2, canvas.height / 2); ctx.shadowBlur = 0; }
                    ctx.font = "bold 40px sans-serif";
                    if (topLeftInput && topLeftInput.value) { ctx.textAlign = "left"; ctx.fillText(topLeftInput.value, 80, 200); }
                    if (topRightInput && topRightInput.value) { ctx.textAlign = "right"; ctx.fillText(topRightInput.value, canvas.width - 80, 200); }
                    ctx.restore();
                }
                animationFrameId = requestAnimationFrame(drawFrame);
            }
            drawFrame();
        });
    }
});

