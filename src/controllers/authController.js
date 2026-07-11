import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { collection, query, where, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'konfyl-jwt-default-secret-key-98765';

export const signup = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields (name, email, password, role) are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  const validRoles = ['mr', 'rsm', 'zsm', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be mr, rsm, zsm, or admin.' });
  }

  try {
    // Check if email already exists
    const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user document in Firestore
    const userDocRef = await addDoc(collection(db, 'users'), {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      createdAt: new Date().toISOString()
    });

    const userProfile = {
      id: userDocRef.id,
      name,
      email: email.toLowerCase(),
      role
    };

    // Generate JWT
    const token = jwt.sign(userProfile, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ token, user: userProfile });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Error during signup registration.' });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    // Find user in Firestore
    const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Check password
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const userProfile = {
      id: userDoc.id,
      name: userData.name,
      email: userData.email,
      role: userData.role
    };

    // Generate JWT
    const token = jwt.sign(userProfile, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ token, user: userProfile });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error during login authentication.' });
  }
};

export const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  res.status(200).json({ user: req.user });
};
