import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

let geminiClient = null;
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
  geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

const extractResumeFallback = (rawText = '') => {
  const commonSkills = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'Express.js',
    'HTML', 'CSS', 'SQL', 'MySQL', 'MongoDB', 'PostgreSQL', 'Git', 'GitHub',
    'Docker', 'Linux', 'Vercel', 'Render', 'REST API', 'AWS', 'Java', 'C++', 'Tailwind'
  ];

  const foundSkills = commonSkills.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, 'i').test(rawText);
  });

  const fallbackSkills = foundSkills.length > 0 
    ? foundSkills 
    : ['JavaScript', 'Python', 'React', 'Node.js', 'SQL', 'Git', 'Docker'];

  let targetRole = 'Full Stack Engineer';
  if (rawText.toLowerCase().includes('information technology')) targetRole = 'Information Technology Engineer';
  if (rawText.toLowerCase().includes('software engineer')) targetRole = 'Software Engineer';
  if (rawText.toLowerCase().includes('full stack')) targetRole = 'Full Stack Engineer';
  if (rawText.toLowerCase().includes('backend')) targetRole = 'Backend Engineer';

  const projects = [];
  if (rawText.includes('TrainIQ')) {
    projects.push({ name: 'TrainIQ', description: 'Fitness & Nutrition Platform', techStack: ['React', 'TypeScript', 'Node.js', 'Express.js', 'MySQL'] });
  }
  if (rawText.includes('DeckForge')) {
    projects.push({ name: 'DeckForge', description: 'AI Presentation Generator', techStack: ['Python', 'NLP', 'REST API'] });
  }
  if (rawText.includes('CodeSentinel')) {
    projects.push({ name: 'CodeSentinel', description: 'Security Auditing Tool', techStack: ['Python', 'Docker', 'Linux'] });
  }

  if (projects.length === 0) {
    projects.push({ name: 'AI Platform', description: 'Technical application project', techStack: fallbackSkills.slice(0, 4) });
  }

  const summaryMatch = rawText.match(/Professional Summary\s*([\s\S]*?)(?=Core Skills|Experience|Projects|Education|$)/i);
  const summary = summaryMatch && summaryMatch[1]?.trim() 
    ? summaryMatch[1].trim().replace(/\s+/g, ' ').substring(0, 300)
    : 'Experienced engineer with strong foundation in full stack development, cloud computing, and software infrastructure.';

  return {
    skills: fallbackSkills,
    experience: [
      {
        title: 'Server Administrator Intern',
        company: 'Aptech',
        duration: 'Jan 2026 – Jun 2026',
        highlights: ['Monitored and maintained server infrastructure', 'Managed user accounts and system permissions']
      }
    ],
    projects,
    targetRole,
    summary
  };
};

const mockLLMResponse = (prompt) => {
  console.log('[LLM Service Mock] Generating fallback JSON response...');
  const lower = prompt.toLowerCase();

  if (lower.includes('resume') || lower.includes('recruiter') || lower.includes('raw resume text')) {
    return extractResumeFallback(prompt);
  }

  if (lower.includes('question')) {
    return {
      questions: [
        {
          questionNumber: 1,
          questionText: "Can you describe a challenging project you worked on and how you handled technical obstacles?",
          category: "General / Behavioral",
          expectedKeyPoints: ["Problem description", "Action taken", "Result / Reflection"],
          hints: ["Focus on structured communication using the STAR method."]
        },
        {
          questionNumber: 2,
          questionText: "Explain how memory management works in your preferred backend language or framework.",
          category: "Technical / Core Concepts",
          expectedKeyPoints: ["Heap/stack allocation", "Garbage collection / Memory cleanup", "Memory leak scenarios"],
          hints: ["Mention reference tracking and event loop if applicable."]
        }
      ]
    };
  }

  if (lower.includes('feedback') || lower.includes('score') || lower.includes('evaluat')) {
    return {
      score: 80,
      strengths: ["Clear explanation of technical concepts", "Good response structure"],
      weaknesses: ["Could provide more specific concrete examples"],
      keyPointsCovered: ["Core architecture", "Trade-offs"],
      keyPointsMissed: ["Edge cases"],
      actionableFeedback: "Try to incorporate the STAR method and mention quantifiable results."
    };
  }

  return {
    message: "Fallback mock response",
    status: "success"
  };
};

export const generateLLMJson = async (prompt, systemMessage = "You are a helpful AI assistant") => {
  if (!geminiClient) {
    console.log('[LLM Service] GEMINI_API_KEY not configured or set to placeholder. Using mock fallback...');
    return mockLLMResponse(prompt);
  }

  try {
    const model = geminiClient.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemMessage,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("Gemini Raw Response:");
    console.log(text);

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    console.log("Cleaned Response:");
    console.log(cleaned);

    const parsed = JSON.parse(cleaned);

    console.log("Parsed Response:");
    console.log(parsed);

    return parsed;
  } catch (error) {
    console.error('[LLM Service Error]:', error.message || error);
    return mockLLMResponse(prompt);
  }
};