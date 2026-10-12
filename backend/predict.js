
require("dotenv").config();

const axios = require("axios");
const FormData = require("form-data");

async function predictImage(imageBuffer, mimeType = "image/jpeg") {  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    throw new Error(
      "Sightengine API credentials are missing in .env"
    );
  }

  const form = new FormData();

 form.append("media", imageBuffer, {
  filename: mimeType === "image/png"
    ? "uploaded-image.png"
    : "uploaded-image.jpg",
  contentType: mimeType
});

  form.append("models", "genai");
  form.append("api_user", apiUser);
  form.append("api_secret", apiSecret);

  const response = await axios.post(
    "https://api.sightengine.com/1.0/check.json",
    form,
    {
      headers: form.getHeaders(),
      timeout: 30000
    }
  );

  const result = response.data;

  if (result.status !== "success") {
    throw new Error(
      result.error?.message ||
      "Sightengine analysis failed"
    );
  }

  const fakeProbability =
    result.type?.ai_generated;

  if (
    typeof fakeProbability !== "number" ||
    !Number.isFinite(fakeProbability) ||
    fakeProbability < 0 ||
    fakeProbability > 1
  ) {
    throw new Error(
      "Sightengine did not return a valid AI detection score"
    );
  }

  const realProbability = 1 - fakeProbability;

  const prediction =
    fakeProbability >= 0.5 ? "FAKE" : "REAL";

  return {
    prediction,

    confidence: Number(
      (
        Math.max(fakeProbability, realProbability) * 100
      ).toFixed(2)
    ),

    realProbability: Number(
      (realProbability * 100).toFixed(2)
    ),

    fakeProbability: Number(
      (fakeProbability * 100).toFixed(2)
    )
  };
}

module.exports = {
  predictImage
};
