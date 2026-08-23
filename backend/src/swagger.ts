import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Yemisrach Dimts Radio Home Management System API',
      version: '1.0.0',
      description: 'API documentation for YDCS Radio Home Information Management System',
      contact: {
        name: 'YDCS Admin',
      },
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Login: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fullName: { type: 'string' },
            username: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'data_entry', 'viewer'] },
            status: { type: 'string', enum: ['active', 'inactive'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Region: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            code: { type: 'string' },
            defaultLanguage: { type: 'string' },
            status: { type: 'string', enum: ['active', 'inactive'] },
          },
        },
        RadioHomeGroup: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            serialNumber: { type: 'string' },
            dateStarted: { type: 'string', format: 'date-time' },
            regionName: { type: 'string' },
            languageName: { type: 'string' },
            churchName: { type: 'string' },
            groupLeaderName: { type: 'string' },
            groupLeaderPhone: { type: 'string' },
            facilitatorName: { type: 'string' },
            facilitatorPhone: { type: 'string' },
            maleMembers: { type: 'integer' },
            femaleMembers: { type: 'integer' },
            totalMembers: { type: 'integer' },
            radioGiven: { type: 'integer' },
            agreementMade: { type: 'integer' },
            status: { type: 'string', enum: ['active', 'inactive', 'closed'] },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
