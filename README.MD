# 🎓 EduTrace AI - Elevating Learning with AI Precision

## Deployed Link: [View Project](https://edutrace-ai.onrender.com/)

<img src="./frontend/public/hero.png" alt="Hero Image" width="400" height="200">

> **Transforming YouTube videos into interactive learning experiences.**

EduTrace AI is a next-generation educational platform that leverages Artificial Intelligence to bridge the gap between passive video watching and active learning. By processing YouTube content, it generates comprehensive transcripts, summarizes complex topics, creates interactive MCQs, and provides an AI-driven doubt resolver to ensure every student masters their subjects.

---

## ✨ Key Features

### 🎥 Intelligent Video Processing
- **Auto-Transcription**: Seamlessly extract high-quality transcripts from any YouTube video.
- **Smart Summarization**: Get the gist of long lectures in seconds with AI-generated notes.

### 📝 Interactive Assessments
- **AI Quiz Generation**: Automatically generates context-aware Multiple Choice Questions based on the video transcript.
- **Instant Grading**: Get immediate feedback and performance analytics after completing tests.

### 💬 AI Doubt Resolver
- **Contextual Chat**: Ask questions directly related to the video content and get instant, accurate answers from our AI tutor.

### 🎮 Gamified Learning (Rewards System)
- **Earn Coins**: Students earn virtual currency for completing quizzes and participating in learning activities.
- **Item Store**: Exchange earned coins for exclusive rewards or platform perks.

### � Multi-Language Support
- **Hindi Language PDF Generation**: Full support for Hindi text in transcript PDFs using Noto Sans Devanagari fonts
- **Automatic Language Detection**: System automatically detects Hindi characters (Unicode range \u0900-\u097F) and applies appropriate fonts
- **Mixed Content Support**: Seamlessly handles transcripts with both Hindi and English content
- **Font Fallback**: Robust error handling with fallback to default fonts if Hindi fonts fail to load

### � College & Personal Modes
- **Personal Mode**: Track your individual progress and learning journey.
- **College Mode**: Join classrooms, participate in group tests, and collaborate with peers and instructors.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (React 19.2.3)
- **Styling**: Vanilla CSS & Tailwind CSS
- **Animations**: [Framer Motion](https://www.framer.com/motion/) v12.36.0
- **Icons**: [Lucide React](https://lucide.dev/) v0.577.0
- **Charts**: Chart.js v4.5.1 & React-Chartjs-2 v5.3.1
- **Additional**: React Markdown, React YouTube, HTML2Canvas, Axios, js-cookie, clsx, tailwind-merge

### Backend
- **Runtime**: Node.js
- **Web Framework**: Express.js (v5.2.1)
- **Database**: MongoDB (Mongoose v9.3.0)
- **Authentication**: JWT & Bcrypt.js v3.0.3
- **PDF Generation**: PDFKit v0.17.2
- **Font Support**: @fontsource/noto-sans-devanagari v5.2.8 (Hindi language support)
- **Validation**: Express-validator v7.3.1
- **Additional**: Axios, CORS, Helmet, Morgan, FFmpeg-static, Form-data, dotenv

### AI & Automation
- **Transcript API**: SERP API for YouTube transcript extraction
- **Workflow Engine**: [n8n](https://n8n.io/) for AI-powered content generation
- **AI Processing**: Automated quiz generation, summarization, and doubt resolution

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Video Processing
- `POST /api/transcribe` - Process YouTube video and generate transcript
- `GET /api/transcribe/:videoId` - Get transcript for a video
- `POST /api/transcribe/pdf` - Generate PDF transcript (with Hindi support)

### Quiz System
- `POST /api/quiz/generate` - Generate quiz from transcript
- `POST /api/quiz/submit` - Submit quiz attempt
- `GET /api/quiz/:quizId` - Get quiz details

### AI Chat
- `POST /api/chat` - Send message to AI tutor
- `GET /api/chat/history/:sessionId` - Get chat history

### Classroom Management
- `POST /api/classroom/create` - Create classroom
- `POST /api/classroom/join` - Join classroom
- `GET /api/classroom/:id` - Get classroom details

### Rewards System
- `GET /api/coins/balance` - Get user coin balance
- `POST /api/coins/earn` - Earn coins from activities
- `GET /api/store/items` - Get available store items
- `POST /api/store/purchase` - Purchase items with coins

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas or Local instance
- SERP API key for YouTube transcript extraction
- n8n instance (for AI workflow automation)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Hackverse2k26/edutech-we08_ai_bytes.git
   cd EduTrace-AI
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Create a .env file based on the Environment Variables section below
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm run dev
   ```

4. **Font Setup (Hindi Support)**
   - Hindi fonts (Noto Sans Devanagari) are automatically installed via npm
   - Font files are located in `node_modules/@fontsource/noto-sans-devanagari/files/`
   - No additional configuration required - fonts are registered automatically in the PDF generation system

---

## 🔐 Environment Variables

### Backend (`/backend/.env`)
| Variable | Description |
| :--- | :--- |
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Secret key for token generation |
| `SERP_API_KEY` | SERP API key for YouTube transcript extraction |
| `N8N_CHAT_WEBHOOK` | n8n webhook for chat/doubt resolution |
| `N8N_TRANSCRIPTION_WEBHOOK` | n8n webhook for transcription processing |
| `N8N_QUIZ_WEBHOOK_URL` | n8n webhook for quiz generation |

### Frontend (`/frontend/.env.local`)
| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: http://localhost:5000) |

---

## 🔄 Recent Updates

### ✅ Version 2.0 Features
- **Hindi Language Support**: Complete Devanagari script support in PDF generation
- **Multi-Language Content**: Support for mixed Hindi/English transcripts

---

## 👥 Team AI Bytes

**Hackverse 2k26**
- AI-powered educational platform built with passion for learning

---

> **🎓 EduTrace AI - Making education accessible, interactive, and intelligent.**