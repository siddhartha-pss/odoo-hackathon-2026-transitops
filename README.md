# TransitOps — Smart Transport Operations Platform

<div align="center">

![TransitOps](https://img.shields.io/badge/TransitOps-Enterprise-6366f1?style=for-the-badge&logo=truck&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_15-black?style=for-the-badge&logo=next.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

**An enterprise-grade, AI-powered transport operations platform for fleet management, trip planning, maintenance tracking, and financial analytics.**

</div>

---

## 🚀 Features

### Core Modules
- **Dashboard** — Role-specific KPI dashboards with interactive charts
- **Vehicle Management** — Full CRUD with documents, QR codes, health monitoring
- **Driver Management** — Profiles, safety scores, leaderboards, badges
- **Trip Management** — Smart dispatch, route optimization, live tracking simulation
- **Maintenance** — Preventive/corrective scheduling, calendar view, cost tracking
- **Fuel Management** — Consumption analytics, efficiency trends, predictions
- **Expense Management** — Category-based tracking, auto-reports
- **Reports** — Export CSV/PDF/Excel with charts and analytics

### AI-Powered Features
- 🧠 Fleet Health Score — Weighted vehicle health analysis
- 🔮 Maintenance Prediction — ML-based service scheduling
- ⛽ Fuel Consumption Prediction — Trend analysis
- 🚛 Smart Dispatch — AI vehicle/driver recommendations
- ⚠️ Risk Detection — Automated anomaly alerts

### Premium UX
- 🎨 Glassmorphism design with dark/light modes
- ⌨️ Command Palette (Ctrl+K) for power users
- 🔔 Real-time notification center
- 📊 Interactive charts and heatmaps
- 🏆 Driver leaderboard & achievement badges
- 📱 Fully responsive mobile-first design

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Shadcn UI |
| Backend | Node.js, Express.js, Prisma ORM |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT + RBAC (4 roles) |
| Charts | Recharts |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |

## 📦 Getting Started

### Prerequisites
- Node.js 20+ 
- npm 10+

### Installation

```bash
# Clone the repository
git clone https://github.com/aditya-cs23b1087/odoo26.git
cd odoo26

# Install backend dependencies
cd backend
npm install

# Set up database
cp .env.example .env
npx prisma generate
npx prisma db push
npx prisma db seed

# Start backend server
npm run dev

# In a new terminal, install frontend dependencies
cd ../frontend
npm install

# Start frontend dev server
npm run dev
```

### Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Fleet Manager | fleet@transitops.com | password123 |
| Dispatcher | dispatcher@transitops.com | password123 |
| Safety Officer | safety@transitops.com | password123 |
| Financial Analyst | finance@transitops.com | password123 |

## 🏗️ Project Structure

```
transitops/
├── frontend/          # Next.js 15 App
│   ├── src/
│   │   ├── app/       # App Router pages
│   │   ├── components/# UI components
│   │   ├── hooks/     # Custom hooks
│   │   ├── lib/       # Utilities
│   │   ├── stores/    # State management
│   │   └── types/     # TypeScript types
│   └── public/        # Static assets
│
├── backend/           # Express.js API
│   ├── src/
│   │   ├── routes/    # API routes
│   │   ├── middleware/ # Auth & validation
│   │   ├── services/  # Business logic
│   │   └── utils/     # Helpers & AI
│   └── prisma/        # Database schema & seeds
│
└── README.md
```

## 👥 Team

Built with ❤️ for the Odoo Hackathon 2026

## 📄 License

MIT License
