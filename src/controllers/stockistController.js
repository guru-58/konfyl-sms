import prisma from '../config/database.js';

const STOCKIST_SEED = [
  { name: 'Apex Pharma Distributors', city: 'Mumbai', contact: '+91 98765 43210', address: 'Ghatkopar West, Mumbai, Maharashtra 400086', region: 'West' },
  { name: 'LifeCare Medicos', city: 'Delhi', contact: '+91 87654 32109', address: 'Connaught Place, New Delhi, Delhi 110001', region: 'North' },
  { name: 'South India Pharmaceuticals', city: 'Chennai', contact: '+91 76543 21098', address: 'T. Nagar, Chennai, Tamil Nadu 600017', region: 'South' },
  { name: 'Eastern Health Distributors', city: 'Kolkata', contact: '+91 65432 10987', address: 'Salt Lake Sector V, Kolkata, West Bengal 700091', region: 'East' },
  { name: 'Deccan Pharma Hub', city: 'Pune', contact: '+91 94512 34567', address: 'Kothrud, Pune, Maharashtra 411038', region: 'West' },
  { name: 'Karnataka Medical Supplies', city: 'Bangalore', contact: '+91 80234 56789', address: 'Jayanagar, Bengaluru, Karnataka 560041', region: 'South' }
];

// GET /api/stockists?city=Mumbai
export const getStockists = async (req, res, next) => {
  try {
    const { city } = req.query;
    const where = city
      ? { city: { contains: city, mode: 'insensitive' } }
      : {};

    // Use in-memory seed since Stockist is not yet in the Prisma schema
    // When a Stockist model is added, replace this with prisma.stockist.findMany()
    let results = STOCKIST_SEED;
    if (city) {
      results = STOCKIST_SEED.filter(s =>
        s.city.toLowerCase().includes(city.toLowerCase()) ||
        s.region.toLowerCase().includes(city.toLowerCase())
      );
    }

    res.status(200).json({ items: results, total: results.length });
  } catch (error) {
    next(error);
  }
};
