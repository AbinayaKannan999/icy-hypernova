# 🌉 FoodBridge - Intelligent Food Distribution System

An advanced, full-stack food distribution platform designed to connect food donors (individuals, restaurants, caterers) with people in need, NGOs, and volunteers. By leveraging real-time tracking, an intelligent workflow, and dynamic dashboards, FoodBridge minimizes food waste and maximizes community impact.

## 🌟 Key Features

### 🔐 Intelligent Authentication & Roles
- **4 Distinct Roles**: Admin, Donor, Volunteer, Receiver.
- **Role-Based Access Control (RBAC)**: Each user gets a customized dashboard tailored to their specific needs.
- **Secure**: Features JWT-based authentication with bcrypt password hashing.

### 🍱 Comprehensive Donation Management
- **Add Donations**: Donors can list food with detailed attributes (type, quantity, expiry, condition, photos).
- **Auto-Validation**: Automatic safety checks based on food expiry times.
- **Categorization**: Filter donations by cooked meals, raw produce, bakery, dairy, and more.

### 🔄 Dynamic Request & Delivery Workflow
- **Receiver Requests**: Receivers can request specific quantities from available donations.
- **Donor Approval**: Donors or Admins can accept or reject requests with reasoning.
- **Volunteer Assignment**: Approved requests become available for Volunteers to accept.
- **Real-Time Delivery Tracking**: WebSockets to push live updates from pending → accepted → picked up → in transit → delivered.
- **QR Code Simulation**: Built-in flow for validating deliveries at the destination dropoff.

### 📊 Powerful Dashboards & Analytics
- **Admin Control Center**: Oversee the entire ecosystem. Send broadcast notifications, manage users, and view platform-wide stats.
- **Impact Metrics**: Track total meals donated, beneficiaries fed, active volunteers, and general platform efficiency.
- **Live Charts**: Visualized data for donations over time using Chart.js.
- **Automated Leaderboards**: Highlighting the top Donors and Volunteers to encourage participation.

### 🔔 Real-Time Notifications & Feedback
- **Socket.IO Integration**: Instant, toast-based popups when a new donation is available, a request is approved, or a delivery changes status.
- **Community Feedback**: Real-time review and rating system ensuring trust and quality.

## 🛠️ Technology Stack

**Frontend**
- React.js (v18)
- React Router DOM (v6)
- Axios & Socket.IO Client
- Chart.js & React-Chartjs-2
- Pure CSS design architecture (No heavy UI frameworks)
- React Hot Toast for micro-animations

**Backend**
- Node.js & Express
- PostgreSQL with `pg` connection pooling
- Socket.IO for real-time WebSocket events
- JSON Web Tokens (JWT) & BcryptJS
- Express-Validator & Helmet
- Nodemailer (Configured for future email integrations)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- PostgreSQL installed and running locally

### 1. Database Setup
Create your PostgreSQL database:
```sql
CREATE DATABASE foodbridge;
```
*Note: Make sure your PostgreSQL user has the necessary permissions.*

### 2. Backend Setup
Navigate into the `backend` directory and install dependencies:
```bash
cd backend
npm install
```

Configure environment variables:
Create a `.env` file in the `backend` directory based on `.env.example`:
```env
PORT=5000
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=foodbridge
JWT_SECRET=super_secret_jwt_key_here_change_me
JWT_EXPIRRES_IN=24h
```

Run database migrations and seed data:
```bash
node src/database/migrate.js
node src/database/seed.js
```

Start the backend server:
```bash
npm run dev
```

### 3. Frontend Setup
Navigate into the `frontend` directory and install dependencies:
```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm start
```
The client will start at `http://localhost:3000`.

## 🧪 Demo Accounts

The database seeding script creates ready-to-use demo accounts for quick testing. Password for all demo accounts is **`Password123!`**.
- **Admin**: `admin@foodbridge.com`
- **Donor**: `donor@foodbridge.com`
- **Volunteer**: `volunteer@foodbridge.com`
- **Receiver**: `receiver@foodbridge.com`

*Tip: The Login page contains one-click buttons to instantly autofill these credentials.*

## 📁 Directory Structure
```
FoodBridge/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Request handlers logic
│   │   ├── database/       # DB connection, schema, seeders
│   │   ├── middleware/     # Auth & validation checks
│   │   ├── routes/         # Express API routes
│   │   ├── socket/         # Real-time event handlers
│   │   ├── utils/          # Helpers & email services
│   │   └── server.js       # Express app & server entry
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/     # AppLayout, Header, Sidebar
    │   ├── context/        # Auth, Socket, and Notification contexts
    │   ├── pages/          # Auth flows & Dashboards per role
    │   ├── services/       # Centralized Axios API wrappers
    │   ├── App.js          # Routing configuration
    │   └── index.css       # Complete design architecture & tokens
    └── package.json
```
