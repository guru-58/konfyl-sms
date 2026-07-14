import { db } from '../config/firebaseAdmin.js';

const COLLECTION_NAME = 'crmAuditLogs';

export const crmAuditRepository = {
  /**
   * Log an audit event
   * @param {Object} auditData
   * @returns {Promise<void>}
   */
  async log(auditData) {
    try {
      const docRef = db.collection(COLLECTION_NAME).doc();
      const payload = {
        entityType: auditData.entityType,
        entityId: auditData.entityId,
        action: auditData.action, // CREATE, UPDATE, STATUS_CHANGE
        actorUserId: auditData.actorUserId || 'system',
        actorRole: auditData.actorRole || 'system',
        timestamp: new Date().toISOString(),
        summary: auditData.summary || ''
      };
      await docRef.set(payload);
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }
};
