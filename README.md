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
- Node.js 18+
- npm or yarn
- Flutter SDK (for mobile)
- Firebase CLI

### Web App Setup
```bash
cd web
npm install
npm run dev
```

### Firebase Setup
```bash
npm install -g firebase-tools
firebase login
firebase init
```

## 👥 Team

Team of 4 for KitaHack 2026

## 📝 License

MIT
