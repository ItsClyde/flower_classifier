const URL = "./my_model/";

let model, webcam, labelContainer, maxPredictions;

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
            document.getElementById("webcam-container").innerHTML = ""; // Clear previous canvas
        }

        // Force back camera (environment facing mode)
        webcam = new tmImage.Webcam(300, 300, false, { facingMode: "environment" });
        await webcam.setup({ facingMode: "environment" }); // Explicitly set back camera
        await webcam.play();
        window.requestAnimationFrame(loop);

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
        alert("Failed to initialize back camera. Please ensure camera permissions are granted and your device supports a rear camera.");
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