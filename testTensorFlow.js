
const tf = require("@tensorflow/tfjs");
const sharp = require("sharp");

async function test() {
  console.log("ProofMesh AI Setup Test");

  const tensor = tf.tensor([1, 2, 3, 4]);

  console.log("TensorFlow.js version:", tf.version.tfjs);
  console.log("Tensor values:", await tensor.array());

  const image = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: "#2563eb"
    }
  }).png().toBuffer();

  const metadata = await sharp(image).metadata();

  console.log("Sharp image width:", metadata.width);
  console.log("Sharp image height:", metadata.height);
  console.log("AI setup successful!");

  tensor.dispose();
}

test().catch(console.error);
