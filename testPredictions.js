
const fs = require("fs");
const path = require("path");
const { loadModel, predictImage } = require("./backend/predict");

async function testClass(className) {
  const folder = path.join(
    __dirname,
    "data",
    "test",
    className
  );

  const files = fs.readdirSync(folder)
    .filter(name => /\.(jpg|jpeg|png)$/i.test(name))
    .slice(0, 10);

  let correct = 0;

  console.log(`\nTesting ${className} images:`);

  for (const filename of files) {
    const imageBuffer = fs.readFileSync(
      path.join(folder, filename)
    );

    const result = await predictImage(imageBuffer);

    if (result.prediction === className) {
      correct++;
    }

    console.log(
      `${filename} | ` +
      `Predicted: ${result.prediction} | ` +
      `REAL: ${result.realProbability}% | ` +
      `FAKE: ${result.fakeProbability}%`
    );
  }

  console.log(
    `${className} correct: ${correct}/${files.length}`
  );
}

async function main() {
  await loadModel();

  await testClass("REAL");
  await testClass("FAKE");

  console.log("\nPrediction test completed.");
}

main().catch(console.error);
