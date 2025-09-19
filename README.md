# Skooly

A modern **Next.js + TypeScript** based web application for managing school-related workflows.  
The project is built with a modular structure, Prisma ORM, and reusable React components for scalability.

## 📑 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)

## 📘 About

Skooly is designed to simplify **school management** by providing:

- Student records & class management
- Grade tracking
- Authentication (via Clerk)
- Pagination & search for large datasets
- Prisma-powered database layer

## ✨ Features

- ⚡ Built with **Next.js 14** (App Router)
- 🔒 Authentication & session management with **Clerk**
- 🗂 Database ORM using **Prisma**
- 🎨 Reusable UI components with **TailwindCSS**
- 🔍 Dynamic table search and pagination
- 🖼 Optimized images via **Next/Image**

## 🛠 Tech Stack

- **Frontend:** Next.js, React, TypeScript, TailwindCSS
- **Backend:** Next.js API Routes
- **Database:** Prisma ORM (PostgreSQL)
- **Auth:** Clerk
- **Deployment:** Vercel / Render

## 🚀 Getting Started

### 1️⃣ Clone the repo

```bash
git clone https://github.com/your-username/Skooly.git
cd Skooly
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Setup environment variables

Create a .env file in the root:

```bash
DATABASE_URL="your-database-url"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your-clerk-publishable-key"
CLERK_SECRET_KEY="your-clerk-secret-key"
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
NEXT_PUBLIC_CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"
```

### 4️⃣ Prisma setup

```bash
npx prisma generate
npx prisma migrate dev
```

### 5️⃣ Run the development server

```bash
npm run dev
```

The app will be live at http://localhost:3000

### 📜 Available Scripts

From package.json:

```bash
npm run dev – start development server

npm run build – build for production

npm run start – run production build

npx prisma studio – open Prisma database GUI
```

### 📂 Project Structure

```bash
Skooly/
├── prisma/ # Prisma schema & migrations
├── public/ # Static assets
├── src/
│ ├── app/ # Next.js App router
│ ├── components/ # Reusable UI components
│ ├── lib/ # Utilities (Prisma, settings)
│ ├── styles/ # Global styles
│ └── pages/ # Legacy Next.js pages (if any)
├── package.json
└── README.md
```

### 🤝 Contributing

Contributions are welcome!

- Fork the repo
- Create a new branch (git checkout -b feature-name)
- Commit changes (git commit -m 'Add feature')
- Push (git push origin feature-name)
- Open a Pull Request

# 👨‍💻 Author

Made by **_Affan Khan_**
