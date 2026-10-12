
const tf = require("@tensorflow/tfjs");

const IMAGE_SIZE = 32;

// Create the CNN architecture
function createModel() {
  const model = tf.sequential();

  // First convolution layer
  model.add(tf.layers.conv2d({
    inputShape: [IMAGE_SIZE, IMAGE_SIZE, 3],
    filters: 32,
    kernelSize: 3,
    padding: "same",
    activation: "relu"
  }));

  model.add(tf.layers.maxPooling2d({
    poolSize: [2, 2]
  }));

  // Second convolution layer
  model.add(tf.layers.conv2d({
    filters: 64,
    kernelSize: 3,
    padding: "same",
    activation: "relu"
  }));

  model.add(tf.layers.maxPooling2d({
    poolSize: [2, 2]
  }));

  // Third convolution layer
  model.add(tf.layers.conv2d({
    filters: 128,
    kernelSize: 3,
    padding: "same",
    activation: "relu"
  }));

  model.add(tf.layers.maxPooling2d({
    poolSize: [2, 2]
  }));

  // Convert feature maps into one vector
  model.add(tf.layers.flatten());

  model.add(tf.layers.dense({
    units: 128,
    activation: "relu"
  }));

  // Reduce overfitting
  model.add(tf.layers.dropout({
    rate: 0.3
  }));

  // Binary classification
  // 0 = FAKE, 1 = REAL
  model.add(tf.layers.dense({
    units: 1,
    activation: "sigmoid"
  }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: "binaryCrossentropy",
    metrics: ["accuracy"]
  });

  return model;
}

module.exports = {
  createModel,
  IMAGE_SIZE
};
