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
window.pendingVideoBlob = null;

window.executeVideoSave = function() {
    const videoBlob = window.pendingVideoBlob;
    if (!videoBlob) return;
    
    const fileName = "ai-video-" + Date.now() + ".mp4";
    const reader = new FileReader();
    reader.onloadend = function() {
        const base64Data = reader.result;
        if (typeof AndroidAds !== 'undefined' && AndroidAds.saveVideoFile) {
            AndroidAds.saveVideoFile(base64Data, fileName);
        } else {
            const link = document.createElement("a");
            link.href = base64Data;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };
    reader.readAsDataURL(videoBlob);
};

function drawFrame() {
    if (!isGenerating) return;
    
    const durationSlider = document.getElementById("durationPerImg");
    const durationPerImg = durationSlider ? parseFloat(durationSlider.value) : 3;
    const canvas = document.getElementById("videoCanvas");
    const mainTextInput = document.getElementById("main-c");
    const topLeftInput = document.getElementById("top-left-text");
    const topRightInput = document.getElementById("top-right-text");
    const textSizeInput = document.getElementById("text-size");
    const totalDuration = loadedImages.length * durationPerImg * 1000;
    
    let elapsed = Date.now() - window.videoStartTime;
    
    if (elapsed >= totalDuration) {
        isGenerating = false;
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
        bgAudioPlayer.pause();
        return;
    }
    
    let index = Math.floor(elapsed / (durationPerImg * 1000)) % loadedImages.length;
    let img = loadedImages[index];
    
    if (img && ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        let scale = Math.max(canvas.width / img.width, canvas.height / img.height);
        ctx.drawImage(img, (canvas.width - img.width * scale) / 2, (canvas.height - img.height * scale) / 2, img.width * scale, img.height * scale);
        
        const currentTextSize = textSizeInput ? parseInt(textSizeInput.value) : 50;
        const textColorPicker = document.getElementById("text-color-picker");
        ctx.fillStyle = textColorPicker ? textColorPicker.value : "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        if (mainTextInput && mainTextInput.value) {
            ctx.font = "bold " + currentTextSize + "px sans-serif";
            ctx.fillText(mainTextInput.value, canvas.width / 2, canvas.height / 2);
        }
        
        ctx.font = "bold 40px sans-serif";
        if (topLeftInput && topLeftInput.value) { 
            ctx.textAlign = "left"; 
            ctx.fillText(topLeftInput.value, 80, 200); 
        }
        if (topRightInput && topRightInput.value) { 
            ctx.textAlign = "right"; 
            ctx.fillText(topRightInput.value, canvas.width - 80, 200); 
        }
    }
    animationFrameId = requestAnimationFrame(drawFrame);
}

function handleImages(files) {
    loadedImages = [];
    let loadedCount = 0;
    if (!files || files.length === 0) return;
    
    for (let i = 0; i < files.length; i++) {
        const img = new Image();
        img.onload = function() {
            loadedCount++;
            loadedImages.push(img);
            const status = document.getElementById("file-status");
            if (status) status.innerText = "تم تحميل " + loadedCount + " صور بنجاح 📸";
        };
        img.src = URL.createObjectURL(files.item(i));
    }
}

function handleMusic(files) {
    if (!files || files.length === 0) return;
    const audioFile = files.item(0);
    bgAudioPlayer.src = URL.createObjectURL(audioFile);
    bgAudioPlayer.load();
    const status = document.getElementById("file-status");
    if (status) status.innerText = "تم تحميل الموسيقى بنجاح 🎵";
}

function onBackClick() {
    isGenerating = false;
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    bgAudioPlayer.pause();
    bgAudioPlayer.currentTime = 0;
    
    document.getElementById("video-output-screen").style.display = "none";
    document.getElementById("main-app-screen").style.display = "block";
    
    if (typeof AndroidAds !== 'undefined') {
        AndroidAds.showTopBanner();
    }
    
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
    
    if (typeof AndroidAds !== 'undefined') {
        AndroidAds.hideTopBanner();
    }
    
    isGenerating = true;
    chunks = [];
    document.getElementById("main-app-screen").style.display = "none";
    document.getElementById("video-output-screen").style.display = "block";
    
    const outputVideo = document.getElementById("outputVideo");
    const canvas = document.getElementById("videoCanvas");
    
    if (outputVideo) outputVideo.style.display = "none";
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.borderRadius = "15px";
    canvas.width = 720;
    canvas.height = 1280;
    ctx = canvas.getContext("2d");
    
    const videoStream = canvas.captureStream(30);
    let audioContext = null;
    
    if (bgAudioPlayer.src) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            const source = audioContext.createMediaElementSource(bgAudioPlayer);
            const dest = audioContext.createMediaStreamDestination();
            source.connect(dest);
            source.connect(audioContext.destination);
            const tracks = dest.stream.getAudioTracks();
            if (tracks && tracks.length > 0) {
                videoStream.addTrack(tracks[0]);
            }
        } catch (err) {
            console.log(err);
        }
    }
    
    if (bgAudioPlayer.src) {
        bgAudioPlayer.currentTime = 0;
        bgAudioPlayer.play().catch(function() {});
    }
    
    let options = { mimeType: 'video/webm;codecs=vp8,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = {};
    }
    
    mediaRecorder = new MediaRecorder(videoStream, options);
    mediaRecorder.ondataavailable = function(e) {
        if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    
    mediaRecorder.onstop = function() {
        if (chunks.length > 0) {
            window.pendingVideoBlob = new Blob(chunks, { type: 'video/mp4' });
            const videoUrl = URL.createObjectURL(window.pendingVideoBlob);
            
            canvas.style.display = "none";
            if (outputVideo) {
                outputVideo.style.display = "block";
                outputVideo.muted = false;
                outputVideo.src = videoUrl;
                outputVideo.load();
                outputVideo.play();
            }
            
            const downloadBtn = document.getElementById("download-btn");
            if (downloadBtn) {
                downloadBtn.style.display = "block";
                downloadBtn.onclick = function(evt) {
                    evt.preventDefault();
                    if (typeof AndroidAds !== 'undefined') {
                        AndroidAds.showUnityAd();
                    } else {
                        window.executeVideoSave();
                    }
                };
            }
        }
        if (audioContext) audioContext.close();
    };
    
    mediaRecorder.start(200);
    window.videoStartTime = Date.now();
    drawFrame();
}

document.addEventListener("DOMContentLoaded", function() {
    const startBtn = document.getElementById("start-btn");
    if (startBtn) {
        startBtn.onclick = function() {
            document.getElementById("welcome-screen").style.display = "none";
            document.getElementById("main-app-screen").style.display = "block";
            if (typeof AndroidAds !== 'undefined') {
                AndroidAds.showTopBanner();
            }
        };
    }

    const imgInp = document.getElementById("image-input");
    if (imgInp) imgInp.onchange = function(e) { handleImages(e.target.files); };
    
    const musInp = document.getElementById("music-input");
    if (musInp) musInp.onchange = function(e) { handleMusic(e.target.files); };
    
    const backBtn = document.getElementById("back-btn");
    if (backBtn) backBtn.onclick = onBackClick;
    
    const genBtn = document.getElementById("generate-btn");
    if (genBtn) genBtn.onclick = onGenerateClick;
});
