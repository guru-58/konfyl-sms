import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { collection, query, where, getDocs, addDoc, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'konfyl-jwt-default-secret-key-98765';

export const signup = async (req, res) => {
  const { 
    name, email, password, role, 
    employeeCode, firstName, lastName, mobile, 
    joiningDate, employmentStatus, currentHeadquartersId 
  } = req.body;

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

    // Verify employeeCode is unique if provided
    if (employeeCode) {
      const qCode = query(collection(db, 'users'), where('employeeCode', '==', employeeCode.toUpperCase().trim()));
      const codeSnapshot = await getDocs(qCode);
      if (!codeSnapshot.empty) {
        return res.status(400).json({ error: 'Employee code already exists.' });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const userPayload = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      changeForcePassword: true,
      createdAt: new Date().toISOString(),
      employeeCode: employeeCode ? employeeCode.toUpperCase().trim() : null,
      firstName: firstName || null,
      lastName: lastName || null,
      mobile: mobile || null,
      joiningDate: joiningDate || null,
      employmentStatus: employmentStatus || 'ACTIVE',
      currentHeadquartersId: currentHeadquartersId || null
    };

    // Create user document in Firestore
    const userDocRef = await addDoc(collection(db, 'users'), userPayload);

    const userProfile = {
      id: userDocRef.id,
      name,
      email: email.toLowerCase(),
      role,
      changeForcePassword: true,
      employeeCode: userPayload.employeeCode,
      employmentStatus: userPayload.employmentStatus
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

    const isDefaultPassword = password === 'password@123' || password === 'password123';
    const forceChange = userData.changeForcePassword === true || isDefaultPassword;

    const userProfile = {
      id: userDoc.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      changeForcePassword: forceChange
    };

    // Generate JWT
    const token = jwt.sign(userProfile, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ token, user: userProfile });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Error during login authentication.' });
  }
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  try {
    const userId = req.user.id;
    const userDocRef = doc(db, 'users', userId);
    
    // We fetch user doc using getDoc to verify current password
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const userData = userDocSnap.data();

    // Check old password
    const isMatch = await bcrypt.compare(currentPassword, userData.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Save to Firestore
    await setDoc(userDocRef, {
      password: hashedPassword,
      changeForcePassword: false
    }, { merge: true });

    const userProfile = {
      id: userId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      changeForcePassword: false
    };

    // Generate updated JWT token
    const token = jwt.sign(userProfile, JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ token, user: userProfile });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Error during password update.' });
  }
};

export const getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  res.status(200).json({ user: req.user });
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const userDocRef = doc(db, 'users', id);
    await deleteDoc(userDocRef);
    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user.' });
  }
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { 
    name, email, role, 
    employeeCode, firstName, lastName, mobile, 
    employmentStatus, joiningDate, currentHeadquartersId 
  } = req.body;

  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Name, email, and role are required.' });
  }

  const validRoles = ['mr', 'rsm', 'zsm', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role.' });
  }

  try {
    // Verify employeeCode unique if changed
    if (employeeCode) {
      const qCode = query(collection(db, 'users'), where('employeeCode', '==', employeeCode.toUpperCase().trim()));
      const codeSnapshot = await getDocs(qCode);
      const conflicts = codeSnapshot.docs.filter(doc => doc.id !== id);
      if (conflicts.length > 0) {
        return res.status(400).json({ error: 'Employee code is already assigned to another user.' });
      }
    }

    const userDocRef = doc(db, 'users', id);
    const updatePayload = {
      name,
      email: email.toLowerCase(),
      role,
      employeeCode: employeeCode ? employeeCode.toUpperCase().trim() : null,
      firstName: firstName || null,
      lastName: lastName || null,
      mobile: mobile || null,
      employmentStatus: employmentStatus || 'ACTIVE',
      joiningDate: joiningDate || null,
      currentHeadquartersId: currentHeadquartersId || null
    };

    await setDoc(userDocRef, updatePayload, { merge: true });

    res.status(200).json({ id, ...updatePayload });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user.' });
  }
};

export const resetUserPassword = async (req, res) => {
  const { id } = req.params;

  try {
    const userDocRef = doc(db, 'users', id);
    const hashedPassword = await bcrypt.hash('Welcome@123', 10);

    await setDoc(userDocRef, {
      password: hashedPassword,
      changeForcePassword: true
    }, { merge: true });

    res.status(200).json({ message: 'Password reset to Welcome@123 successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset user password.' });
  }
};
