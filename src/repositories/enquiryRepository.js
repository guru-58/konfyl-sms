import prisma from '../config/database.js';

export const createEnquiry = async (enquiryData) => {
  return prisma.enquiry.create({ data: enquiryData });
};

export const findTodaysEnquiryCount = async (todayDate) => {
  const formattedDate = `${todayDate.slice(0, 4)}-${todayDate.slice(4, 6)}-${todayDate.slice(6, 8)}`;
  return prisma.enquiry.count({
    where: {
      createdAt: {
        gte: new Date(`${formattedDate}T00:00:00.000Z`),
        lt: new Date(`${formattedDate}T23:59:59.999Z`)
      }
    }
  });
};

export const findApprovedProductKnowledge = async (query) => {
  const words = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !['what', 'how', 'who', 'why', 'are', 'the', 'for', 'and', 'with', 'about', 'from', 'you', 'can', 'tell', 'info'].includes(w));

  if (words.length === 0) {
    // Fallback: search whole string if no keywords left
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { composition: { contains: term, mode: 'insensitive' } }
        ]
      },
      include: { detailedInfo: true, category: true, therapeuticArea: true },
      take: 10
    });
  }

  return prisma.product.findMany({
    where: {
      OR: words.flatMap(word => [
        { name: { contains: word, mode: 'insensitive' } },
        { composition: { contains: word, mode: 'insensitive' } },
        { keywords: { has: word } }
      ])
    },
    include: {
      detailedInfo: true,
      category: true,
      therapeuticArea: true
    },
    take: 10
  });
};
