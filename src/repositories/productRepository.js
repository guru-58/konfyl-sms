import prisma from '../config/database.js';

export const findProductById = async (productId) => {
  return prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      therapeuticArea: true,
      detailedInfo: true,
      competitors: true,
      trainingModules: {
        orderBy: { title: 'asc' }
      }
    }
  });
};

export const findProductBySlug = async slug => {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      therapeuticArea: true,
      detailedInfo: true,
      competitors: true,
      trainingModules: {
        orderBy: { title: 'asc' }
      }
    }
  });
};

export const findProducts = async ({ skip, take }) => {
  return prisma.product.findMany({
    skip,
    take,
    include: {
      category: true,
      therapeuticArea: true
    },
    orderBy: { updatedAt: 'desc' }
  });
};

export const countProducts = async () => {
  return prisma.product.count();
};

export const findCategoryByName = async name => {
  return prisma.category.findUnique({ where: { name } });
};

export const findTherapeuticAreaByName = async name => {
  return prisma.therapeuticArea.findUnique({ where: { name } });
};

export const createProductWithDetails = async ({ productData, detailData }) => {
  return prisma.product.create({
    data: {
      ...productData,
      detailedInfo: {
        create: detailData
      }
    },
    include: {
      category: true,
      therapeuticArea: true,
      detailedInfo: true,
      competitors: true
    }
  });
};
