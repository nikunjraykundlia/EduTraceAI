# 🎓 EduTrace AI - Elevating Learning with AI Precision

## Deployed Link: [View Live Demo](https://edutrace-ai.onrender.com/)

![EduTrace AI Hero](./frontend/public/hero.png)

> **"Transforming passive YouTube watching into an active, data-driven learning experience."**

EduTrace AI is a state-of-the-art educational ecosystem that leverages Artificial Intelligence to bridge the gap between video content and mastery. By processing YouTube lectures, it generates precision transcripts, smart summaries, AI-verified MCQs, and provides an interactive AI doubt resolver—all wrapped in a premium, cinematic user interface.

---

## ✨ Key Features

### 🎥 Cinematic Learning Experience
- **16:9 Instructor Layout**: A professional, distraction-free viewing experience optimized for educational content.
- **Auto-Scrolling Transcripts**: Synchronized transcripts that follow the video playback in real-time.
- **Auto-Transcription**: High-fidelity extraction of transcripts from any YouTube video via advanced APIs.
- **Smart Summarization**: AI-generated notes that distill complex lectures into actionable insights.

### 📝 Intelligent Assessment System
- **AI-Powered MCQ Generation**: Context-aware quizzes generated directly from the video content using n8n workflows.
- **One-Attempt Policy**: Strict validation for published quizzes in College Mode to ensure academic integrity.
- **Instant Analytics**: Real-time grading with detailed performance breakdowns and confidence scores.

### 🏛️ Classroom & College Ecosystem
- **Instructor Dashboard**: Tools for creating classrooms, uploading videos, managing quizzes, and tracking student performance.
- **Student Portal**: Join classrooms via unique codes, track progress across subjects, and earn rewards.
- **Analytics & Tracking**: Comprehensive dashboards for instructors to monitor class-wide completion rates and average scores.

### 💬 AI Doubt Resolver
- **Contextual Chat**: Ask questions directly related to the video content and get immediate answers from our AI-driven tutor.
- **Session Persistence**: Keep track of your learning queries and revisit AI explanations anytime.

### 🎮 Gamified Motivation
- **Rewards System**: Earn coins for every quiz completed and milestone reached.
- **Marketplace**: Exchange earned coins for exclusive platform perks and digital assets.

### 🌍 Universal Accessibility (Hindi Support)
- **Devanagari Precision**: Full support for Hindi text (Unicode range \u0900-\u097F) in transcripts and PDF exports.
- **Mixed Content Handling**: Seamlessly process and render bilingual (Hindi/English) educational material.

---

## 🛠️ Technical Architecture

### **Frontend**
- **Core**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS 4 (Modern Utility-First Styles)
- **Animations**: Framer Motion 12 (Premium Micro-interactions)
- **Visuals**: Three.js & WebGL (High-performance backgrounds)
- **State Management**: React Hooks & Context API
- **Networking**: Axios with Interceptors

### **Backend**
- **Runtime**: Node.js (High-performance event loop)
- **API Framework**: Express.js 5 (Modular Controller Pattern)
- **Database**: MongoDB with Mongoose 9.3.0
- **Security**: JWT Authentication, Bcryptjs 3.0, Helmet, CORS
- **Media Processing**: FFmpeg-static, PDFKit (for Hindi-ready exports)

### **AI & Orchestration**
- **Workflow Engine**: [n8n](https://n8n.io/) for complex AI logic routing.
- **LLM Integration**: Automated quiz generation and summarization services.
- **Data Acquisition**: SERP API for real-time YouTube transcript harvesting.

---

## 🚀 Local Implementation Guide

### Prerequisites
- Node.js (v18.x or higher)
- MongoDB (Local or Atlas instance)
- API Keys: SERP API, n8n Webhook URLs

### Step 1: Clone & Install
```bash
git clone https://github.com/Hackverse2k26/edutech-we08_ai_bytes.git
cd EduTrace-AI
```

### Step 2: Backend Configuration
```bash
cd backend
npm install
# Configure your .env file
npm run dev
```

### Step 3: Frontend Deployment
```bash
cd ../frontend
npm install
# Set NEXT_PUBLIC_API_URL in .env.local
npm run dev
```

---

## 🔐 Environment Configuration

### Backend Variable Map (`/backend/.env`)
| Variable | Purpose |
| :--- | :--- |
| `MONGODB_URI` | Database Connection String |
| `JWT_SECRET` | Authentication Signature Key |
| `SERP_API_KEY` | YouTube Metadata Extraction |
| `N8N_CHAT_WEBHOOK` | Doubt Resolver Endpoint |
| `IMAGEKIT_PRIVATE_KEY` | Media Storage Credentials |

### Frontend Variable Map (`/frontend/.env.local`)
| Variable | Purpose |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base Backend API URL |

---

## 🔄 Recent Changelog (v2.1.0)
- **Added**: Instructor Video Upload & Management.
- **Enhanced**: Cinematic 16:9 layout for the student classroom view.
- **Integrated**: Strict "One-Attempt" quiz validation logic.
- **Optimized**: Tailwind CSS 4 migration for improved performance.
- **Fixed**: Hindi font rendering in high-density PDF exports.

---

> **🎓 EduTrace AI - Redefining the boundaries of digital education through AI.**