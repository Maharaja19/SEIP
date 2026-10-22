# Treasury v2 - Enterprise Architecture Design

**Date**: June 6, 2026  
**Status**: Architecture Specification (Implementation Ready)  
**Goal**: Modern, scalable treasury management system with AI/ML readiness

---

## Executive Summary

This document defines the complete folder structure for `treasury-v2/`, a next-generation treasury management system built on enterprise architecture patterns. The design prioritizes scalability, maintainability, separation of concerns, and preparation for advanced features (AI Agents, RAG, Redis caching, Docker deployment, CI/CD).

---

## Complete Folder Structure

```
treasury-v2/
│
├── frontend/                          # React 18 SPA - Client Application
│   ├── public/                        # Static assets (not processed by build)
│   ├── src/
│   │   ├── app/                       # Root app component & global setup
│   │   ├── assets/                    # Images, fonts, static resources
│   │   ├── components/                # Reusable UI components
│   │   │   ├── common/                # Buttons, modals, cards, etc.
│   │   │   ├── layouts/               # Page layouts, navigation wrappers
│   │   │   ├── forms/                 # Form components with validation
│   │   │   └── charts/                # Recharts visualizations
│   │   ├── pages/                     # Route-level page components
│   │   │   ├── dashboard/
│   │   │   ├── budget/
│   │   │   ├── expenses/
│   │   │   ├── wallet/
│   │   │   ├── analytics/
│   │   │   ├── insights/
│   │   │   ├── admin/
│   │   │   └── auth/
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useFetch.js
│   │   │   ├── useCache.js            # NEW: For Redis cache integration
│   │   │   └── useWebSocket.js        # NEW: For real-time updates
│   │   ├── context/                   # React Context for global state
│   │   ├── services/                  # API service layer
│   │   │   ├── api.js                 # Axios instance with interceptors
│   │   │   ├── authService.js
│   │   │   ├── budgetService.js
│   │   │   ├── analyticsService.js
│   │   │   ├── aiService.js           # NEW: AI Agent integration
│   │   │   └── cachingService.js      # NEW: Redis/Local caching
│   │   ├── utils/                     # Utility functions
│   │   │   ├── formatters.js
│   │   │   ├── validators.js
│   │   │   ├── errorHandler.js
│   │   │   └── constants.js
│   │   ├── styles/                    # Global styles
│   │   ├── index.js                   # Entry point
│   │   └── index.css
│   ├── .env.example
│   ├── package.json
│   ├── package-lock.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── webpack.config.js (or vite.config.js)
│   ├── .eslintrc.js
│   ├── .prettierrc
│   ├── jest.config.js                 # For unit tests
│   └── README.md
│
├── backend/                           # Node.js/Express API Server
│   ├── src/
│   │   ├── modules/                   # Feature-based business modules
│   │   │   ├── auth/
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   ├── repositories/
│   │   │   │   ├── validators/
│   │   │   │   ├── routes.js
│   │   │   │   └── index.js
│   │   │   ├── budget/
│   │   │   │   ├── controllers/
│   │   │   │   ├── services/
│   │   │   │   ├── repositories/
│   │   │   │   ├── validators/
│   │   │   │   ├── routes.js
│   │   │   │   └── index.js
│   │   │   ├── expenses/
│   │   │   ├── wallet/
│   │   │   ├── analytics/
│   │   │   ├── insights/
│   │   │   ├── admin/
│   │   │   ├── events/
│   │   │   ├── payments/
│   │   │   ├── feedback/
│   │   │   └── roles/
│   │   │
│   │   ├── controllers/               # Top-level controllers (if needed)
│   │   ├── services/                  # Cross-module business logic
│   │   │   ├── authService.js
│   │   │   ├── emailService.js
│   │   │   ├── notificationService.js
│   │   │   ├── aiService.js           # NEW: AI Agent/LLM integration
│   │   │   ├── ragService.js          # NEW: RAG pipeline service
│   │   │   ├── cacheService.js        # NEW: Redis cache management
│   │   │   └── reportService.js
│   │   │
│   │   ├── repositories/              # Database access layer (DAL)
│   │   │   ├── baseRepository.js      # Base class for all repos
│   │   │   ├── budgetRepository.js
│   │   │   ├── expenseRepository.js
│   │   │   ├── userRepository.js
│   │   │   └── analyticsRepository.js
│   │   │
│   │   ├── models/                    # Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Budget.js
│   │   │   ├── Expense.js
│   │   │   ├── Wallet.js
│   │   │   ├── Transaction.js
│   │   │   ├── Analytics.js
│   │   │   ├── AiQuery.js             # NEW: Store AI queries for RAG
│   │   │   └── AuditLog.js            # NEW: For compliance & monitoring
│   │   │
│   │   ├── middleware/                # Express middleware
│   │   │   ├── auth.js
│   │   │   ├── errorHandler.js
│   │   │   ├── requestLogger.js       # NEW: Better logging
│   │   │   ├── rateLimiter.js         # NEW: DDoS protection
│   │   │   ├── cors.js
│   │   │   ├── validation.js
│   │   │   ├── sanitization.js
│   │   │   ├── cache.js               # NEW: Caching middleware
│   │   │   └── monitoring.js          # NEW: Performance metrics
│   │   │
│   │   ├── validators/                # Input validation schemas
│   │   │   ├── budgetValidator.js
│   │   │   ├── expenseValidator.js
│   │   │   └── userValidator.js
│   │   │
│   │   ├── utils/                     # Utility functions
│   │   │   ├── logger.js              # Winston logger setup
│   │   │   ├── errorClasses.js        # Custom error types
│   │   │   ├── constants.js
│   │   │   ├── helpers.js
│   │   │   └── decorators.js          # Function decorators (caching, etc.)
│   │   │
│   │   ├── config/                    # Configuration files
│   │   │   ├── db.js                  # MongoDB connection
│   │   │   ├── redis.js               # NEW: Redis connection & pool
│   │   │   ├── passport.js            # OAuth configuration
│   │   │   ├── mail.js                # Email/Nodemailer config
│   │   │   ├── swagger.js             # API documentation
│   │   │   ├── env.js                 # Environment variable validation
│   │   │   ├── ai.js                  # NEW: AI Agent configuration
│   │   │   └── monitoring.js          # NEW: APM & monitoring setup
│   │   │
│   │   ├── routes/                    # API routes
│   │   │   ├── v1/
│   │   │   │   ├── auth.js
│   │   │   │   ├── budget.js
│   │   │   │   ├── expenses.js
│   │   │   │   ├── wallet.js
│   │   │   │   ├── analytics.js
│   │   │   │   ├── admin.js
│   │   │   │   ├── ai.js              # NEW: AI Agent endpoints
│   │   │   │   └── index.js
│   │   │   └── v2/                    # Future API version
│   │   │
│   │   ├── types/                     # NEW: TypeScript-style JSDoc types
│   │   │   └── index.js
│   │   │
│   │   ├── constants/                 # NEW: Application constants
│   │   │   ├── httpStatus.js
│   │   │   ├── errorMessages.js
│   │   │   ├── roles.js
│   │   │   └── permissions.js
│   │   │
│   │   ├── jobs/                      # NEW: Background jobs/queues
│   │   │   ├── emailQueue.js
│   │   │   ├── analyticsQueue.js
│   │   │   ├── reportGenerationJob.js
│   │   │   └── aiProcessingQueue.js
│   │   │
│   │   ├── events/                    # NEW: Event emitters for pub/sub
│   │   │   ├── budgetEvents.js
│   │   │   ├── expenseEvents.js
│   │   │   └── systemEvents.js
│   │   │
│   │   └── app.js                     # Express app setup
│   │
│   ├── tests/                         # Test suite
│   │   ├── unit/                      # Unit tests
│   │   ├── integration/               # Integration tests
│   │   ├── fixtures/                  # Mock data & seeds
│   │   └── setup.js
│   │
│   ├── scripts/                       # Utility scripts
│   │   ├── seedDb.js                  # Database seeding
│   │   ├── migrateData.js             # Data migration
│   │   ├── cleanupOldData.js
│   │   └── generateReports.js
│   │
│   ├── logs/                          # Application logs
│   │
│   ├── .env.example
│   ├── .env.local
│   ├── package.json
│   ├── package-lock.json
│   ├── .eslintrc.js
│   ├── .prettierrc
│   ├── jest.config.js
│   ├── server.js                      # Entry point
│   └── README.md
│
├── ai-service/                        # NEW: Dedicated AI & ML Service
│   ├── src/
│   │   ├── agents/                    # AI Agent implementations
│   │   │   ├── budgetAgent.js         # Budget analysis agent
│   │   │   ├── insightAgent.js        # Insight generation agent
│   │   │   ├── predictiveAgent.js     # Prediction agent
│   │   │   └── recommendationAgent.js
│   │   │
│   │   ├── rag/                       # Retrieval-Augmented Generation
│   │   │   ├── vectorStore.js         # Vector database integration
│   │   │   ├── documentProcessor.js   # Process & chunk documents
│   │   │   ├── retriever.js           # Retrieve relevant documents
│   │   │   ├── augmenter.js           # Augment LLM prompts
│   │   │   └── knowledgeBase/         # RAG knowledge base
│   │   │       ├── treasury-policies.md
│   │   │       ├── best-practices.md
│   │   │       └── faq.md
│   │   │
│   │   ├── llm/                       # LLM Integration
│   │   │   ├── providers/             # OpenAI, Claude, LLaMA, etc.
│   │   │   │   ├── openaiProvider.js
│   │   │   │   ├── anthropicProvider.js
│   │   │   │   └── localLlmProvider.js
│   │   │   ├── prompts/               # Prompt templates
│   │   │   │   ├── budgetPrompts.js
│   │   │   │   ├── insightPrompts.js
│   │   │   │   └── systemPrompts.js
│   │   │   └── chainManager.js        # LLM chain orchestration
│   │   │
│   │   ├── ml/                        # Machine Learning Models
│   │   │   ├── predictiveModel.js     # Prediction model
│   │   │   ├── riskScoring.js         # Risk assessment
│   │   │   ├── anomalyDetection.js    # Anomaly detection
│   │   │   └── clustering.js          # Pattern clustering
│   │   │
│   │   ├── analytics/                 # Advanced Analytics
│   │   │   ├── timeSeriesAnalysis.js
│   │   │   ├── correlationAnalysis.js
│   │   │   └── forecastingEngine.js
│   │   │
│   │   ├── utils/
│   │   │   ├── tokenCounter.js        # LLM token management
│   │   │   ├── embeddingGenerator.js  # Generate embeddings
│   │   │   ├── logger.js
│   │   │   └── validators.js
│   │   │
│   │   ├── config/
│   │   │   ├── llmConfig.js           # LLM model settings
│   │   │   ├── vectorStoreConfig.js   # Vector store config
│   │   │   ├── agentConfig.js         # Agent configuration
│   │   │   └── env.js
│   │   │
│   │   ├── api/                       # API endpoints for AI service
│   │   │   ├── agentRoutes.js
│   │   │   ├── ragRoutes.js
│   │   │   └── analyticsRoutes.js
│   │   │
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── fixtures/
│   │   │
│   │   └── server.js                  # Entry point
│   │
│   ├── .env.example
│   ├── package.json
│   ├── .eslintrc.js
│   ├── jest.config.js
│   └── README.md
│
├── infra/                             # NEW: Infrastructure & DevOps
│   ├── terraform/                     # Infrastructure as Code
│   │   ├── aws/                       # If using AWS
│   │   │   ├── main.tf
│   │   │   ├── variables.tf
│   │   │   ├── outputs.tf
│   │   │   ├── vpc.tf
│   │   │   ├── rds.tf                 # MongoDB Atlas/RDS
│   │   │   ├── elasticache.tf         # Redis
│   │   │   ├── lambda.tf              # Serverless functions
│   │   │   └── iam.tf                 # Access management
│   │   │
│   │   ├── kubernetes/                # K8s manifests (if needed)
│   │   │   ├── deployments.yaml
│   │   │   ├── services.yaml
│   │   │   ├── ingress.yaml
│   │   │   ├── configmaps.yaml
│   │   │   └── secrets.yaml
│   │   │
│   │   └── monitoring/                # Monitoring setup
│   │       ├── prometheus.yml
│   │       ├── grafana-dashboards/
│   │       └── alerting-rules.yml
│   │
│   ├── ansible/                       # Configuration Management (optional)
│   │   ├── playbooks/
│   │   ├── roles/
│   │   └── inventory.ini
│   │
│   └── README.md
│
├── docker/                            # NEW: Docker Configuration
│   ├── frontend.dockerfile            # React frontend container
│   ├── backend.dockerfile             # Node.js backend container
│   ├── ai-service.dockerfile          # AI service container
│   ├── docker-compose.yml             # Local development stack
│   ├── docker-compose.prod.yml        # Production stack
│   ├── nginx/                         # Nginx reverse proxy
│   │   ├── nginx.conf
│   │   └── default.conf
│   ├── redis/                         # Redis configuration
│   │   └── redis.conf
│   └── mongodb/                       # MongoDB initialization
│       └── init-mongo.js
│
├── .github/                           # NEW: GitHub Actions CI/CD
│   ├── workflows/
│   │   ├── frontend-tests.yml         # Frontend CI
│   │   ├── backend-tests.yml          # Backend CI
│   │   ├── ai-service-tests.yml       # AI service CI
│   │   ├── deploy-dev.yml             # Deploy to dev
│   │   ├── deploy-staging.yml         # Deploy to staging
│   │   ├── deploy-prod.yml            # Deploy to production
│   │   ├── security-scan.yml          # Security scanning
│   │   ├── code-quality.yml           # Code quality checks
│   │   ├── dependency-check.yml       # Dependency scanning
│   │   └── performance-test.yml       # Performance testing
│   │
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── performance_issue.md
│   │
│   ├── pull_request_template.md       # PR template
│   └── CODEOWNERS                     # Code ownership
│
├── docs/                              # NEW: Comprehensive Documentation
│   ├── ARCHITECTURE.md                # System architecture overview
│   ├── API_DOCUMENTATION.md           # API endpoints & examples
│   ├── DATABASE_SCHEMA.md             # MongoDB schema design
│   ├── DEPLOYMENT_GUIDE.md            # How to deploy
│   ├── SETUP_GUIDE.md                 # Local development setup
│   ├── SECURITY.md                    # Security best practices
│   ├── CONTRIBUTING.md                # Contribution guidelines
│   ├── TROUBLESHOOTING.md             # Common issues & solutions
│   │
│   ├── ai-service/                    # AI service documentation
│   │   ├── RAG_GUIDE.md
│   │   ├── AGENT_SETUP.md
│   │   ├── LLM_PROVIDERS.md
│   │   └── EXAMPLES.md
│   │
│   ├── operations/                    # Operational guides
│   │   ├── MONITORING.md
│   │   ├── LOGGING.md
│   │   ├── SCALING.md
│   │   ├── BACKUP_RECOVERY.md
│   │   └── INCIDENT_RESPONSE.md
│   │
│   ├── diagrams/                      # Architecture diagrams
│   │   ├── system-architecture.md
│   │   ├── data-flow.md
│   │   ├── deployment-architecture.md
│   │   └── sequence-diagrams.md
│   │
│   └── api-specs/
│       ├── openapi.yaml               # OpenAPI/Swagger spec
│       └── collections/               # Postman collections
│
├── scripts/                           # NEW: Utility Scripts
│   ├── setup.sh                       # Initialize development environment
│   ├── start.sh                       # Start all services locally
│   ├── test.sh                        # Run all tests
│   ├── build.sh                       # Build all services
│   ├── deploy.sh                      # Deployment helper
│   ├── db-migrate.sh                  # Database migrations
│   ├── backup.sh                      # Backup script
│   ├── health-check.sh                # Health check script
│   └── cleanup.sh                     # Cleanup script
│
├── .gitignore
├── .gitattributes
├── .editorconfig
├── .dockerignore
├── .env.example
├── docker-compose.yml                 # Root docker-compose
├── README.md                          # Project README
├── CONTRIBUTING.md
├── LICENSE
└── package.json                       # Root package (optional, for tooling)
```

---

## Folder Structure Explanations

### 1. **frontend/** - React 18 Web Application

**Purpose**: Client-side SPA for end-users to interact with treasury management features.

**Why it exists**:
- Provides UI for budget management, expense tracking, analytics viewing
- Decoupled from backend for independent scaling and deployment
- Enables rapid iteration on UI/UX without backend changes
- Supports PWA capabilities (offline functionality)

**Future usage**:
- Integration with AI chat interface for budget recommendations
- Real-time notifications via WebSocket
- Advanced charting and predictive visualizations
- Local caching with IndexedDB + Redis backend
- AI-powered search and filtering

**Key subdirectories**:
- `services/`: Abstracts API communication with caching layer
- `hooks/`: Reusable logic (auth, caching, WebSocket connections)
- `context/`: Global state management for auth, user preferences
- `pages/`: Route-based components for different features

---

### 2. **backend/** - Node.js/Express API Server

**Purpose**: Core business logic, data persistence, authentication, and API serving.

**Why it exists**:
- Single source of truth for business logic
- Centralized authentication & authorization
- Database access layer for data consistency
- API gateway for all frontend & external requests
- Job queue for async operations

**Future usage**:
- Redis integration for caching frequently accessed data
- Event-driven architecture for real-time updates
- Webhook integrations for third-party services
- Background job processing for expensive operations
- Monitoring & APM integration (DataDog, New Relic)

**Key subdirectories**:
- `modules/`: Feature-based organization (budget, expenses, wallet)
  - Each module is self-contained with controllers, services, repositories
  - Enables team parallelization and code ownership
- `repositories/`: Data access layer abstraction
  - Repository pattern for testability and database independence
  - Base repository for common CRUD operations
- `services/`: Business logic & orchestration
  - Cross-module services (email, notifications, AI)
  - Service layer for dependency injection
- `middleware/`: Request processing pipeline
  - Authentication, validation, error handling, caching
  - NEW: Rate limiting for DDoS protection
  - NEW: Request logging for debugging
- `jobs/`: Background job processing
  - Email sending, report generation, analytics processing
  - Queue system (Bull, Kue) for async operations
- `config/`: Centralized configuration management
  - Environment-specific settings
  - Database, Redis, OAuth, LLM configurations
- `utils/`: Shared utilities & decorators
  - Custom error classes for consistent error handling
  - Decorators for caching, retries, error handling

---

### 3. **ai-service/** - Dedicated AI & ML Microservice

**Purpose**: Handle all AI/ML operations, agents, and advanced analytics separately from core backend.

**Why it exists**:
- Scalable independently from main API
- Can be deployed on GPU instances for ML operations
- Isolation of expensive AI operations
- Enables pluggable LLM provider selection
- Supports RAG pipeline without burdening main backend
- Facilitates team specialization (AI/ML engineers)

**Future usage**:
- LangChain/LlamaIndex integration for agent orchestration
- Multiple LLM providers (OpenAI, Anthropic, local LLaMA)
- Vector database for semantic search (Pinecone, Milvus, Weaviate)
- Fine-tuning models on treasury-specific data
- Real-time streaming responses to frontend
- Batch processing for monthly predictions and insights

**Key subdirectories**:
- `agents/`: AI agents for specific tasks
  - Budget advisor agent
  - Risk assessment agent
  - Anomaly detection agent
- `rag/`: Retrieval-Augmented Generation pipeline
  - Document processing and chunking
  - Vector embeddings storage
  - Semantic search and document retrieval
- `llm/`: LLM provider abstraction
  - Support for multiple providers
  - Prompt template management
  - Token counting and cost tracking
- `ml/`: Machine learning models
  - Predictive analytics
  - Risk scoring models
  - Anomaly detection algorithms

---

### 4. **infra/** - Infrastructure as Code

**Purpose**: Define and manage cloud infrastructure reproducibly.

**Why it exists**:
- Infrastructure consistency across environments
- Version-controlled, auditable infrastructure changes
- Automated provisioning and scaling
- Disaster recovery capability
- Multi-environment support (dev, staging, prod)

**Future usage**:
- Auto-scaling based on load
- Disaster recovery and failover
- Multi-region deployment
- Blue-green deployments
- Infrastructure cost optimization

**Key subdirectories**:
- `terraform/`: Infrastructure provisioning
  - VPC, networking, security groups
  - Database provisioning (MongoDB Atlas)
  - Redis cluster setup
  - Kubernetes cluster (if needed)
  - Lambda for serverless operations
- `kubernetes/`: Container orchestration
  - Pod deployments for each service
  - Service discovery and load balancing
  - ConfigMaps for configuration
  - Secrets management
- `monitoring/`: Observability stack
  - Prometheus for metrics collection
  - Grafana for dashboards
  - Alert rules for incident response

---

### 5. **docker/** - Container Configuration

**Purpose**: Containerization for development consistency and production deployment.

**Why it exists**:
- "Works on my machine" problem elimination
- Consistent environments across development, staging, production
- Microservice orchestration
- Cloud-native deployment ready
- Easy local development with docker-compose

**Future usage**:
- Multi-stage builds for optimized images
- Health checks and auto-restart policies
- Resource limits for cost control
- Networking between services
- Log aggregation from containers

**Key files**:
- `frontend.dockerfile`: React SPA containerization
- `backend.dockerfile`: Node.js API containerization
- `ai-service.dockerfile`: AI service with GPU support (optional)
- `docker-compose.yml`: Local development stack
- `docker-compose.prod.yml`: Production stack with optimizations
- `nginx/`: Reverse proxy configuration
  - SSL termination
  - Load balancing between backend instances
  - Request routing to appropriate services

---

### 6. **.github/** - CI/CD Automation

**Purpose**: Automated testing, building, and deployment pipelines.

**Why it exists**:
- Continuous integration ensures code quality
- Continuous deployment enables frequent releases
- Automated testing catches bugs early
- Security scanning detects vulnerabilities
- Reduces manual deployment errors

**Future usage**:
- Automated performance testing
- Load testing before production deployment
- Automated rollback on failed deployments
- Dependency vulnerability scanning
- Container image scanning

**Key workflows**:
- `frontend-tests.yml`: Unit/integration tests for React
- `backend-tests.yml`: Backend test suite
- `ai-service-tests.yml`: AI service validation
- `deploy-*.yml`: Environment-specific deployments
- `security-scan.yml`: SCA, SAST, container scanning
- `code-quality.yml`: Linting, formatting, complexity analysis

---

### 7. **docs/** - Comprehensive Documentation

**Purpose**: Centralized, up-to-date project documentation for developers and operators.

**Why it exists**:
- Onboarding new team members
- Architecture decision documentation
- API reference for frontend developers
- Deployment procedures for DevOps
- Troubleshooting guides for operations

**Future usage**:
- Auto-generated API docs from OpenAPI spec
- Versioned documentation for multiple releases
- Architecture Decision Records (ADRs)
- Knowledge base for support team
- Training materials

**Key sections**:
- `ARCHITECTURE.md`: High-level system design
- `API_DOCUMENTATION.md`: Endpoint reference with examples
- `DATABASE_SCHEMA.md`: Data model documentation
- `DEPLOYMENT_GUIDE.md`: Production deployment steps
- `ai-service/`: AI-specific documentation
- `operations/`: Operational runbooks

---

### 8. **scripts/** - Utility Scripts

**Purpose**: Automate repetitive development and operational tasks.

**Why it exists**:
- Reduce manual error in common operations
- Accelerate development workflow
- Standardize deployment procedures
- Enable non-technical team members to perform operations

**Future usage**:
- GitOps integration for automated deployments
- Automated backup and restore procedures
- Database migration automation
- Health check dashboards
- Performance profiling scripts

**Key scripts**:
- `setup.sh`: Initialize development environment with dependencies
- `start.sh`: Start all services locally
- `test.sh`: Run full test suite with coverage
- `deploy.sh`: Deployment orchestration
- `db-migrate.sh`: Database schema migrations

---

### 9. **Root Level Configuration Files**

**Purpose**: Project-wide configuration and metadata.

**Why it exists**:
- Centralized project settings
- Git and development tool configuration
- Docker compose for local development
- Environment templates

**Key files**:
- `.env.example`: Template for environment variables (never commit actual .env)
- `.gitignore`: Prevent committing sensitive files, dependencies, logs
- `.editorconfig`: Consistent code formatting across editors
- `.dockerignore`: Reduce Docker image size by excluding unnecessary files
- `docker-compose.yml`: Local development stack orchestration
- `README.md`: Project overview and quick start guide
- `CONTRIBUTING.md`: Guidelines for contributors
- `LICENSE`: Open source or proprietary licensing

---

## Architecture Principles

### Separation of Concerns
Each folder has a single, well-defined responsibility:
- Frontend handles UI/UX
- Backend handles business logic
- AI service handles ML/AI operations
- Infrastructure code manages deployments

### Modularity
The backend uses feature-based modules where each feature (budget, expenses, wallet) is self-contained with controllers, services, and repositories.

### Scalability Preparation
- Backend is stateless, allowing horizontal scaling
- AI service is separate for independent scaling
- Redis for caching and session management
- Database connection pooling
- Docker containerization for cloud deployment

### Maintainability
- Clear folder structure with consistent naming
- Repository pattern for data access
- Service layer for business logic
- Middleware pipeline for cross-cutting concerns
- Comprehensive logging and error handling

### Security
- Rate limiting middleware
- Input validation and sanitization
- JWT authentication with refresh tokens
- CORS configuration
- Helmet.js for HTTP header security
- Environment variable management
- Secret rotation capability

### DevOps Ready
- Docker containerization
- Docker Compose for local development
- CI/CD pipelines via GitHub Actions
- Infrastructure as Code (Terraform)
- Kubernetes-ready manifests
- Monitoring and alerting setup

---

## Deployment Architecture

### Local Development
```
docker-compose.yml
├── React frontend (port 3000)
├── Express backend (port 5000)
├── AI service (port 5001)
├── MongoDB (local)
└── Redis (local)
```

### Staging/Production
```
AWS/GCP/Azure
├── Frontend (CloudFront/CDN + S3)
├── Backend (ECS/EKS with load balancing)
├── AI Service (ECS/EKS with GPU)
├── MongoDB Atlas
├── ElastiCache (Redis)
├── RDS (PostgreSQL for job queue)
└── CloudWatch/DataDog (Monitoring)
```

---

## Next Steps (After Architecture Creation)

1. **Initialize repositories** for each service
2. **Create base configurations** (package.json, docker files)
3. **Implement CI/CD pipelines** for automated testing
4. **Set up infrastructure** with Terraform
5. **Develop core modules** starting with authentication
6. **Integrate AI service** with LangChain/LlamaIndex
7. **Deploy to staging** and validate
8. **Production launch** with monitoring

---

## File Organization Summary

| Layer | Purpose | Scale | Technology |
|-------|---------|-------|-----------|
| **Frontend** | User Interface | Horizontal (CDN) | React 18, Tailwind, Recharts |
| **Backend** | Core API & Logic | Horizontal (Load Balance) | Node.js, Express, MongoDB |
| **AI Service** | ML & AI Operations | Horizontal (GPU) | LangChain, LLMs, Vector DB |
| **Infrastructure** | Deployment Config | Version Controlled | Terraform, Kubernetes |
| **Docker** | Containerization | Multi-container | Docker, Docker Compose |
| **CI/CD** | Automation | Event-driven | GitHub Actions |
| **Docs** | Knowledge Base | Searchable | Markdown, MkDocs |
| **Scripts** | Utilities | Reusable | Bash, Node.js |

---

**Status**: Ready for implementation  
**Maintainability**: Excellent  
**Scalability**: Enterprise-ready  
**Future-proof**: Yes (AI/ML, RAG, Redis, Docker, K8s ready)
