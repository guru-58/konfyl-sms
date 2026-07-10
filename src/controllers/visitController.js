import prisma from '../config/database.js';

// POST /api/visits - log a doctor visit
export const createVisit = async (req, res, next) => {
  try {
    const { mrEmail, city, clinicName, doctorName, productDiscussed, samplesGiven, feedback, date } = req.body;

    if (!mrEmail || !city || !doctorName) {
      return res.status(400).json({ error: 'mrEmail, city, and doctorName are required.' });
    }

    // Store in localStorage-compatible format via a simple JSON table
    // When the full User/MR schema is populated, this can be migrated to DoctorVisit
    const visit = await prisma.auditLog.create({
      data: {
        action: 'MR_VISIT_LOG',
        details: JSON.stringify({
          mrEmail,
          city,
          clinicName,
          doctorName,
          productDiscussed,
          samplesGiven,
          feedback,
          date: date || new Date().toISOString(),
          id: `visit-${Date.now()}`
        })
      }
    });

    res.status(201).json({
      success: true,
      message: 'Visit logged successfully.',
      data: { id: visit.id }
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/visits?mrEmail=mr@konfyl.com
export const getVisits = async (req, res, next) => {
  try {
    const { mrEmail, page = 1, pageSize = 50 } = req.query;

    const where = {
      action: 'MR_VISIT_LOG',
      ...(mrEmail ? { details: { contains: mrEmail } } : {})
    };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(pageSize),
      skip: (Number(page) - 1) * Number(pageSize)
    });

    const visits = logs.map(log => {
      try {
        return { ...JSON.parse(log.details), dbId: log.id, createdAt: log.createdAt };
      } catch {
        return { dbId: log.id, details: log.details, createdAt: log.createdAt };
      }
    });

    res.status(200).json({ items: visits, total: visits.length });
  } catch (error) {
    next(error);
  }
};
