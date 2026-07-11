import { collection, getDocs, addDoc, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase.js';
export const getExams = async (req, res) => {
  try {
    const querySnapshot = await getDocs(collection(db, 'exams'));
    let list = [];
    querySnapshot.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });

    // For MR role: only return exams scheduled for TODAY (server date).
    // This prevents client-side clock manipulation from unlocking future exams.
    // Admin role always gets the full list.
    if (req.user && req.user.role === 'mr') {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; // YYYY-MM-DD local timezone
      list = list.filter(exam => {
        // Exams without an examDate (legacy/seeded) are always visible to MRs
        if (!exam.examDate) return true;
        return exam.examDate === todayStr;
      });
    }

    res.status(200).json(list);
  } catch (err) {
    console.error('Error fetching exams:', err);
    res.status(500).json({ error: 'Failed to retrieve exams.' });
  }
};

export const createExam = async (req, res) => {
  const { title, description, questions, examDate, passingPercentage } = req.body;

  if (!title || !description || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: 'Title, description and questions list are required.' });
  }
  if (!examDate) {
    return res.status(400).json({ error: 'Exam date is required.' });
  }
  if (passingPercentage === undefined || passingPercentage < 1 || passingPercentage > 100) {
    return res.status(400).json({ error: 'Passing percentage must be between 1 and 100.' });
  }

  try {
    const examDocRef = await addDoc(collection(db, 'exams'), {
      title,
      description,
      questions,
      examDate,                             // YYYY-MM-DD
      passingPercentage: parseInt(passingPercentage, 10),
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ id: examDocRef.id, title, description, questions, examDate, passingPercentage });
  } catch (err) {
    console.error('Error creating exam:', err);
    res.status(500).json({ error: 'Failed to create exam.' });
  }
};

export const updateExam = async (req, res) => {
  const { id } = req.params;
  const { title, description, questions, examDate, passingPercentage } = req.body;

  try {
    const docRef = doc(db, 'exams', id);
    await setDoc(docRef, {
      title,
      description,
      questions,
      examDate,
      passingPercentage: parseInt(passingPercentage, 10),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    res.status(200).json({ id, title, description, questions, examDate, passingPercentage });
  } catch (err) {
    console.error('Error updating exam:', err);
    res.status(500).json({ error: 'Failed to update exam.' });
  }
};

export const deleteExam = async (req, res) => {
  const { id } = req.params;

  try {
    // Cascade: delete all results that belong to this exam
    const resultsQuery = query(collection(db, 'results'), where('examId', '==', id));
    const resultsSnapshot = await getDocs(resultsQuery);
    const deleteResultPromises = resultsSnapshot.docs.map(resultDoc =>
      deleteDoc(doc(db, 'results', resultDoc.id))
    );
    await Promise.all(deleteResultPromises);

    // Then delete the exam itself
    await deleteDoc(doc(db, 'exams', id));

    res.status(200).json({
      message: 'Exam and all related results deleted successfully.',
      deletedResults: resultsSnapshot.size
    });
  } catch (err) {
    console.error('Error deleting exam:', err);
    res.status(500).json({ error: 'Failed to delete exam.' });
  }
};
