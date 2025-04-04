const URL = "./my_model/";

let model, webcam, labelContainer, maxPredictions;

// Expanded fun facts database (customize with your flower classes!)
const flowerFacts = {
    "Rose": "Roses have been cultivated for over 5,000 years and symbolize love!",
    "Tulip": "Tulips were once more valuable than gold in 17th-century Holland!",
    "Sunflower": "Sunflowers can grow up to 12 feet tall and follow the sun!",
    "Daisy": "Daisies are actually two flowers in one—a white and a yellow one!",
    "Lily": "Lilies are known as the flower of purity and can live for years!",
    "Orchid": "Orchids can bloom for up to 3 months and come in over 25,000 species!",
    "Default": "Not sure what this is, but flowers brighten any day!"
};

// Detect if the device is mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Get a fun fact based on the flower
function getFunFact(flowerName) {
    return flowerFacts[flowerName] || flowerFacts["Default"];
}

// Show popup with title and fact
function showPopup(title, fact) {
    const popup = document.getElementById("popup");
    document.getElementById("popup-title").textContent = title;
    document.getElementById("popup-fact").textContent = fact;
    popup.style.display = "block";
}

// Hide popup
document.getElementById("close-popup").onclick = function() {
    document.getElementById("popup").style.display = "none";
};

async function init() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        if (webcam) {
            await webcam.stop();
            document.getElementById("webcam-container").innerHTML = "";
        }

        const preferredFacingMode = isMobileDevice() ? "environment" : "user";
        try {
            webcam = new tmImage.Webcam(300, 300, false, { facingMode: preferredFacingMode });
            await webcam.setup({ facingMode: preferredFacingMode });
            await webcam.play();
        } catch (error) {
            console.warn(`Failed to initialize ${preferredFacingMode} camera:`, error);
            const fallbackFacingMode = preferredFacingMode === "environment" ? "user" : "environment";
            webcam = new tmImage.Webcam(300, 300, false, { facingMode: fallbackFacingMode });
            await webcam.setup({ facingMode: fallbackFacingMode });
            await webcam.play();
        }

        document.getElementById("webcam-container").appendChild(webcam.canvas);
        labelContainer = document.getElementById("label-container");

        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }
        
        document.getElementById("start-btn").disabled = true;
        window.requestAnimationFrame(loop);
    } catch (error) {
        console.error("Error initializing the classifier:", error);
        alert("Failed to initialize webcam. Please ensure camera permissions are granted and a camera is available.");
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
                    <circle class="meter-bg" cx="25" cy="25" r="20"></circle>
                    <circle class="meter-fill" cx="25" cy="25" r="20" stroke-dasharray="${probability * 2.51327}, 125.6637"></circle>
                </svg>
            </div>
            <span class="probability-value">${probability}%</span>
        `;
        labelContainer.childNodes[i].innerHTML = classPrediction;

        if (prediction[i].probability > highestProb) {
            highestProb = prediction[i].probability;
            topFlower = prediction[i].className;
        }
    }

    // Show popup based on confidence
    if (highestProb > 0.7) { // 70% confidence threshold
        showPopup(`Identified: ${topFlower}`, getFunFact(topFlower));
        // Uncomment the next line if you add the audio element and a ding.mp3 file
        document.getElementById("ding").play();
    } else {
        showPopup("Hmm, what's this?", getFunFact("Default"));
    }
}