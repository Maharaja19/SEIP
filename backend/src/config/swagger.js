const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Expense Intelligence Platform (SEIP) API',
      version: '1.0.0',
      description: `
## Overview
The Smart Expense Intelligence Platform (SEIP) API is a general-purpose, multi-tenant financial management and intelligence platform.
It supports individual professionals, student groups, clubs, NGOs, startups, small businesses, and associations.

## Key Features
- **Multi-Tenant Organizations**: Enterprise-grade tenant context isolation
- **Universal Role RBAC**: Member, Finance Manager, Organization Admin, Super Admin
- **Financial Core**: Multi-currency transactions, deterministic budgets, and double-entry wallet ledgers
- **Categories**: System, organization, and personal categorization
- **Audit Logging**: End-to-end financial action traceability

## Authentication
Most endpoints require authentication using a JWT Bearer token:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`
      `,
      contact: {
        name: 'Support',
        email: 'support@seip-platform.local',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server',
      },
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
        Organization: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            legalName: { type: 'string' },
            type: { type: 'string', enum: ['INDIVIDUAL', 'STUDENT_GROUP', 'CLUB', 'NGO', 'STARTUP', 'SMALL_BUSINESS', 'ASSOCIATION', 'OTHER'] },
            currency: { type: 'string', example: 'INR' },
            timezone: { type: 'string', example: 'Asia/Kolkata' },
            status: { type: 'string', enum: ['active', 'suspended', 'archived'] }
          }
        },
        Membership: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            organization: { type: 'string' },
            role: { type: 'string', enum: ['Member', 'Finance Manager', 'Organization Admin', 'Super Admin'] },
            status: { type: 'string', enum: ['active', 'invited', 'suspended', 'left'] },
            department: { type: 'string' },
            title: { type: 'string' }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['Member', 'Finance Manager', 'Organization Admin', 'Super Admin'] },
            organizationId: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['income', 'expense', 'both'] },
            scope: { type: 'string', enum: ['system', 'organization', 'user'] },
            icon: { type: 'string' },
            color: { type: 'string' }
          }
        },
        Budget: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            title: { type: 'string' },
            amount: { type: 'number' },
            spent: { type: 'number' },
            remaining: { type: 'number' },
            period: { type: 'string', enum: ['MONTHLY', 'WEEKLY', 'YEARLY', 'CUSTOM'] },
            status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            type: { type: 'string', enum: ['income', 'expense', 'transfer'] },
            amount: { type: 'number' },
            currency: { type: 'string' },
            category: { type: 'string' },
            merchant: { type: 'string' },
            description: { type: 'string' },
            paymentMethod: { type: 'string' },
            status: { type: 'string', enum: ['completed', 'pending', 'failed', 'voided'] },
            date: { type: 'string', format: 'date-time' },
          },
        },
        Wallet: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            owner: { type: 'string' },
            organization: { type: 'string' },
            balance: { type: 'number' },
            currency: { type: 'string' },
            status: { type: 'string', enum: ['active', 'frozen', 'closed'] }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Authentication', description: 'User authentication and onboarding' },
      { name: 'Organizations', description: 'Tenant and organization profile management' },
      { name: 'Members', description: 'Organization membership and role management' },
      { name: 'Categories', description: 'Financial categories configuration' },
      { name: 'Transactions', description: 'Financial income, expense, and transfer records' },
      { name: 'Budgets', description: 'Deterministic budget planning and tracking' },
      { name: 'Wallet', description: 'Digital wallet balances and journal activity' },
      { name: 'Reports', description: 'Consolidated financial reports and summaries' },
      { name: 'Analytics', description: 'Spending breakdown and financial health metrics' },
      { name: 'Settings', description: 'User and application configuration' },
    ],
  },
  apis: ['./src/routes/*.js', './features/*/*.js'],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
