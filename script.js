const URL = "./my_model/";

let model, webcam, labelContainer, maxPredictions;

async function init() {
    try {
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        // Load model
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        // Get selected camera facing direction
        const facingMode = document.getElementById("camera-facing").value;

        // Setup webcam with selected facing mode
        webcam = new tmImage.Webcam(300, 300, true, { facingMode: facingMode });
        await webcam.setup();
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
        document.getElementById("camera-facing").disabled = true; // Disable dropdown after start
    } catch (error) {
        console.error("Error initializing the classifier:", error);
        alert("Failed to initialize webcam. Please check camera permissions.");
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