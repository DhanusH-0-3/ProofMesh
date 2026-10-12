
const fs = require("fs");
const path = require("path");

const folders = [
  "data/train/REAL",
  "data/train/FAKE",
  "data/test/REAL",
  "data/test/FAKE"
];

console.log("Checking ProofMesh Dataset...\n");

for (const folder of folders) {
  const folderPath = path.join(__dirname, folder);

  if (!fs.existsSync(folderPath)) {
    console.log(`${folder}: Folder not found`);
    continue;
  }

  const files = fs.readdirSync(folderPath)
    .filter(file => /\.(jpg|jpeg|png)$/i.test(file));

  console.log(`${folder}: ${files.length} images`);
}

console.log("\nDataset check completed!");
