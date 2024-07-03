import admin from "firebase-admin";
export default function connectToFireBase() {
  try {
    admin.initializeApp({
      // Your Firebase service account credentials
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/gm, "\n"),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    console.log("connected to firebase successfully.");
  } catch (error) {
    console.error(error);
  }
}
