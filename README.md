# TransitOps 🚀

TransitOps is a premium Transport Operations Platform built for the modern logistics and fleet management industry. It features a beautiful, responsive UI, a robust backend, and mock AI integrations for smart dispatch, predictive maintenance, and fleet health monitoring.

## 🛠 Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- Tailwind CSS v4
- Framer Motion (Animations)
- Recharts (Data Visualization)
- Zustand (State Management)

**Backend:**
- Node.js & Express
- Prisma ORM
- SQLite (Development Database)
- JWT Authentication & RBAC

---

## 🚀 How to Run Locally

If you have just cloned this repository, follow these steps to get both the backend and frontend running on your local machine.

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v20+ recommended).

### 1. Start the Backend

Open a terminal and navigate to the `backend` folder:

```bash
cd backend
```

Install the dependencies:
```bash
npm install
```

Generate the Prisma client and push the schema to the SQLite database:
```bash
npx prisma generate
npx prisma db push
```

*(Optional but recommended)* Seed the database with sample transport data (vehicles, drivers, trips, etc.):
```bash
npx prisma db seed
```

Start the backend server:
```bash
npm run dev
```
The backend will run on **http://localhost:3001**.

### 2. Start the Frontend

Open a **new** terminal window and navigate to the `frontend` folder:

```bash
cd frontend
```

Install the dependencies:
```bash
npm install
```

Start the frontend development server:
```bash
npm run dev
```
The frontend will run on **http://localhost:3000**.

### 3. Open the App

Open your web browser and navigate to [http://localhost:3000](http://localhost:3000). You are automatically logged in via mock auth state and can explore the dashboard!
