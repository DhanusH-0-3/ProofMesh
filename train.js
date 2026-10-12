
const tf = require("@tensorflow/tfjs");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const { createModel, IMAGE_SIZE } = require("./model");

// ============================================
// 1. TRAINING SETTINGS
// ============================================

// Start with these values.
// Increase them later if training works well.
const TRAIN_PER_CLASS = 2000;
const TEST_PER_CLASS = 500;

const VALIDATION_FRACTION = 0.2;
const BATCH_SIZE = 32;
const EPOCHS = 10;

// Stop training if validation loss does not
// improve for this many consecutive epochs.
const PATIENCE = 3;

const ROOT = __dirname;

// Save to a new folder to protect the old model.
const OUTPUT_DIR = path.join(
  ROOT,
  "models",
  "proofmesh-cnn-improved"
);

// Labels:
// FAKE = 0
// REAL = 1

// ============================================
// 2. SHUFFLE ARRAY
// ============================================

function shuffle(items) {
  const array = [...items];

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));

    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}

// ============================================
// 3. LOAD RANDOM IMAGE FILE PATHS
// ============================================

function getImages(split, className, limit) {
  const folder = path.join(
    ROOT,
    "data",
    split,
    className
  );

  if (!fs.existsSync(folder)) {
    throw new Error(
      `Dataset folder not found: ${folder}`
    );
  }

  const files = fs.readdirSync(folder)
    .filter(name => /\.(jpg|jpeg|png)$/i.test(name));

  if (files.length < limit) {
    throw new Error(
      `${folder} contains only ${files.length} images. ` +
      `Requested: ${limit}`
    );
  }

  // Randomly sample from the whole folder.
  const selectedFiles = shuffle(files).slice(0, limit);

  return selectedFiles.map(name => ({
    filePath: path.join(folder, name),
    label: className === "REAL" ? 1 : 0
  }));
}

// ============================================
// 4. IMAGE PREPROCESSING
// ============================================

// This must match predict.js:
// resize to 32x32, RGB, normalize to 0-1.

async function readImage(filePath) {
  const pixels = await sharp(filePath)
    .resize(IMAGE_SIZE, IMAGE_SIZE)
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer();

  const expectedLength =
    IMAGE_SIZE * IMAGE_SIZE * 3;

  if (pixels.length !== expectedLength) {
    throw new Error(
      `Unexpected image format: ${filePath}`
    );
  }

  return Float32Array.from(
    pixels,
    value => value / 255
  );
}

// ============================================
// 5. CREATE TENSORFLOW DATASET
// ============================================

function createDataset(samples, shouldShuffle) {
  const dataset = tf.data.generator(async function* () {
    const orderedSamples = shouldShuffle
      ? shuffle(samples)
      : samples;

    for (const sample of orderedSamples) {
      const pixels = await readImage(
        sample.filePath
      );

      yield {
        xs: tf.tensor3d(
          pixels,
          [IMAGE_SIZE, IMAGE_SIZE, 3]
        ),

        ys: tf.tensor1d([
          sample.label
        ])
      };
    }
  });

  return dataset.batch(BATCH_SIZE).prefetch(1);
}

// ============================================
// 6. SAVE MODEL FOR NODE.JS
// ============================================

// This saves model.json and weights.bin
// without requiring @tensorflow/tfjs-node.

async function saveModel(model, directory) {
  fs.mkdirSync(directory, {
    recursive: true
  });

  await model.save(
    tf.io.withSaveHandler(async artifacts => {
      const weights = Buffer.from(
        artifacts.weightData
      );

      fs.writeFileSync(
        path.join(directory, "weights.bin"),
        weights
      );

      const modelJson = {
        format: "layers-model",

        generatedBy:
          `TensorFlow.js ${tf.version.tfjs}`,

        convertedBy: null,

        modelTopology:
          artifacts.modelTopology,

        weightsManifest: [
          {
            paths: ["weights.bin"],
            weights: artifacts.weightSpecs
          }
        ]
      };

      fs.writeFileSync(
        path.join(directory, "model.json"),
        JSON.stringify(modelJson, null, 2)
      );

      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),

          modelTopologyType: "JSON",

          modelTopologyBytes:
            Buffer.byteLength(
              JSON.stringify(
                artifacts.modelTopology
              )
            ),

          weightSpecsBytes:
            Buffer.byteLength(
              JSON.stringify(
                artifacts.weightSpecs
              )
            ),

          weightDataBytes:
            weights.length
        }
      };
    })
  );
}

// ============================================
// 7. MAIN TRAINING FUNCTION
// ============================================

async function main() {
  console.log("\n==================================");
  console.log("   PROOFMESH CNN TRAINING");
  console.log("==================================\n");

  // ----------------------------------------
  // Select training images
  // ----------------------------------------

  const fakeTrain = getImages(
    "train",
    "FAKE",
    TRAIN_PER_CLASS
  );

  const realTrain = getImages(
    "train",
    "REAL",
    TRAIN_PER_CLASS
  );

  // Reserve some images for validation.
  const validationCount = Math.floor(
    TRAIN_PER_CLASS * VALIDATION_FRACTION
  );

  const validationSamples = shuffle([
    ...fakeTrain.slice(0, validationCount),
    ...realTrain.slice(0, validationCount)
  ]);

  const trainingSamples = shuffle([
    ...fakeTrain.slice(validationCount),
    ...realTrain.slice(validationCount)
  ]);

  // Use separate CIFAKE test folders.
  const testSamples = shuffle([
    ...getImages(
      "test",
      "FAKE",
      TEST_PER_CLASS
    ),

    ...getImages(
      "test",
      "REAL",
      TEST_PER_CLASS
    )
  ]);

  console.log(
    "Training images:",
    trainingSamples.length
  );

  console.log(
    "Validation images:",
    validationSamples.length
  );

  console.log(
    "Testing images:",
    testSamples.length
  );

  console.log(
    "Batch size:",
    BATCH_SIZE
  );

  console.log(
    "Maximum epochs:",
    EPOCHS
  );

  // ----------------------------------------
  // Create CNN
  // ----------------------------------------

  const model = createModel();

  console.log("\nCNN Architecture:\n");
  model.summary();

  // ----------------------------------------
  // Prepare datasets
  // ----------------------------------------

  const trainDataset = createDataset(
    trainingSamples,
    true
  );

  const validationDataset = createDataset(
    validationSamples,
    false
  );

  const trainBatches = Math.ceil(
    trainingSamples.length / BATCH_SIZE
  );

  const validationBatches = Math.ceil(
    validationSamples.length / BATCH_SIZE
  );

  console.log("\nStarting CNN training...\n");

  // ----------------------------------------
  // Train model
  // ----------------------------------------

  let bestValidationLoss = Infinity;
  let epochsWithoutImprovement = 0;
  let bestEpoch = 0;
  let bestWeights = null;

  try {
    await model.fitDataset(trainDataset, {
      epochs: EPOCHS,

      batchesPerEpoch: trainBatches,

      validationData: validationDataset,

      validationBatches: validationBatches,

      callbacks: {
        onBatchEnd: async (batch, logs) => {
          if (
            (batch + 1) % 10 === 0 ||
            batch + 1 === trainBatches
          ) {
            console.log(
              `Batch ${batch + 1}/${trainBatches} | ` +
              `Loss: ${logs.loss.toFixed(4)}`
            );
          }
        },

        onEpochEnd: async (epoch, logs) => {
          const accuracy =
            logs.acc ?? logs.accuracy ?? 0;

          const validationAccuracy =
            logs.val_acc ??
            logs.val_accuracy ??
            0;

          console.log(
            `\nEpoch ${epoch + 1}/${EPOCHS}`
          );

          console.log(
            `Training Loss: ${logs.loss.toFixed(4)}`
          );

          console.log(
            `Training Accuracy: ${(accuracy * 100).toFixed(2)}%`
          );

          console.log(
            `Validation Loss: ${logs.val_loss.toFixed(4)}`
          );

          console.log(
            `Validation Accuracy: ${(validationAccuracy * 100).toFixed(2)}%\n`
          );

          // Save the best weights in memory.
          if (
            logs.val_loss <
            bestValidationLoss - 0.0001
          ) {
            bestValidationLoss = logs.val_loss;
            bestEpoch = epoch + 1;
            epochsWithoutImprovement = 0;

            if (bestWeights) {
              bestWeights.forEach(
                tensor => tensor.dispose()
              );
            }

            bestWeights = model.getWeights();

            console.log(
              "Validation improved. Best weights updated."
            );
          } else {
            epochsWithoutImprovement++;

            console.log(
              `No validation improvement for ` +
              `${epochsWithoutImprovement} epoch(s).`
            );
          }

          if (
            epochsWithoutImprovement >= PATIENCE
          ) {
            console.log(
              "\nEarly stopping: validation loss stopped improving."
            );

            model.stopTraining = true;
          }
        }
      }
    });

    // Restore weights from the best epoch.
    if (bestWeights) {
      model.setWeights(bestWeights);

      console.log(
        `\nRestored model weights from epoch ${bestEpoch}.`
      );
    }

    // ----------------------------------------
    // Evaluate on unseen test images
    // ----------------------------------------

    console.log(
      "\nEvaluating on CIFAKE test images..."
    );

    const testDataset = createDataset(
      testSamples,
      false
    );

    const evaluation = await model.evaluateDataset(
      testDataset,
      {
        batches: Math.ceil(
          testSamples.length / BATCH_SIZE
        )
      }
    );

    const resultTensors = Array.isArray(evaluation)
      ? evaluation
      : [evaluation];

    const values = await Promise.all(
      resultTensors.map(
        tensor => tensor.data()
      )
    );

    const testLoss = values[0][0];
    const testAccuracy = values[1][0];

    console.log(
      `\nTest Loss: ${testLoss.toFixed(4)}`
    );

    console.log(
      `Test Accuracy: ${(testAccuracy * 100).toFixed(2)}%`
    );

    // ----------------------------------------
    // Save improved model
    // ----------------------------------------

    console.log("\nSaving improved CNN model...");

    await saveModel(model, OUTPUT_DIR);

    const metadata = {
      imageSize: IMAGE_SIZE,

      labels: {
        "0": "FAKE",
        "1": "REAL"
      },

      normalization: "pixel / 255",

      maximumEpochs: EPOCHS,

      bestEpoch,

      trainingImages:
        trainingSamples.length,

      validationImages:
        validationSamples.length,

      testImages:
        testSamples.length,

      testLoss,

      testAccuracy,

      savedAt:
        new Date().toISOString()
    };

    fs.writeFileSync(
      path.join(
        OUTPUT_DIR,
        "metadata.json"
      ),

      JSON.stringify(
        metadata,
        null,
        2
      )
    );

    resultTensors.forEach(
      tensor => tensor.dispose()
    );

    console.log("\n==================================");
    console.log("   TRAINING COMPLETED");
    console.log("==================================");

    console.log(
      `Best Epoch: ${bestEpoch}`
    );

    console.log(
      `Final Test Accuracy: ${(testAccuracy * 100).toFixed(2)}%`
    );

    console.log(
      `Model saved at: ${OUTPUT_DIR}`
    );

    console.log(
      "\nYour previous ProofMesh model is unchanged."
    );

  } finally {
    if (bestWeights) {
      bestWeights.forEach(
        tensor => tensor.dispose()
      );
    }
  }
}

// ============================================
// 8. RUN TRAINING
// ============================================

main().catch(error => {
  console.error("\nProofMesh training failed:");
  console.error(error);

  process.exitCode = 1;
});
