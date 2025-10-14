import swaggerJsdoc from 'swagger-jsdoc';
import { writeFileSync } from 'fs';
import { stringify } from 'yaml';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Diagnosy API',
      version: '1.0.0',
      description: 'A health chat API for authenticated and guest users to submit health symptoms and receive advice, with JWT authentication, Redis caching, and Bull queue-based email processing.',
    },
    servers: [{ url: 'http://localhost:3000' }],
  },
  apis: ['./routes/chat.js', './routes/authentication.js'],
};

const swaggerSpec = swaggerJsdoc(options);
writeFileSync('./openapi.yaml', stringify(swaggerSpec));
console.log('✅ openapi.yaml generated successfully!');
