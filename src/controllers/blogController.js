import prisma from '../config/database.js';

// GET /api/blogs - list published blogs
export const listBlogs = async (req, res, next) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(pageSize);

    const [items, total] = await Promise.all([
      prisma.blog.findMany({
        where: { published: true },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: Number(pageSize),
        include: {
          author: { select: { name: true, email: true } }
        }
      }),
      prisma.blog.count({ where: { published: true } })
    ]);

    res.status(200).json({ items, total, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    next(error);
  }
};

// GET /api/blogs/:slug
export const getBlogBySlug = async (req, res, next) => {
  try {
    const blog = await prisma.blog.findUnique({
      where: { slug: req.params.slug },
      include: { author: { select: { name: true, email: true } } }
    });
    if (!blog || !blog.published) return res.status(404).json({ error: 'Blog post not found.' });
    res.status(200).json(blog);
  } catch (error) {
    next(error);
  }
};
