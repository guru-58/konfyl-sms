import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { corsMiddleware, helmetMiddleware, requestLoggerMiddleware, errorHandler } from './middleware/security.js';
import apiRouter from './routes/index.js';
import logger from './utils/logger.js';

const app = express();

app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));

app.use(requestLoggerMiddleware);

app.use('/api', apiRouter);

const swaggerDocument = swaggerJsdoc({
  swaggerDefinition: {
    openapi: '3.0.3',
    info: {
      title: 'KONFYL Enterprise API',
      version: '1.0.0',
      description: 'Enterprise backend APIs for KONFYL Pharmaceutical',
      contact: { name: 'KONFYL', email: 'info@konfylpharma.com' }
    },
    servers: [ { url: process.env.API_BASE_URL || 'http://localhost:5000/api' } ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
});

app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/health', (req, res) => res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() }));

app.use((req, res, next) => {
  logger.warn(`404 Route Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: 'Endpoint not found.' });
});

app.use(errorHandler);

export default app;
