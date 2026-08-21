# AI Interview Preparation Platform (MERN Stack)

A state-of-the-art full-stack **AI Interview Preparation Platform** built with **MongoDB, Express, React, and Node.js**, powered by **OpenAI API (`gpt-4o-mini`)** for personalized question generation, rubric answer grading, and improvement planning, and **OpenAI Whisper API** for speech-to-text transcription.

---

## 🎯 Key Features

1. **JWT Authentication & Protected Routes**: Full user registration, login, token persistence, and route authorization using `bcryptjs` and `jsonwebtoken`.
2. **Resume Parsing & Extraction**: Accept PDF (`pdf-parse`) and DOCX (`mammoth`) files, extract raw text, and invoke `gpt-4o-mini` to output structured candidate profile JSON (skills, experience, projects, target role).
3. **Customized Question Generation**: Generate 5–8 personalized technical, behavioral, or HR questions based on the candidate's parsed resume, target role, and difficulty level.
4. **Voice & Text Answer Recording**: Capture audio using browser `MediaRecorder` API, upload to backend, transcribe via OpenAI Whisper API (`whisper-1`), and present a transcript confirmation/editing step before submitting.
5. **Structured AI Answer Evaluation**: Grade candidate answers on a strict 1–10 rubric with category scores, key strengths, missing points/weaknesses, and actionable coaching suggestions.
6. **AI Improvement Plan Synthesis**: Aggregate all session Q&As and generate 3–5 focus areas with observations and specific practice recommendations.
7. **Analytics Dashboard with Recharts**: Visualize historical score trendlines (LineChart), category domain skill proficiency (RadarChart), and weakest topic frequencies computed via **MongoDB Aggregation Pipelines**.

---

## 🏗️ Project Architecture & Folder Structure

```
AI Interview Preparation Platform/
├── server/
│   ├── config/
│   │   └── db.js                 # MongoDB connection & fallback handling
│   ├── models/
│   │   ├── User.js               # User schema
│   │   ├── Resume.js             # Resume & extracted JSON schema
│   │   ├── Session.js            # Interview session metadata
│   │   ├── Question.js           # Generated questions schema
│   │   ├── Answer.js             # Submitted user answers & audio URLs
│   │   ├── Feedback.js           # 1-10 grade, strengths, weaknesses
│   │   ├── ImprovementPlan.js    # AI focus areas & recommendations
│   │   └── AnalyticsSnapshot.js  # Precomputed or cached metrics
│   ├── prompts/
│   │   ├── resumePrompts.js      # Prompts for resume data extraction
│   │   ├── questionPrompts.js    # Prompts for question generation
│   │   ├── feedbackPrompts.js    # Prompts for answer grading rubric
│   │   └── improvementPrompts.js # Prompts for session improvement plan
│   ├── services/
│   │   ├── llmService.js         # OpenAI GPT service abstraction
│   │   ├── sttService.js         # OpenAI Whisper transcription service
│   │   └── resumeParser.js       # pdf-parse & mammoth document parsing
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT auth middleware
│   │   └── uploadMiddleware.js   # Multer file upload setup
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── resumeController.js
│   │   ├── sessionController.js
│   │   ├── questionController.js
│   │   ├── answerController.js
│   │   ├── feedbackController.js
│   │   └── analyticsController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── resumeRoutes.js
│   │   ├── sessionRoutes.js
│   │   ├── questionRoutes.js
│   │   ├── answerRoutes.js
│   │   ├── feedbackRoutes.js
│   │   └── analyticsRoutes.js
│   ├── uploads/                  # Upload directory
│   ├── .env.example
│   ├── package.json
│   └── server.js                 # Express entry point
└── client/
    ├── src/
    │   ├── api/
    │   │   └── axiosClient.js    # Pre-configured Axios instance with JWT interceptor
    │   ├── context/
    │   │   └── AuthContext.jsx   # Global auth state & methods
    │   ├── components/
    │   │   ├── Navbar.jsx        # Navigation header
    │   │   ├── ProtectedRoute.jsx# Auth route wrapper
    │   │   ├── ResumeUpload.jsx  # Resume file drop & status
    │   │   ├── QuestionCard.jsx  # Question view with hints
    │   │   ├── AnswerRecorder.jsx# Speech recorder & STT confirmation
    │   │   ├── FeedbackCard.jsx  # Score badge (1-10) & rubric details
    │   │   ├── SessionSummary.jsx# End of session score breakdown
    │   │   ├── ImprovementPlanCard.jsx # Actionable focus area recommendations
    │   │   └── AnalyticsDashboard.jsx  # Recharts trendline, radar chart, & topic breakdown
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Resumes.jsx
    │   │   ├── NewSession.jsx
    │   │   ├── InterviewSession.jsx
    │   │   ├── SessionDetail.jsx
    │   │   └── Analytics.jsx
    │   ├── App.jsx
    │   ├── index.css
    │   └── main.jsx
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## 🔑 Environment Variables Setup

Create a `.env` file inside the `server/` directory:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ai-interview-prep
JWT_SECRET=super-secret-ai-interview-prep-jwt-key-2026
OPENAI_API_KEY=your_openai_api_key_here
```

> **Note**: The system includes a realistic service mock layer if `OPENAI_API_KEY` is not provided or MongoDB is offline during initial sandbox evaluation.

---

## 💻 Local Installation & Setup

### 1. Backend Setup
```bash
cd server
npm install
npm run dev
# Server will start on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd client
npm install
npm run dev
# Client will start on http://localhost:3000
```

---

## 📡 REST API Summary

- **`POST /api/auth/register`**: Create new account
- **`POST /api/auth/login`**: Authenticate user and return JWT
- **`GET /api/auth/me`**: Fetch current user
- **`POST /api/resumes/upload`**: Upload PDF/DOCX resume & extract structured JSON
- **`GET /api/resumes`**: List user resumes
- **`POST /api/sessions/start`**: Configure role, difficulty, interview type, & generate questions
- **`GET /api/sessions/:id`**: Fetch session details, questions, answers, and feedback
- **`POST /api/answers/transcribe`**: Upload audio & transcribe via OpenAI Whisper
- **`POST /api/answers/submit`**: Submit answer text/audio for 1-10 rubric grading
- **`POST /api/sessions/:id/complete`**: Complete session & generate AI Improvement Plan
- **`GET /api/analytics/dashboard`**: Run MongoDB aggregation pipelines for charts
