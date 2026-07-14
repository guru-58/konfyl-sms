import './src/config/env.js';
import { db } from './src/config/firebaseAdmin.js';

async function check() {
  try {
    const mrId = '7yXpAM0jPwXb8bSh2Q3j';
    
    // 1. Get MR assignments
    console.log(`Checking territory assignments for MR ID: ${mrId}`);
    const terrSnap = await db.collection('territoryAssignments')
      .where('employeeId', '==', mrId)
      .get();
      
    console.log('--- TERRITORY ASSIGNMENTS ---');
    terrSnap.forEach(doc => {
      console.log(`ID: ${doc.id} | Data:`, JSON.stringify(doc.data()));
    });

    // 2. Print all territories in the system to verify codes and names
    console.log('\n--- ALL TERRITORIES MASTER ---');
    const allTerrSnap = await db.collection('territories').get();
    allTerrSnap.forEach(doc => {
      console.log(`ID: ${doc.id} | Name: ${doc.data().name} | Code: ${doc.data().code} | Status: ${doc.data().activeStatus}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

check();
