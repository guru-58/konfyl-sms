import { db } from '../config/firebaseAdmin.js';

const COLLECTION_NAME = 'products';

export const productRepository = {
  /**
   * Get all products from Firestore
   * @returns {Promise<Array>}
   */
  async getAll() {
    const snapshot = await db.collection(COLLECTION_NAME).get();
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return products;
  },

  /**
   * Get product by its slug
   * @param {string} slug 
   * @returns {Promise<Object|null>}
   */
  async getBySlug(slug) {
    const docRef = db.collection(COLLECTION_NAME).doc(slug.toLowerCase().trim());
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return null;
    }
    return { id: docSnap.id, ...docSnap.data() };
  },

  /**
   * Create new product using slug as doc ID
   * @param {string} slug 
   * @param {Object} productData 
   * @returns {Promise<Object>}
   */
  async create(slug, productData) {
    const docRef = db.collection(COLLECTION_NAME).doc(slug.toLowerCase().trim());
    await docRef.set(productData);
    return { id: slug, ...productData };
  },

  /**
   * Update existing product by slug
   * @param {string} slug 
   * @param {Object} productData 
   * @returns {Promise<Object>}
   */
  async update(slug, productData) {
    const docRef = db.collection(COLLECTION_NAME).doc(slug.toLowerCase().trim());
    await docRef.set(productData, { merge: true });
    return { id: slug, ...productData };
  },

  /**
   * Update status of product
   * @param {string} slug 
   * @param {string} status 
   * @param {string|null} publishedAt 
   * @param {string} updatedAt 
   * @returns {Promise<void>}
   */
  async updateStatus(slug, status, publishedAt, updatedAt) {
    const docRef = db.collection(COLLECTION_NAME).doc(slug.toLowerCase().trim());
    const updateData = { status, updatedAt };
    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt;
    }
    await docRef.update(updateData);
  },

  /**
   * Delete product by slug
   * @param {string} slug
   * @returns {Promise<void>}
   */
  async delete(slug) {
    const docRef = db.collection(COLLECTION_NAME).doc(slug.toLowerCase().trim());
    await docRef.delete();
  }
};
