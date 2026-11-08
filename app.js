// @ts-nocheck
/* eslint-disable */

let ctx = null;
let loadedImages = [];
let mediaRecorder = null;
let chunks = [];
let animationFrameId = null;
let isGenerating = false;
let bgAudioPlayer = new Audio();
bgAudioPlayer.loop = true;
bgAudioPlayer.crossOrigin = "anonymous";
window.videoStartTime = 0;

// دالة حفظ الفيديو المخصصة لمتصفحات الويب المستضافة على Vercel
function saveVideoToDevice(b, f) {
    const u = URL.createObjectURL(b);
    const l = document.createElement('a');
    l.href = u; 
    l.download = f; 
    document.body.appendChild(l); 
    l.click(); 
    document.body.removeChild(l);
}

function drawFrame() {
    if (!isGenerating) return;
    
    const durationSlider = document.getElementById("durationPerImg");
    const durationPerImg = durationSlider ? parseFloat(durationSlider.value) : 3;
    const canvas = document.getElementById("videoCanvas");
    const outputVideo = document.getElementById("outputVideo");
    const mainTextInput = document.getElementById("main-c");
    const topLeftInput = document.getElementById("top-left-text");
    const topRightInput = document.getElementById("main-r") || document.getElementById("top-right-text");
    const textSizeInput = document.getElementById("text-size");
    const totalDuration = loadedImages.length * durationPerImg * 1000;
    
    let elapsed = Date.now() - window.videoStartTime;
    
    if (elapsed >= totalDuration) {
        isGenerating = false;
        if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
        bgAudioPlayer.pause();
        if (chunks.length > 0) {
            const videoBlob = new Blob(chunks, { type: 'video/mp4' });
            outputVideo.srcObject = null;
            outputVideo.src = URL.createObjectURL(videoBlob);
            outputVideo.load();
            outputVideo.play();
        }
        return;
    }
    
    let img = loadedImages[Math.floor(elapsed / (durationPerImg * 1000)) % loadedImages.length];
    if (img && ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        let scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        ctx.drawImage(img, (canvas.width - img.width * scale) / 2, (canvas.height - img.height * scale) / 2, img.width * scale, img.height * scale);
        ctx.restore();
        ctx.save();
        
        const currentTextSize = textSizeInput ? parseInt(textSizeInput.value) : 50;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        if (mainTextInput && mainTextInput.value) {
            ctx.font = `bold ${currentTextSize}px sans-serif`;
            ctx.shadowColor = "#ff007f";
            ctx.shadowBlur = 25;
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

// دالة معالجة ورفع الصور لمتصفح الويب المستضاف
function onImageChange(e) {
    loadedImages = [];
    let files = e.target.files;
    let loadedCount = 0;
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                loadedCount++;
                loadedImages.push(img);
                if (document.getElementById("file-status")) {
                    document.getElementById("file-status").innerText = "تم تحميل " + loadedCount + " صور بنجاح 📸";
                }
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(files[i]);
    }
}

// دالة معالجة ورفع الموسيقى لمتصفح الويب المستضاف
function onMusicChange(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        bgAudioPlayer.src = event.target.result;
        if (document.getElementById("file-status")) {
            document.getElementById("file-status").innerText = "تم تحميل الموسيقى بنجاح 🎵";
        }
    };
    reader.readAsDataURL(files[0]); // تم تعديلها لتقرأ الملف الأول للمستعرض بنجاح
}

function onBackClick() {
    isGenerating = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    bgAudioPlayer.pause();
    bgAudioPlayer.currentTime = 0;
    document.getElementById("video-output-screen").style.display = "none";
    document.getElementById("main-app-screen").style.display = "block";
    
    // إعادة إطلاق إعلان AdSense التلقائي عند العودة
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(err) {}

    const outputVideo = document.getElementById("outputVideo");
    if (outputVideo) {
        outputVideo.pause();
        outputVideo.src = "";
    }
}

function onGenerateClick() {
    if (loadedImages.length === 0) {
        alert("الرجاء رفع الصور أولاً!");
        return;
    }
    
    isGenerating = true;
    chunks = [];
    document.getElementById("main-app-screen").style.display = "none";
    document.getElementById("video-output-screen").style.display = "block";
    
    const canvas = document.getElementById("videoCanvas");
    canvas.width = 1080;
    canvas.height = 1920;
    ctx = canvas.getContext("2d");
    
    const videoStream = canvas.captureStream(30);
    let combinedStream = videoStream;
    let audioContext = null;
    
    if (bgAudioPlayer.src) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaElementSource(bgAudioPlayer);
            const dest = audioContext.createMediaStreamDestination();
            source.connect(dest);
            source.connect(audioContext.destination);
            const audioTracks = dest.stream.getAudioTracks();
            if (audioTracks.length > 0) {
                videoStream.addTrack(audioTracks[0]); // تم تعديلها لتسجيل الصوت للويب
            }
            combinedStream = videoStream;
        } catch (err) {
            console.log(err);
        }
    }
    
    const outputVideo = document.getElementById("outputVideo");
    outputVideo.srcObject = combinedStream;
    outputVideo.play().catch(function(e) {});
    
    if (bgAudioPlayer.src) {
        bgAudioPlayer.currentTime = 0;
        bgAudioPlayer.play().catch(function(e) {});
    }
    
    let options = { mimeType: 'video/webm; codecs=vp8,opus', videoBitsPerSecond: 2000000 };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/mp4' };
    }
    
    mediaRecorder = new MediaRecorder(combinedStream, options);
    mediaRecorder.ondataavailable = function(e) {
        if (e.data.size > 0) chunks.push(e.data);
    };
    
    mediaRecorder.onstop = function() {
        if (chunks.length > 0) {
            const videoBlob = new Blob(chunks, { type: 'video/mp4' });
            const downloadBtn = document.getElementById("download-btn");
            if (downloadBtn) {
                downloadBtn.style.display = "block";
                const newDownloadBtn = downloadBtn.cloneNode(true);
                downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
                newDownloadBtn.addEventListener("click", function(evt) {
                    evt.preventDefault();
                    saveVideoToDevice(videoBlob, "ai-video-" + Date.now() + ".mp4");
                });
            }
        }
        if (audioContext) audioContext.close();
    };
    
    mediaRecorder.start();
    window.videoStartTime = Date.now();
    drawFrame();
}

// دالة تشغيل الزر الترحيبي الأصلي والانتقال المباشر للويب مع تفعيل البانر
function onStartClicked() {
    document.getElementById('welcome-screen').style.display = 'none'; 
    document.getElementById('main-app-screen').style.display = 'block';
    
    // استدعاء البانر التلقائي من AdSense للويب عند الدخول للشاشة الرئيسية
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
}

// تأكيد ربط عناصر الـ DOM بالأحداث عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", function() {
    if (document.getElementById("image-input")) document.getElementById("image-input").onchange = onImageChange;
    if (document.getElementById("music-input")) document.getElementById("music-input").onchange = onMusicChange;
    if (document.getElementById("back-btn")) document.getElementById("back-btn").onclick = onBackClick;
    if (document.getElementById("generate-btn")) document.getElementById("generate-btn").onclick = onGenerateClick;
});
