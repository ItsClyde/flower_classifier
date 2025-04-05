const URL = "./my_model/";

let model, webcam, labelContainer, maxPredictions;
let lastTopFlower = "";
let stableCount = 0;
let popupCooldown = 0;
let history = [];

const flowerFacts = {
    "Rose": "Roses have been cultivated for over 5,000 years and symbolize love!",
    "Tulip": "Tulips were once more valuable than gold in 17th-century Holland!",
    "Sunflower": "Sunflowers can grow up to 12 feet tall and follow the sun!",
    "Daisy": "Daisies are actually two flowers in one—a white and a yellow one!",
    "Lily": "Lilies are known as the flower of purity and can live for years!",
    "Orchid": "Orchids can bloom for up to 3 months and come in over 25,000 species!",
    "Default": "Not sure what this is, but flowers brighten any day!"
};

function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function getFunFact(flowerName) {
    return flowerFacts[flowerName] || flowerFacts["Default"];
}

function showPopup(title, fact) {
    const popup = document.getElementById("popup");
    document.getElementById("popup-title").textContent = title;
    document.getElementById("popup-fact").textContent = fact;
    popup.style.display = "block";
    popupCooldown = Date.now() + 5000;
    document.getElementById("ding").play();
}

document.getElementById("close-popup").onclick = function() {
    document.getElementById("popup").style.display = "none";
};

// Function to find DroidCam device
async function getDroidCamDevice() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.find(device => 
        device.kind === "videoinput" && 
        (device.label.includes("DroidCam") || device.label.includes("Android"))
    );
}

async function init() {
    try {
        document.getElementById("loading").style.display = "flex";
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        if (webcam) {
            await webcam.stop();
            document.getElementById("webcam-container").innerHTML = "";
        }

        // Try to get DroidCam device first
        const droidCamDevice = await getDroidCamDevice();
        const constraints = droidCamDevice 
            ? { deviceId: { exact: droidCamDevice.deviceId } } 
            : (isMobileDevice() ? { facingMode: "environment" } : { facingMode: "user" });

        try {
            webcam = new tmImage.Webcam(300, 300, false, constraints);
            await webcam.setup(constraints);
            await webcam.play();
        } catch (error) {
            console.warn(`Failed to initialize DroidCam:`, error);
            // Fallback to default camera
            const fallbackConstraints = { facingMode: "user" };
            webcam = new tmImage.Webcam(300, 300, false, fallbackConstraints);
            await webcam.setup(fallbackConstraints);
            await webcam.play();
        }

        document.getElementById("webcam-container").appendChild(webcam.canvas);
        labelContainer = document.getElementById("label-container");

        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }
        
        document.getElementById("start-btn").disabled = true;
        document.getElementById("snapshot-btn").disabled = false;
        document.getElementById("loading").style.display = "none";
        window.requestAnimationFrame(loop);
    } catch (error) {
        console.error("Error initializing the classifier:", error);
        alert("Failed to initialize webcam. Please ensure camera permissions are granted and DroidCam is running.");
        document.getElementById("loading").style.display = "none";
    }
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    let highestProb = 0;
    let topFlower = "";

    for (let i = 0; i < maxPredictions; i++) {
        const probability = (prediction[i].probability * 100).toFixed(1);
        const classPrediction = `
            <span class="class-name">${prediction[i].className}</span>
            <div class="confidence-meter">
                <svg width="50" height="50">
                    <circle class="meter-bg" cx="25" cy="25" r="20" stroke-width="5" fill="none"></circle>
                    <circle class="meter-fill" cx="25" cy="25" r="20" stroke-width="5" stroke-dasharray="${probability * 2.51327}, 125.6637" fill="none"></circle>
                </svg>
            </div>
            <span class="probability-value">${probability}%</span>
        `;
        labelContainer.childNodes[i].innerHTML = classPrediction;
        labelContainer.childNodes[i].classList.remove("top-prediction");

        if (prediction[i].probability > highestProb) {
            highestProb = prediction[i].probability;
            topFlower = prediction[i].className;
        }
    }

    const topIndex = Array.from(prediction).findIndex(p => p.className === topFlower);
    labelContainer.childNodes[topIndex].classList.add("top-prediction");

    const threshold = document.getElementById("confidence-threshold").value / 100;
    if (highestProb > threshold) {
        if (topFlower === lastTopFlower) {
            stableCount++;
            document.getElementById("error-feedback").textContent = "";
        } else {
            stableCount = 0;
            lastTopFlower = topFlower;
        }
    } else {
        stableCount = 0;
        lastTopFlower = "";
        document.getElementById("error-feedback").textContent = "No flower detected";
    }
}

async function snapshot() {
    const prediction = await model.predict(webcam.canvas);
    let highestProb = 0;
    let topFlower = "";

    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability > highestProb) {
            highestProb = prediction[i].probability;
            topFlower = prediction[i].className;
        }
    }

    const threshold = document.getElementById("confidence-threshold").value / 100;
    if (highestProb > threshold && Date.now() > popupCooldown) {
        showPopup(`Identified: ${topFlower}`, getFunFact(topFlower));
        addToHistory(topFlower, highestProb);
    }
}

function addToHistory(flower, probability) {
    history.unshift({ flower, probability: (probability * 100).toFixed(1) });
    if (history.length > 5) history.pop();
    const historyList = document.getElementById("history-list");
    historyList.innerHTML = history.map(item => 
        `<li>${item.flower}: ${item.probability}%</li>`
    ).join("");
}

document.getElementById("confidence-threshold").addEventListener("input", function() {
    document.getElementById("threshold-value").textContent = `${this.value}%`;
});