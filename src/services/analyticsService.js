import prisma from '../config/database.js';

export const getMostViewedProducts = async (limit = 10) => {
  return prisma.product.findMany({
    orderBy: { viewCount: 'desc' },
    take: limit,
    include: { category: true, therapeuticArea: true }
  });
};

export const getTopTherapeuticAreas = async (limit = 10) => {
  return prisma.therapeuticArea.findMany({
    orderBy: { products: { _count: 'desc' } },
    take: limit,
    include: { products: { select: { id: true } } }
  });
};

export const getMrPerformance = async (limit = 10) => {
  const visits = await prisma.doctorVisit.groupBy({
    by: ['mrId'],
    _count: { _all: true },
    orderBy: { _count: { _all: 'desc' } },
    take: limit
  });

  const mrIds = visits.map(item => item.mrId);
  const mrs = await prisma.medicalRepresentative.findMany({
    where: { id: { in: mrIds } },
    include: { user: true }
  });

  return visits.map(item => ({
    mrId: item.mrId,
    visitCount: item._count._all,
    mrName: mrs.find(mr => mr.id === item.mrId)?.user?.name || 'Unknown'
  }));
};

export const getDoctorVisitFrequency = async (limit = 10) => {
  const visits = await prisma.doctorVisit.groupBy({
    by: ['doctorId'],
    _count: { _all: true },
    orderBy: { _count: { _all: 'desc' } },
    take: limit
  });

  const doctorIds = visits.map(item => item.doctorId);
  const doctors = await prisma.doctor.findMany({
    where: { id: { in: doctorIds } },
    include: { user: true }
  });

  return visits.map(item => ({
    doctorId: item.doctorId,
    visitCount: item._count._all,
    doctorName: doctors.find(doc => doc.id === item.doctorId)?.user?.name || 'Unknown'
  }));
};

export const getQuizTopScores = async (limit = 10) => {
  return prisma.quizResult.findMany({
    orderBy: { score: 'desc' },
    take: limit,
    include: { user: true, module: true }
  });
};

export const getDashboardAnalytics = async () => ({
  topProducts: await getMostViewedProducts(10),
  topTherapeuticAreas: await getTopTherapeuticAreas(10),
  mrPerformance: await getMrPerformance(10),
  doctorVisitFrequency: await getDoctorVisitFrequency(10),
  quizTopScores: await getQuizTopScores(10)
});
