# 🎓 EduTrace AI - Elevating Learning with AI Precision

## Deployed Link: [View Project](https://edutrace-ai.onrender.com/)

![Hero Image](./frontend/public/hero.png)

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

### 🏢 College & Personal Modes
- **Personal Mode**: Track your individual progress and learning journey.
- **College Mode**: Join classrooms, participate in group tests, and collaborate with peers and instructors.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (React 19)
- **Styling**: Vanilla CSS & Tailwind CSS
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: Chart.js & React-Chartjs-2

### Backend
- **Runtime**: Node.js
- **Web Framework**: Express.js (v5)
- **Database**: MongoDB (Mongoose)
- **Authentication**: JWT & Bcrypt.js
- **Media Handling**: ImageKit & PDFKit

### AI & Automation
- **Workflow Engine**: [n8n](https://n8n.io/)
- **YouTube API**: Custom extractors for transcripts and metadata.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas or Local instance
- n8n instance (for AI workflows)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/EduTrace-AI.git
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

---

## 🔐 Environment Variables

### Backend (`/backend/.env`)
| Variable | Description |
| :--- | :--- |
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Secret key for token generation |
| `N8N_BASE_URL` | Base URL of your n8n instance |
| `IMAGEKIT_PUBLIC_KEY` | ImageKit public key for asset storage |
| `IMAGEKIT_PRIVATE_KEY` | ImageKit private key |
| `IMAGEKIT_ENDPOINT` | ImageKit endpoint URL |

---

## 📐 Architecture

EduTrace AI follows a modular architecture:
- **Client**: Next.js single-page application handling the UI/UX.
- **API Server**: Node.js/Express server managing authentication, data storage, and business logic.
- **AI Engine**: n8n workflows triggered via webhooks for heavy-lifting tasks like transcription, quiz generation, and chat.

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 📬 Contact

Project Link: [https://github.com/your-username/EduTrace-AI](https://github.com/your-username/EduTrace-AI)

<p align="center">Made with ❤️ by the EduTrace AI Team</p>
