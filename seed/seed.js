// seed/seed.js
import admin from "firebase-admin";
import fs from "fs";

// Firebaseサービスアカウントキーの読み込み
const serviceAccount = JSON.parse(
  fs.readFileSync("./serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// seed data
const data = JSON.parse(fs.readFileSync("./seed/firestore.json", "utf8"));

async function run() {
  console.log("Seeding Firestore...");

  for (const [collectionName, docs] of Object.entries(data)) {
    for (const [docId, docData] of Object.entries(docs)) {
      await db.collection(collectionName).doc(docId).set(docData);
      console.log(`✔ ${collectionName}/${docId} 書き込み完了`);
    }
  }

  console.log("🎉 全データ書き込み完了！");
  process.exit();
}

run();

