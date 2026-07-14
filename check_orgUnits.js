import './src/config/env.js';
import { db } from './src/config/firebaseAdmin.js';

async function check() {
  try {
    console.log('FIRESTORE_EMULATOR_HOST:', process.env.FIRESTORE_EMULATOR_HOST);
    const collections = await db.listCollections();
    for (const col of collections) {
      const snap = await db.collection(col.id).get();
      console.log(`Collection: ${col.id} | Size: ${snap.size}`);
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
check();
