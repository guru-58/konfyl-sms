import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase.js';

export const saveResult = async (req, res) => {
  const { examId, examTitle, score, correctAnswersCount, totalQuestionsCount, answers } = req.body;

  if (!examId || !examTitle || score === undefined || correctAnswersCount === undefined || totalQuestionsCount === undefined || !answers) {
    return res.status(400).json({ error: 'All result scorecard fields are required.' });
  }

  try {
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
    const q = query(
      collection(db, 'users'),
      where('role', 'in', ['mr', 'rsm', 'zsm'])
    );
    const querySnapshot = await getDocs(q);
    const list = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      list.push({
        uid: doc.id,
        name: data.name,
        email: data.email,
        role: data.role,
        createdAt: data.createdAt
      });
    });

    res.status(200).json(list);
  } catch (err) {
    console.error('Error fetching MR list:', err);
    res.status(500).json({ error: 'Failed to retrieve Medical Representatives directory.' });
  }
};
