import prisma from '../config/database.js';

// GET /api/enquiries - list all enquiries for admin
export const listEnquiries = async (req, res, next) => {
  try {
    const { status, page = 1, pageSize = 50 } = req.query;
    const where = status ? { status } : {};
    const skip = (Number(page) - 1) * Number(pageSize);

    const [items, total] = await Promise.all([
      prisma.enquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(pageSize),
        include: { product: { select: { name: true } } }
      }),
      prisma.enquiry.count({ where })
    ]);

    res.status(200).json({ items, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    next(error);
  }
};

// GET /api/enquiries/:id
export const getEnquiry = async (req, res, next) => {
  try {
    const enquiry = await prisma.enquiry.findUnique({
      where: { id: req.params.id },
      include: { product: { select: { name: true } } }
    });
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found.' });
    res.status(200).json(enquiry);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/enquiries/:id/status
export const updateEnquiryStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['PENDING', 'IN_PROGRESS', 'RESOLVED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    }
    const enquiry = await prisma.enquiry.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.status(200).json({ success: true, data: enquiry });
  } catch (error) {
    next(error);
  }
};
