import { collection, query, where, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';

export const saveResult = async (req, res) => {
  const { examId, examTitle, score, correctAnswersCount, totalQuestionsCount, answers } = req.body;

  if (!examId || !examTitle || score === undefined || correctAnswersCount === undefined || totalQuestionsCount === undefined || !answers) {
    return res.status(400).json({ error: 'All result scorecard fields are required.' });
  }

  try {
    // Check if result already exists for this MR & Exam to prevent duplicates
    const checkQuery = query(
      collection(db, 'results'),
      where('mrEmail', '==', req.user.email),
      where('examId', '==', examId)
    );
    const checkSnapshot = await getDocs(checkQuery);
    if (!checkSnapshot.empty) {
      return res.status(400).json({ error: 'You have already submitted answers for this exam.' });
    }

    const resultDoc = {
      mrId: req.user.id,
      mrName: req.user.name,
      mrEmail: req.user.email,
      examId,
      examTitle,
      score: parseInt(score, 10),
      correctAnswersCount: parseInt(correctAnswersCount, 10),
      totalQuestionsCount: parseInt(totalQuestionsCount, 10),
      answers,
      completedAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'results'), resultDoc);
    res.status(201).json({ id: docRef.id, ...resultDoc });
  } catch (err) {
    console.error('Error saving exam result:', err);
    res.status(500).json({ error: 'Failed to record exam scorecard.' });
  }
};

export const getMRResults = async (req, res) => {
  try {
    const q = query(
      collection(db, 'results'),
      where('mrEmail', '==', req.user.email)
    );
    const querySnapshot = await getDocs(q);
    const list = [];
    querySnapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    // Sort descending by date
    list.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    res.status(200).json(list);
  } catch (err) {
    console.error('Error fetching MR results:', err);
    res.status(500).json({ error: 'Failed to retrieve your exam results.' });
  }
};

export const getAllResults = async (req, res) => {
  try {
    const querySnapshot = await getDocs(collection(db, 'results'));
    const list = [];
    querySnapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });
    list.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

    res.status(200).json(list);
  } catch (err) {
    console.error('Error fetching all results:', err);
    res.status(500).json({ error: 'Failed to retrieve all MR score logs.' });
  }
};

export const getAllMRs = async (req, res) => {
  try {
    // Use Admin SDK so document IDs are consistent with what crmAssignmentService looks up
    const { db: adminDb } = await import('../config/firebaseAdmin.js');
    const snapshot = await adminDb.collection('users')
      .where('role', 'in', ['mr', 'rsm', 'zsm'])
      .get();
    const list = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      list.push({
        uid: doc.id,
        name: data.name,
        email: data.email,
        role: data.role,
        employeeCode: data.employeeCode || null,
        createdAt: data.createdAt
      });
    });
    list.sort((a, b) => {
      const roleOrder = { zsm: 1, rsm: 2, mr: 3 };
      const ra = roleOrder[a.role] || 9;
      const rb = roleOrder[b.role] || 9;
      if (ra !== rb) return ra - rb;
      return (a.name || '').localeCompare(b.name || '');
    });
    res.status(200).json(list);
  } catch (err) {
    console.error('Error fetching MR list:', err);
    res.status(500).json({ error: 'Failed to retrieve Medical Representatives directory.' });
  }
};

export const deleteResult = async (req, res) => {
  const { id } = req.params;
  try {
    const resultDocRef = doc(db, 'results', id);
    await deleteDoc(resultDocRef);
    res.status(200).json({ message: 'Result attempt deleted successfully.' });
  } catch (err) {
    console.error('Delete result error:', err);
    res.status(500).json({ error: 'Failed to delete result scorecard.' });
  }
};
