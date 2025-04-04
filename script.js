const URL = "./my_model/";

let model, webcam, labelContainer, maxPredictions;

// Function to detect if the device is mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

async function init() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        // Load model
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // If webcam exists, stop it first
        if (webcam) {
            await webcam.stop();
            document.getElementById("webcam-container").innerHTML = "";
        }

        // Choose camera based on device type
        const preferredFacingMode = isMobileDevice() ? "environment" : "user"; // Back cam for mobile, front for laptop

        // Try preferred camera first
        try {
            webcam = new tmImage.Webcam(300, 300, false, { facingMode: preferredFacingMode });
            await webcam.setup({ facingMode: preferredFacingMode });
            await webcam.play();
        } catch (error) {
            console.warn(`Failed to initialize ${preferredFacingMode} camera:`, error);
            // Fallback to the other camera if the preferred one fails
            const fallbackFacingMode = preferredFacingMode === "environment" ? "user" : "environment";
            webcam = new tmImage.Webcam(300, 300, false, { facingMode: fallbackFacingMode });
            await webcam.setup({ facingMode: fallbackFacingMode });
            await webcam.play();
        }

        // Append webcam canvas
        document.getElementById("webcam-container").appendChild(webcam.canvas);
        labelContainer = document.getElementById("label-container");

        // Create prediction containers
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }
        
        document.getElementById("start-btn").disabled = true;
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
    for (let i = 0; i < maxPredictions; i++) {
        const probability = (prediction[i].probability * 100).toFixed(1);
        const classPrediction = `
            <span class="class-name">${prediction[i].className}</span>
            <div class="probability-bar">
                <div class="progress" style="width: ${probability}%"></div>
            </div>
            <span class="probability-value">${probability}%</span>
        `;
        labelContainer.childNodes[i].innerHTML = classPrediction;
    }
}