# SEIP — Smart Expense Intelligence Platform

> **A modern, data-driven financial decision-support and expense intelligence platform.**

---

## 🌟 Overview

SEIP (Smart Expense Intelligence Platform) transforms routine institutional expense tracking into predictive financial intelligence. It provides real-time visibility into student finances, budget utilization, dues collection, event management, and AI-driven predictive insights.

---

## 🏗️ Architecture

```
SEIP/
├── backend/          # Node.js + Express REST API (Modular src/ architecture)
│   ├── src/
│   │   ├── config/       # Database, Passport, Swagger configurations
│   │   ├── controllers/  # Controllers (Analytics, Onboarding, Reports, Risk, etc.)
│   │   ├── middleware/   # Auth, Tenant, Monitoring, RateLimit, Sanitize
│   │   ├── models/       # Mongoose schemas (User, Organization, Wallet, Budget, etc.)
│   │   ├── routes/       # API route modules
│   │   ├── services/     # Gemini AI, Analytics, UPI, Razorpay, Notifications
│   │   └── utils/        # JWT helpers, CustomError, roles, constants
│   ├── features/         # Feature modules (Admin, Events, Feedback, Wallet, Treasurer)
│   ├── tests/            # Automated Jest test suites (90/90 passing)
│   ├── scripts/          # Database seeding, maintenance & migration scripts
│   ├── server.js         # Backend server entry point
│   └── package.json
│
├── frontend/         # Vite 5 + React 18 + Tailwind CSS v4 + TanStack Query + Zustand
│   ├── src/
│   │   ├── components/   # UI components, Dialogs, Layouts, Navigation
│   │   ├── features/     # Feature components (Events, Reports, Admin, Treasurer)
│   │   ├── pages/        # 23 functional pages (Dashboard, Wallet, Onboarding, etc.)
│   │   ├── context/      # AuthContext & Theme services
│   │   ├── store/        # Zustand application store
│   │   ├── utils/        # API client, Auth routing, Export utils
│   │   └── index.css     # Global styles & design system tokens
│   ├── public/           # Static assets, PWA manifest, service-worker
│   ├── vite.config.js    # Vite build configuration with backend proxy
│   └── package.json
│
├── docs/             # Technical specifications & documentation
│   ├── SEIP_DOCUMENTATION.md  # Core platform specification
│   ├── BASELINE_AUDIT.md      # Migration & baseline audit report
│   ├── SOURCE_MATRIX.md       # Module source-of-truth matrix
│   ├── ai/                    # Gemini AI system architecture & guides
│   ├── onboarding/            # Onboarding flow documentation & test guides
│   └── archive/               # Historical migration & development audit reports
│
├── data/             # Reference datasets & import scripts
├── scripts/          # Utility and onboarding scripts
├── .env.example      # Environment variable template
├── .gitignore        # Git ignore rules
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on v22.15.0)
- **MongoDB**: Local MongoDB instance (port 27017) or MongoDB Atlas cluster

### 2. Backend Setup
```bash
cd backend
npm install
npm run test           # Run automated test suites
npm run dev            # Start backend on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev            # Start frontend on http://localhost:3000
```

---

## 🛡️ Security & Authentication
- Google OAuth 2.0 with JWT token issue
- Legacy/local login compatibility with bcrypt password hashing
- Account lockout policy (5 failed attempts, 15 min cooldown)
- Rate limiting on global API (500 req/15m) and authentication (10 req/15m)
- Helmet HTTP security headers & input sanitization (XSS and Mongo injection guards)
- Role-Based Access Control (Admin, Treasurer, Student/Member)
