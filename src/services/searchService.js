import prisma from '../config/database.js';

export const searchKnowledge = async (term) => {
  const query = term.trim();

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { composition: { contains: query, mode: 'insensitive' } },
        { keywords: { has: query } },
        { detailedInfo: { is: { indications: { contains: query, mode: 'insensitive' } } } }
      ]
    },
    include: {
      category: true,
      therapeuticArea: true,
      detailedInfo: true
    },
    take: 20
  });

  return products;
};

export const autocompleteTerms = async (term) => {
  const query = term.trim();
  const categories = await prisma.category.findMany({
    where: { name: { contains: query, mode: 'insensitive' } },
    take: 10
  });
  const therapies = await prisma.therapeuticArea.findMany({
    where: { name: { contains: query, mode: 'insensitive' } },
    take: 10
  });

  return {
    categories: categories.map(item => item.name),
    therapeuticAreas: therapies.map(item => item.name)
  };
};
