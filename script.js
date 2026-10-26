document.addEventListener("DOMContentLoaded", () => {
    const startBtn = document.getElementById("start-btn");
    const welcomeScreen = document.getElementById("welcome-screen");
    const mainAppScreen = document.getElementById("main-app-screen");
    const videoOutputScreen = document.getElementById("video-output-screen");
    const generateBtn = document.getElementById("generate-btn");
    const backBtn = document.getElementById("back-btn");

    startBtn.addEventListener("click", () => {
        welcomeScreen.classList.remove("active");
        mainAppScreen.classList.add("active");
    });

    backBtn.addEventListener("click", () => {
        videoOutputScreen.classList.remove("active");
        mainAppScreen.classList.add("active");
    });

    const transitionSlider = document.getElementById("transition-slider");
    const transitionVal = document.getElementById("transition-val");
    transitionSlider.addEventListener("input", (e) => {
        transitionVal.textContent = `${e.target.value}s / Image`;
    });

    const imageInput = document.getElementById("image-input");
    const musicInput = document.getElementById("music-input");
    const fileStatus = document.getElementById("file-status");
    let loadedImages = [];

    imageInput.addEventListener("change", (e) => {
        loadedImages = [];
        const files = e.target.files;
        let loadedCount = 0;
        for (let i = 0; i < files.length; i++) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    loadedCount++;
                    if(loadedCount === files.length) {
                        updateStatusText();
                    }
                };
                img.src = event.target.result;
                loadedImages.push(img);
            };
            reader.readAsDataURL(files[i]);
        }
    });

    function updateStatusText() {
        let count = loadedImages.length;
        fileStatus.textContent = count > 0 ? `📸 Selected: ${count} images` : "No files selected yet";
    }

    generateBtn.addEventListener("click", () => {
        if (loadedImages.length === 0) {
            alert("Please upload some images first!");
            return;
        }

        mainAppScreen.classList.remove("active");
        videoOutputScreen.classList.add("active");

        const canvas = document.getElementById("videoCanvas");
        const ctx = canvas.getContext("2d");
        const outputVideo = document.getElementById("outputVideo");
        const downloadBtn = document.getElementById("download-btn");

        const mainCaption = document.getElementById("main-caption").value || "Masterpiece";
        const topLeftTxt = document.getElementById("top-left-text").value || "";
        const topRightTxt = document.getElementById("top-right-text").value || "";
        const textColor = document.getElementById("text-color").value;
        const neonColor = document.getElementById("neon-color").value;
        const textSize = document.getElementById("text-size-slider").value;
        const durationPerImg = parseFloat(transitionSlider.value) * 1000;

        const isKenBurns = document.getElementById("tech-kenburns").checked;
        const isNeonGlow = document.getElementById("tech-neon").checked;
        const isGlitch = document.getElementById("tech-3d-glitch")?.checked;
        const isTextAnim = document.getElementById("tech-text-anim")?.checked;

        // تسجيل دفق الفيديو بالأبعاد العمودية الكاملة المحددة للكانفاس (720x1280)
        const stream = canvas.captureStream(30); 
        const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm; codecs=vp9" });
        let chunks = [];

        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: "video/webm" });
            const videoURL = URL.createObjectURL(blob);
            outputVideo.src = videoURL;
            
            downloadBtn.href = videoURL;
            downloadBtn.download = "ai-video-916.webm";
            downloadBtn.style.display = "block";
        };

        mediaRecorder.start();

        let startTime = Date.now();
        let totalDuration = loadedImages.length * durationPerImg;

        function drawFrame() {
            let elapsed = Date.now() - startTime;
            if (elapsed >= totalDuration) {
                mediaRecorder.stop();
                return;
            }

            let currentImgIndex = Math.floor(elapsed / durationPerImg);
            let img = loadedImages[currentImgIndex];
            let imgElapsed = elapsed % durationPerImg;
            let progress = imgElapsed / durationPerImg;

            if (img) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.save();

                // جعل الصورة تغطي كامل مساحة الخلفية العمودية (9:16) بدون تمديد مشوه
                let imgScale = Math.max(canvas.width / img.width, canvas.height / img.height);
                if (isKenBurns) {
                    imgScale *= (1 + progress * 0.15); // إضافة حركة تقريب سينمائي تدريجي
                }
                
                let xOffset = (canvas.width - img.width * imgScale) / 2;
                let yOffset = (canvas.height - img.height * imgScale) / 2;

                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.scale(isKenBurns ? 1 : 1, isKenBurns ? 1 : 1);
                ctx.drawImage(img, - (img.width * imgScale) / 2, - (img.height * imgScale) / 2, img.width * imgScale, img.height * imgScale);
                ctx.restore();

                // تفعيل تأثير الـ Glitch ثلاثي الأبعاد العشوائي
                if (isGlitch && Math.random() > 0.88) {
                    ctx.fillStyle = "rgba(0, 242, 254, 0.25)";
                    ctx.fillRect(Math.random() * 20, 0, canvas.width, canvas.height);
                }

                // هندسة تحريك وحركة النصوص المتقدمة (Animation Effect)
                let textYPosition = canvas.height / 2; // الموضع الافتراضي بالمنتصف
                
                if (isTextAnim) {
                    // حركة نبض صعود وهبوط انسيابية (Bounce/Pulse effect) بالاعتماد على دالة الـ Sine والوقت
                    let wave = Math.sin(progress * Math.PI * 2);
                    textYPosition += wave * 15; 
                }

                ctx.font = `bold ${textSize}px sans-serif`;
                ctx.textAlign = "center";

                if (isNeonGlow) {
                    ctx.shadowColor = neonColor;
                    ctx.shadowBlur = 20;
                } else {
                    ctx.shadowBlur = 0;
                }

                // رسم النص المحدث والمتحرك في قلب الفيديو الممتد
                ctx.fillStyle = textColor;
                ctx.fillText(mainCaption, canvas.width / 2, textYPosition);

                // رسم نصوص الهوامش العلوية متناسقة مع كبر الشاشة
                ctx.font = "bold 24px sans-serif";
                if (topLeftTxt) {
                    ctx.textAlign = "left";
                    ctx.fillText(topLeftTxt, 45, 70);
                }
                if (topRightTxt) {
                    ctx.textAlign = "right";
                    ctx.fillText(topRightTxt, canvas.width - 45, 70);
                }
            }
            requestAnimationFrame(drawFrame);
        }
        
        drawFrame();
    });
});

