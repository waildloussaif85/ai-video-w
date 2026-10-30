// @ts-nocheck
/* eslint-disable */
document.addEventListener("DOMContentLoaded", function () {
    const startBtn = document.getElementById("start-btn");
    const welcomeScreen = document.getElementById("welcome-screen");
    const mainAppScreen = document.getElementById("main-app-screen");
    const videoOutputScreen = document.getElementById("video-output-screen");
    const generateBtn = document.getElementById("generate-btn");
    const backBtn = document.getElementById("back-btn");
    const imageInput = document.getElementById("image-input");
    const musicInput = document.getElementById("music-input");
    const uploadImagesTrigger = document.getElementById("upload-images-trigger");
    const uploadMusicTrigger = document.getElementById("upload-music-trigger");
    const fileStatus = document.getElementById("file-status");
    const canvas = document.getElementById("videoCanvas");
    const ctx = canvas ? canvas.getContext("2d") : null;
    const outputVideo = document.getElementById("outputVideo");
    const downloadBtn = document.getElementById("download-btn");
    const transitionSlider = document.getElementById("transition-slider");

    let loadedImages = [];
    let audioContext = null, audioSourceNode = null, audioDestinationNode = null, uploadedAudioBuffer = null;

    if (uploadImagesTrigger && imageInput) uploadImagesTrigger.addEventListener("click", function () { imageInput.click(); });
    if (uploadMusicTrigger && musicInput) uploadMusicTrigger.addEventListener("click", function () { musicInput.click(); });

    if (startBtn && welcomeScreen && mainAppScreen) {
        startBtn.addEventListener("click", function () {
            welcomeScreen.classList.remove("active");
            mainAppScreen.classList.add("active");
            if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        });
    }
    if (backBtn && videoOutputScreen && mainAppScreen) {
        backBtn.addEventListener("click", function () {
            videoOutputScreen.classList.remove("active");
            mainAppScreen.classList.add("active");
        });
    }
    if (transitionSlider) {
        const transitionVal = transitionSlider.nextElementSibling;
        transitionSlider.addEventListener("input", function (e) {
            if (transitionVal && e.target) transitionVal.textContent = e.target.value + "s / Image";
        });
    }
    if (imageInput) {
        imageInput.addEventListener("change", function (e) {
            loadedImages = [];
            const files = e.target.files;
            let loadedCount = 0;
            if (!files || files.length === 0) return;
            for (let i = 0; i < files.length; i++) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    if (event.target && event.target.result) {
                        const img = new Image();
                        img.onload = function () {
                            loadedCount++;
                            if (loadedCount === files.length) {
                                if (fileStatus) fileStatus.textContent = "📸 تم تحميل " + loadedImages.length + " صور. " + (uploadedAudioBuffer ? "🎵 الموسيقى جاهزة." : "");
                            }
                        };
                        img.src = event.target.result;
                        loadedImages.push(img);
                    }
                };
                reader.readAsDataURL(files[i]);
            }
        });
    }
    if (musicInput) {
        musicInput.addEventListener("change", function (e) {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            const reader = new FileReader();
            reader.onload = function (event) {
                if (event.target && event.target.result) {
                    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    audioContext.decodeAudioData(event.target.result, function (buffer) {
                        uploadedAudioBuffer = buffer;
                        if (fileStatus) fileStatus.textContent = (loadedImages.length > 0 ? "📸 تم تحميل " + loadedImages.length + " صور. " : "") + "🎵 الموسيقى جاهزة.";
                    }, function (err) { console.error(err); });
                }
            };
            reader.readAsArrayBuffer(files[0]);
        });
    }
    if (generateBtn && canvas && ctx && outputVideo && downloadBtn && transitionSlider) {
        generateBtn.addEventListener("click", function () {
            if (loadedImages.length === 0) { alert("Please upload some images first!"); return; }
            mainAppScreen.classList.remove("active");
            videoOutputScreen.classList.add("active");

            canvas.width = 1080;
            canvas.height = 1920;

            const mainCaption = document.getElementById("main-caption").value || "";
            const topLeftTxt = document.getElementById("top-left-text").value || "";
            const topRightTxt = document.getElementById("top-right-text").value || "";
            const textSize = document.getElementById("text-size-slider").value || "30";
            const durationPerImg = parseFloat(transitionSlider.value) * 1000;
            const isKenBurns = document.getElementById("cinematic-ken-burns").checked || false;
            const isNeonGlow = document.getElementById("neon-glow-typing").checked || false;
            const isGlitch = document.getElementById("glitch-filter").checked || false;
            const isTextAnim = document.getElementById("bounce-animation").checked || false;
            const textColor = document.getElementById("text-color-picker").value || "#ffffff";
            const neonColor = document.getElementById("neon-color-picker").value || "#ff007f";

            const videoStream = canvas.captureStream(30);
            let finalStream = new MediaStream();
            videoStream.getVideoTracks().forEach(function (track) { finalStream.addTrack(track); });

            if (uploadedAudioBuffer && audioContext) {
                audioDestinationNode = audioContext.createMediaStreamDestination();
                audioSourceNode = audioContext.createBufferSource();
                audioSourceNode.buffer = uploadedAudioBuffer;
                audioSourceNode.loop = true;
                audioSourceNode.connect(audioDestinationNode);
                audioDestinationNode.stream.getAudioTracks().forEach(function (track) { finalStream.addTrack(track); });
                audioSourceNode.start(0);
            }

            // استخدام الصيغة القياسية الأكثر مرونة وسرعة لحل مشكلة البطء وخروج الصوت في الأندرويد
            const mediaRecorder = new MediaRecorder(finalStream);
            let chunks = [];
            mediaRecorder.ondataavailable = function (e) { if (e.data && e.data.size > 0) chunks.push(e.data); };
            mediaRecorder.onstop = function () {
                if (audioSourceNode) { try { audioSourceNode.stop(); } catch (ex) { } }
                const blob = new Blob(chunks, { type: 'video/mp4' });
                const videoURL = URL.createObjectURL(blob);
                outputVideo.src = videoURL;
                outputVideo.load();
                outputVideo.play();
                downloadBtn.href = videoURL;
                downloadBtn.download = "tiktok_masterpiece.mp4";
                downloadBtn.style.display = "block";
            };

            mediaRecorder.start();
            let startTime = Date.now(), totalDuration = loadedImages.length * durationPerImg;

            function drawFrame() {
                let elapsed = Date.now() - startTime;
                if (elapsed >= totalDuration) { mediaRecorder.stop(); return; }
                let currentImgIndex = Math.floor(elapsed / durationPerImg);
                let img = loadedImages[currentImgIndex];
                let progress = (elapsed % durationPerImg) / durationPerImg;

                if (img) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.save();
                    let imgScale = Math.max(canvas.width / img.width, canvas.height / img.height);
                    if (isKenBurns) imgScale *= (1 + progress * 0.15);
                    let xOffset = (canvas.width - img.width * imgScale) / 2;
                    let yOffset = (canvas.height - img.height * imgScale) / 2;
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.drawImage(img, xOffset - canvas.width / 2, yOffset - canvas.height / 2, img.width * imgScale, img.height * imgScale);
                    ctx.restore();

                    if (isGlitch && Math.random() > 0.85) {
                        ctx.fillStyle = "rgba(0, 255, 255, 0.3)";
                        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 50, 10);
                    }
                    let textYPosition = canvas.height / 2;
                    if (isTextAnim) textYPosition += Math.sin(progress * Math.PI * 2) * 15;

                    ctx.font = "bold " + textSize + "px sans-serif";
                    ctx.textAlign = "center";
                    if (isNeonGlow) { ctx.shadowColor = neonColor; ctx.shadowBlur = 20; } else { ctx.shadowBlur = 0; }
                    ctx.fillStyle = textColor;
                    ctx.fillText(mainCaption, canvas.width / 2, textYPosition);

                    ctx.font = "bold 32px sans-serif";
                    ctx.shadowBlur = 0;
                    if (topLeftTxt) { ctx.textAlign = "left"; ctx.fillText(topLeftTxt, 50, 80); }
                    if (topRightTxt) { ctx.textAlign = "right"; ctx.fillText(topRightTxt, canvas.width - 50, 80); }
                }
                requestAnimationFrame(drawFrame);
            }
            drawFrame();
        });
    }
});


