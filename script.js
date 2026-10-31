
// @ts-nocheck
/* eslint-disable */

document.addEventListener("DOMContentLoaded", () => {
    const startBtn = document.getElementById("start-btn");
    const welcomeScreen = document.getElementById("welcome-screen");
    const mainAppScreen = document.getElementById("main-app-screen");
    const videoOutputScreen = document.getElementById("video-output-screen");
    const generateBtn = document.getElementById("generate-btn");
    const backBtn = document.getElementById("back-btn");
    
    const imageInput = document.getElementById("image-input");
    const musicInput = document.getElementById("music-input");
    const fileStatus = document.getElementById("file-status");
    const canvas = document.getElementById("videoCanvas"); 
    const outputVideo = document.getElementById("outputVideo");
    const downloadBtn = document.getElementById("download-btn");

    const mainTextInput = document.getElementById("main-c");
    const topLeftInput = document.getElementById("main-l") || document.getElementById("top-left-text");
    const topRightInput = document.getElementById("main-r") || document.getElementById("top-right-text");
    const textSizeInput = document.getElementById("text-size");

    let ctx = canvas ? canvas.getContext("2d") : null;
    let loadedImages = [];
    let mediaRecorder = null;
    let chunks = [];
    let animationFrameId = null;
    let isGenerating = false;
    
    // مشغل صوتي خارجي لتفادي حظر المتصفحات للموسيقى المدمجة
    let bgAudioPlayer = new Audio();
    bgAudioPlayer.loop = true;

    // تفعيل إعلان AdMob الحقيقي
    document.addEventListener("deviceready", () => {
        if (typeof admob !== 'undefined') {
            try {
                admob.start();
                const banner = new admob.BannerAd({
                    adUnitId: 'ca-app-pub-3620129121552586/4258571441', 
                    position: 'bottom',
                    offset: 0
                });
                banner.show();
            } catch (e) { console.log(e); }
        }
    }, false);

    if (startBtn && welcomeScreen && mainAppScreen) {
        startBtn.addEventListener("click", () => {
            welcomeScreen.style.display = "none";
            mainAppScreen.style.display = "block";
        });
    }

    // استقبال ومعالجة الصور المرفوعة
    if (imageInput) {
        imageInput.addEventListener("change", (e) => {
            loadedImages = [];
            const files = e.target.files;
            let loadedCount = 0;
            if (!files || files.length === 0) return;
            for (let i = 0; i < files.length; i++) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    const img = new Image();
                    img.onload = function () {
                        loadedCount++;
                        loadedImages.push(img);
                        if (fileStatus) fileStatus.innerText = `تم تحميل ${loadedCount} صور بنجاح 📸`;
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(files[i]);
            }
        });
    }

    // استقبال ومعالجة الموسيقى وتخطي قيود الويب
    if (musicInput) {
        musicInput.addEventListener("change", (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            const reader = new FileReader();
            reader.onload = function (event) {
                bgAudioPlayer.src = event.target.result;
                bgAudioPlayer.load();
                if (fileStatus) fileStatus.innerText = "تم تحميل الموسيقى ومزامنتها بنجاح 🎵";
            };
            reader.readAsDataURL(files[0]);
        });
    }

    if (backBtn && videoOutputScreen && mainAppScreen) {
        backBtn.addEventListener("click", () => {
            isGenerating = false;
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
            bgAudioPlayer.pause();
            bgAudioPlayer.currentTime = 0;
            
            videoOutputScreen.style.display = "none";
            mainAppScreen.style.display = "block";
            
            if (outputVideo) {
                outputVideo.pause();
                outputVideo.src = "";
                outputVideo.srcObject = null;
            }
        });
    }

    // توليد وتشغيل الفيديو بشكل فوري ومباشر مع الصوت والنصوص
    if (generateBtn && canvas && ctx && outputVideo) {
        generateBtn.addEventListener("click", () => {
            if (loadedImages.length === 0) { alert("الرجاء رفع الصور أولاً!"); return; }
            isGenerating = true;
            chunks = [];
            mainAppScreen.style.display = "none";
            videoOutputScreen.style.display = "block";
            
            canvas.width = 1080;
            canvas.height = 1920;
            
            const durationSlider = document.getElementById("durationPerImg");
            const durationPerImg = durationSlider ? parseFloat(durationSlider.value) : 3;
            const totalDuration = loadedImages.length * durationPerImg * 1000; 
            
            const videoStream = canvas.captureStream(30);
            outputVideo.srcObject = videoStream;
            outputVideo.play().catch(e => console.log(e));

            // تشغيل الموسيقى فورياً بالتزامن مع البث المباشر
            if (bgAudioPlayer.src) {
                bgAudioPlayer.currentTime = 0;
                bgAudioPlayer.play().catch(e => console.log("Audio lock bypass error:", e));
            }

            mediaRecorder = new MediaRecorder(videoStream, { mimeType: 'video/webm; codecs=vp8', videoBitsPerSecond: 2000000 });
            mediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) chunks.push(e.data); };
            mediaRecorder.onstop = function() {
                if (chunks.length > 0) {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    const fileURL = URL.createObjectURL(blob);
                    if (downloadBtn) { downloadBtn.href = fileURL; downloadBtn.download = "tiktok_video.webm"; downloadBtn.style.display = "block"; }
                }
            };
            mediaRecorder.start();
            let startTime = Date.now();

            function drawFrame() {
                if (!isGenerating) return;
                let elapsed = Date.now() - startTime;
                if (elapsed >= totalDuration) {
                    isGenerating = false;
                    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
                    bgAudioPlayer.pause();
                    if (chunks.length > 0) {
                        outputVideo.srcObject = null;
                        outputVideo.src = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }));
                        outputVideo.load(); outputVideo.play();
                    }
                    return;
                }

                let currentImgIndex = Math.floor(elapsed / (durationPerImg * 1000));
                let img = loadedImages[currentImgIndex % loadedImages.length];

                if (img) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.save();
                    ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
                    let scale = Math.max(canvas.width / img.width, canvas.height / img.height);
                    ctx.drawImage(img, (canvas.width - img.width * scale) / 2, (canvas.height - img.height * scale) / 2, img.width * scale, img.height * scale);
                    ctx.restore();

                    ctx.save();
                    const currentTextSize = textSizeInput ? parseInt(textSizeInput.value) : 50;
                    ctx.fillStyle = "#ffffff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";

                    if (mainTextInput && mainTextInput.value) {
                        ctx.font = `bold ${currentTextSize}px sans-serif`;
                        ctx.shadowColor = "#ff007f"; ctx.shadowBlur = 25;
                        ctx.fillText(mainTextInput.value, canvas.width / 2, canvas.height / 2);
                        ctx.shadowBlur = 0;
                    }
                    
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
