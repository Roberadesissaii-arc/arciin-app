/**
 * Script to create an admin user in Firebase
 * Run with: node scripts/create-admin.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Initialize Firebase Admin
const serviceAccount = require('../firebase-admin-key.json'); // You'll need to create this

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function createAdminUser() {
  const email = 'admin@arcinema.com';
  
  return new Promise((resolve) => {
    rl.question('Enter password for admin@arcinema.com: ', async (password) => {
      try {
        // Create the user
        const userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          emailVerified: true,
          displayName: 'Admin'
        });

        console.log('✅ Successfully created admin user:', userRecord.uid);
        console.log('Email:', email);
        
        // Create user document in Firestore
        await admin.firestore().collection('users').doc(userRecord.uid).set({
          uid: userRecord.uid,
          email: email,
          username: 'admin',
          displayName: 'Admin',
          photoURL: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isAdmin: true
        });

        console.log('✅ Created user document in Firestore');
        
        resolve();
      } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        resolve();
      }
      
      rl.close();
    });
  });
}

createAdminUser().then(() => {
  process.exit(0);
});
