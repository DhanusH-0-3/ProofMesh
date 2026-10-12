
const imageInput = document.getElementById("imageInput");
const chooseBtn = document.getElementById("chooseBtn");
const dropZone = document.getElementById("dropZone");
const placeholder = document.getElementById("uploadPlaceholder");
const preview = document.getElementById("preview");
const fileDetails = document.getElementById("fileDetails");
const fileName = document.getElementById("fileName");
const removeBtn = document.getElementById("removeBtn");
const analyzeBtn = document.getElementById("analyzeBtn");
const result = document.getElementById("result");

let selectedFile = null;
let previewUrl = null;
let isAnalyzing = false;

// Display a message inside the result area
function showMessage(message, type = "info") {
  result.replaceChildren();

  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  paragraph.className = `result-message ${type}`;

  result.appendChild(paragraph);
}

// Display the CNN prediction
function showPrediction(data) {
  result.replaceChildren();

  const card = document.createElement("div");
  card.className = "prediction-card";

  const heading = document.createElement("h3");
  heading.textContent = "AI Image Analysis Result";

  const prediction = document.createElement("div");
  prediction.className =
    data.prediction === "REAL"
      ? "prediction-label real"
      : "prediction-label fake";

  prediction.textContent =
    data.prediction === "REAL"
      ? "REAL IMAGE"
      : "AI-GENERATED IMAGE";

  const confidence = document.createElement("p");
  confidence.className = "confidence-text";
  confidence.textContent =
    `Model score: ${Number(data.confidence).toFixed(2)}%`;

  const realText = document.createElement("p");
  realText.textContent =
    `REAL score: ${Number(data.realProbability).toFixed(2)}%`;

  const fakeText = document.createElement("p");
  fakeText.textContent =
    `FAKE score: ${Number(data.fakeProbability).toFixed(2)}%`;

  const warning = document.createElement("p");
  warning.className = "prediction-warning";
  warning.textContent =
    "Experimental result: This model was trained on a small dataset and currently has approximately 50% test accuracy. Do not rely on this prediction to verify image authenticity.";

  card.append(
    heading,
    prediction,
    confidence,
    realText,
    fakeText,
    warning
  );

  result.appendChild(card);
}

// Show the selected image
function showImage(file) {
  if (!file || isAnalyzing) return;

  if (!["image/jpeg", "image/png"].includes(file.type)) {
    showMessage("Please choose a JPG or PNG image.", "error");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showMessage("Image size must be under 5 MB.", "error");
    return;
  }

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
  }

  selectedFile = file;
  previewUrl = URL.createObjectURL(file);

  preview.src = previewUrl;
  preview.hidden = false;

  placeholder.hidden = true;
  fileDetails.hidden = false;

  fileName.textContent = file.name;

  showMessage("Image ready for AI analysis.");
}

// Choose image button
chooseBtn.addEventListener("click", (event) => {
  event.stopPropagation();

  if (!isAnalyzing) {
    imageInput.click();
  }
});

// Click upload area
dropZone.addEventListener("click", () => {
  if (!isAnalyzing) {
    imageInput.click();
  }
});

// Image selected
imageInput.addEventListener("change", () => {
  showImage(imageInput.files[0]);
});

// Drag image over upload area
dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();

  if (!isAnalyzing) {
    dropZone.classList.add("dragover");
  }
});

// Image dragged away
dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

// Drop image
dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");

  if (!isAnalyzing) {
    showImage(event.dataTransfer.files[0]);
  }
});

// Remove selected image
removeBtn.addEventListener("click", () => {
  if (isAnalyzing) return;

  selectedFile = null;
  imageInput.value = "";

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  preview.removeAttribute("src");
  preview.hidden = true;

  placeholder.hidden = false;
  fileDetails.hidden = true;

  result.replaceChildren();
});

// Analyze image with the trained CNN
analyzeBtn.addEventListener("click", async () => {
  if (isAnalyzing) return;

  if (!selectedFile) {
    showMessage("Please choose an image first.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("image", selectedFile);

  isAnalyzing = true;
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing...";

  showMessage("AI model is analyzing your image...");

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData
    });

    const type = response.headers.get("content-type") || "";

   if (!type.includes("application/json")) {
  const responseText = await response.text();

  console.error("HTTP status:", response.status);
  console.error("Content type:", type);
  console.error("Server response:", responseText);

  throw new Error(
    `Backend returned HTTP ${response.status} instead of JSON. Check the browser console.`
  );
}

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Image analysis failed.");
    }

    if (
      !data.prediction ||
      typeof data.confidence !== "number"
    ) {
      throw new Error(
        "The backend did not return a CNN prediction."
      );
    }

    showPrediction(data);

  } catch (error) {
    showMessage("Error: " + error.message, "error");

  } finally {
    isAnalyzing = false;
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "✧ Analyze Image";
  }
});
