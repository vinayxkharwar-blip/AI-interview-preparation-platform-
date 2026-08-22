# Major Project Documentation: AI-Powered Technical Interview & Career Readiness Platform

---

## 📌 Executive Summary & Abstract

**Project Title:** AI-Powered Technical Interview & Career Readiness Platform  
**Domain:** Artificial Intelligence, Full-Stack Web Development, Voice Processing, Conversational AI  
**Target Audience:** Job Seekers, College Students, Software Engineers, HR Tech Platforms  

### Abstract
In the modern competitive hiring landscape, technical interviews require candidates to articulate complex engineering concepts under high-pressure scenarios. Traditional preparation relies on static question lists or costly human mock interviews. 

This project delivers a **real-time, interactive AI-powered mock interview & career readiness ecosystem**. Using multimodal Generative AI (Google Gemini 1.5), Speech-to-Text (OpenAI Whisper), Web Audio Voice Activity Detection (VAD), and WebRTC streaming, the system conducts adaptive voice/video interviews with an interactive AI interviewer ("Alex"). The platform dynamically evaluates user spoken responses, poses intelligent technical follow-up questions, parses resumes for ATS compatibility, tracks job applications, and generates multi-dimensional performance feedback.

---

## 🏗️ System Architecture & Data Flow

### High-Level Architecture Diagram
```mermaid
graph TD
    subgraph Client Layer (Frontend)
        A[React 18 + Vite UI] --> B[Web Audio VAD Engine]
        A --> C[Speech Synthesis TTS]
        A --> D[WebRTC Video Stream / Canvas]
        A --> E[Recharts Analytics Dashboard]
    end

    subgraph Transport & API Layer
        F[Axios HTTP REST APIs]
        G[LiveKit WebRTC Signal Engine]
    end

    subgraph Server Layer (Backend Node.js/Express)
        H[Express Router & Controllers]
        I[JWT Authentication Middleware]
        J[Multer Audio/Resume Stream Uploads]
        K[LLM Service - Gemini Orchestrator]
        L[STT Service - Whisper Transcriber]
        M[Resume Parser - pdf-parse & mammoth]
    end

    subgraph AI & Infrastructure Services
        N[Google Gemini 1.5 API]
        O[OpenAI Whisper Speech API]
        P[LiveKit WebRTC Server Cloud]
        Q[MongoDB Atlas Database]
    end

    A --> F
    A --> G
    F --> H
    H --> I
    H --> J
    J --> L
    H --> K
    H --> M
    K --> N
    L --> O
    G --> P
    H --> Q
```

### End-to-End Data Flow Sequence (Live AI Interview Turn)
1. **TTS Output:** Candidate clicks start → Server sends opening question → Browser TTS speaks question aloud.
2. **Speech & Silence Capture:** Browser microphone opens → Web Audio API Analyser computes FFT volume energy in real time → Automatically detects start of speech & 2.0s post-speech silence cutoff.
3. **Audio Upload & STT:** Recorded WebM audio blob is streamed to backend (`/api/answers/transcribe`) → OpenAI Whisper model transcribes spoken response into clean text.
4. **Adaptive Gemini LLM Evaluation:** Transcribed response + conversation history are passed to Gemini 1.5 Pro via structured JSON prompt engineering.
5. **Dynamic Turn Score & Next Question:** Gemini scores technical accuracy, communication, and decision logic → Returns interviewer response + dynamic follow-up question.
6. **Live UI & Analytics Update:** Frontend receives response, updates live transcript drawer, plays AI response audio, and computes analytics metrics.

---

## 💻 Comprehensive Tech Stack

### 1. Frontend Technologies
- **Core Framework:** React.js (v18.3) with Vite build engine
- **Styling & Design System:** Tailwind CSS (v4.0) with custom editorial dark/light glassmorphism theme
- **Icons & UI Utilities:** Lucide React Icons, Recharts (Data Visualization Charts)
- **Routing & State Management:** React Router DOM (v6.25), Context API (Auth Context & State Machine)
- **Browser APIs Utilized:**
  - **Web Audio API:** AudioContext, AnalyserNode, MediaStreamSource for real-time Voice Activity Detection (VAD) & frequency visualizer bar.
  - **MediaRecorder API:** Real-time client-side audio chunk recording (`audio/webm`).
  - **Web Speech Synthesis API:** In-browser SpeechSynthesizer for natural text-to-speech AI voice playback.

### 2. Backend Technologies
- **Runtime Environment:** Node.js (v20+ ES Modules)
- **Web Framework:** Express.js (v4.19)
- **Database ORM:** Mongoose (v8.5) with MongoDB Atlas cloud database
- **Security & Authentication:** `jsonwebtoken` (JWT Stateless Authentication), `bcryptjs` (Salted Password Hashing)
- **File Upload Handler:** `multer` (In-memory buffer streaming for resume documents & audio files)

### 3. Artificial Intelligence & Third-Party APIs
- **Google Generative AI SDK (`@google/generative-ai`):** Google Gemini 1.5 Pro & Gemini 1.5 Flash models for context-aware interview questions, response scoring, ATS resume analysis, and career coaching.
- **OpenAI API (`openai`):** Whisper STT model (`whisper-1`) for speech-to-text transcription.
- **LiveKit Server SDK & Client (`livekit-server-sdk`, `livekit-client`):** Enterprise-grade WebRTC infrastructure for low-latency video and audio stream session rooms.
- **Document Processing Libraries:** `pdf-parse` (Extract text from PDF resumes) & `mammoth` (Extract text from DOCX documents).

---

## 🧩 Core Modules & Features

| Module Name | Core Functionality | Key Technology Used |
| :--- | :--- | :--- |
| **1. Live Voice/Video Interviewer ("Alex")** | Conducts interactive technical interviews with voice activity detection, dynamic follow-ups, and live captions. | Gemini 1.5, Whisper STT, Web Audio API, Web Speech Synthesis, WebRTC |
| **2. AI Resume & ATS Studio** | Upload PDF/DOCX resumes, extract technical skills matrix, calculate job-role ATS match score %, and suggest bullet point improvements. | `pdf-parse`, `mammoth`, Gemini 1.5 Structured Prompting |
| **3. Interactive Analytics & Dashboard** | Displays visual score trends, radar charts for skill gaps, historical performance stats, and feedback breakdown. | Recharts, MongoDB Aggregation Pipelines |
| **4. AI Career Coach & Job Tracker** | Contextual chatbot for career guidance, job application status management, and goal tracking. | Gemini 1.5 Pro, Express REST Endpoints, React Context |
| **5. Pre-Call Hardware Diagnostic** | Pre-call modal for camera preview, microphone testing, audio sensitivity level meter, and WebRTC fallback. | HTML5 MediaDevices API, Web Audio Analyser |

---

## 📡 API Endpoints Architecture

### Authentication Routes (`/api/auth`)
- `POST /api/auth/register` - Create candidate user account (Password salted & hashed via bcrypt).
- `POST /api/auth/login` - Authenticate user & issue signed JWT Bearer Token.
- `GET /api/auth/me` - Retrieve authenticated user session payload.

### Live Session Routes (`/api/sessions`)
- `GET /api/sessions` - Fetch all candidate interview sessions.
- `POST /api/sessions/create` - Initialize role-specific mock interview session.
- `POST /api/sessions/:id/live/turn` - Process candidate's turn (Gemini evaluation + next question generation).
- `POST /api/sessions/:id/live/complete` - Finalize interview session and compute total summary scores.

### Audio & Transcription Routes (`/api/answers`)
- `POST /api/answers/transcribe` - Accepts multipart/form-data WebM audio blob, streams to OpenAI Whisper, returns text transcript.

### Resume & ATS Routes (`/api/resumes`)
- `POST /api/resumes/upload` - Upload PDF/DOCX resume file, extract text, trigger Gemini ATS matching engine.
- `GET /api/resumes` - Retrieve parsed resume history and ATS report.

---

## ⚙️ Advanced Engineering Techniques Implemented

### 1. Client-Side Voice Activity Detection (VAD) with Web Audio API
Rather than forcing candidates to manually click "Stop Speaking" after every sentence, the platform utilizes Web Audio API Fast Fourier Transform (FFT) analysis:
```js
// Frequency Spectrum Analysis for Silence Detection
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(dataArray);
const averageVolume = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;

if (averageVolume > SILENCE_VOLUME_CUTOFF) {
  lastLoudTime = Date.now(); // Active Speech Detected
} else if (Date.now() - lastLoudTime > 2000) {
  stopListening(); // Auto-finalize turn after 2 seconds of silence
}
```

### 2. Adaptive Conversational AI Prompting
To eliminate long delays during live interviews, the backend sends a zero-shot structured JSON prompt to Gemini:
- **System Role:** Expert Technical Interviewer (Alex).
- **Output Constraint:** Valid JSON object containing `turnScore` (1-10), `interviewerLine` (conversational response), `nextQuestionText`, and `decision` (`'next_question'` or `'complete'`).

### 3. Graceful Hardware & Stream Fallbacks
If a user's web browser blocks camera permissions or has non-supported video hardware, the application seamlessly switches to **Audio-Only WebRTC mode** or **Text Fallback mode** without interrupting the interview pipeline.

---

## 🗄️ Database Schema Design (MongoDB)

```
User Schema
 ├── _id (ObjectId)
 ├── name (String)
 ├── email (String, unique)
 ├── password (String, hashed)
 ├── targetRole (String)
 └── createdAt (Date)

InterviewSession Schema
 ├── _id (ObjectId)
 ├── userId (Ref -> User)
 ├── targetRole (String)
 ├── mode (String: 'voice' | 'text')
 ├── overallScore (Number)
 ├── feedback (Object: { strengths, improvements, summary })
 ├── turns (Array of Turn Objects)
 │    ├── questionText (String)
 │    ├── userTranscript (String)
 │    ├── turnScore (Number)
 │    └── interviewerLine (String)
 └── status (String: 'in_progress' | 'completed')
```

---

## 🎤 Viva & Faculty Defense Presentation Q&A

### Q1: Why did you choose Google Gemini 1.5 over basic GPT-3.5 models?
> **Answer:** Gemini 1.5 Pro offers superior context window performance, low-latency JSON mode schema enforcement, and structured reasoning capabilities necessary for accurate technical evaluation and candidate scoring.

### Q2: How does the system handle noisy audio environments?
> **Answer:** The client-side Web Audio API analyser applies a customizable RMS energy noise floor threshold (`SILENCE_VOLUME_CUTOFF`). Additionally, OpenAI Whisper STT applies noise suppression and acoustic modeling to accurately transcribe candidate answers even with minor background noise.

### Q3: How is data privacy maintained for candidate resumes and video?
> **Answer:** Web camera frames are processed strictly in local browser memory (`MediaStream` attached to video DOM elements) and are never stored on external disk storage. Resumes are processed in volatile memory buffers (`MemoryStorage` via Multer) and parsed text is sanitized before LLM evaluation.

### Q4: What is the main novelty of this project compared to existing platforms?
> **Answer:** Unlike static LeetCode/HackerRank coding portals or scripted video platforms, our project implements an **adaptive voice loop** with automated silence detection, dynamic follow-up technical questions based on the candidate's exact verbal responses, and automated ATS resume feedback in a unified dashboard.

---
*Documentation compiled for Major Project Academic Submission & Final Defense.*
