# 3D AI Accessibility Checker

A web-based accessibility analyzer for indoor spaces, powered by AI.

## 🎯 Project Overview

This tool helps small businesses (cafés, clinics, classrooms) check their spaces for accessibility compliance. Users can design floor plans in the web editor or scan rooms using the mobile AR companion, then receive AI-powered accessibility feedback.

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Web Frontend | React + Vite + TypeScript + Three.js |
| Mobile | Flutter + ARCore |
| Backend | Firebase (Functions, Firestore, Storage) |
| AI | Gemini API |

## 📁 Project Structure

```
Ben10/
├── web/              # React web app
├── mobile/           # Flutter companion app
├── functions/        # Firebase Cloud Functions
├── shared/           # Shared types and schemas
└── docs/             # Documentation
```

## 🚀 Getting Started

### Prerequisites

Before running the system, ensure you have:

| Requirement | Purpose |
|-------------|---------|
| **Node.js 18+** | Run the web app and tooling |
| **npm** or **yarn** | Install dependencies |
| **Flutter SDK** | Build/run the mobile companion app (optional) |
| **Firebase CLI** | Deploy backend and use Firebase features (optional) |

### How to Run the System

**1. Clone and open the project**
```bash
git clone <repository-url>
cd Ben10
```

**2. Install dependencies and start the web app**
```bash
cd web
npm install
npm run dev
```

The dev server will start (e.g. `http://localhost:5173`). Open that URL in your browser to use the editor.

**3. Environment variables**

For save/load and AI features, copy `web/.env.example` to `web/.env.local` and fill in your Firebase and Gemini API keys. The app runs without them, but persistence and AI checks require this setup.

**4. Firebase setup**
```bash
npm install -g firebase-tools
firebase login
firebase init
```

## 👥 Team

Team of 4 for KitaHack 2026

## 📝 License

MIT
