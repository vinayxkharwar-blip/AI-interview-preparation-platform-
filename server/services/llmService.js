import { openaiClient, isOpenAIConfigured } from '../config/openai.js';
import { genAIClient, isGeminiConfigured } from '../config/gemini.js';

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

  const dynamicAtsScore = (() => {
    let score = 55;
    score += Math.min(25, fallbackSkills.length * 3);
    const lowerText = rawText.toLowerCase();
    if (lowerText.includes('experience') || lowerText.includes('work history') || lowerText.includes('employment')) score += 5;
    if (lowerText.includes('education') || lowerText.includes('university') || lowerText.includes('degree') || lowerText.includes('bachelor')) score += 5;
    if (lowerText.includes('project')) score += 5;
    score += Math.min(6, projects.length * 2);
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    if (wordCount > 300) score += 2;
    if (wordCount > 600) score += 2;
    return Math.min(98, Math.max(55, score));
  })();

  return {
    atsScore: dynamicAtsScore,
    targetRole,
    skills: fallbackSkills,
    experience: [
      {
        title: 'Software Developer / Intern',
        company: 'Aptech / Tech Corp',
        duration: 'Jan 2025 – Present',
        highlights: ['Developed fullstack web applications and microservices', 'Managed database optimization and system security']
      }
    ],
    education: [
      {
        degree: 'Bachelor of Technology in Computer Science & Engineering',
        institution: 'University',
        year: '2025'
      }
    ],
    projects,
    certifications: ['AWS Cloud Practitioner', 'Full Stack Software Engineering'],
    strengths: [
      'Strong technical skill density across modern web frameworks.',
      'Solid project implementation and database architecture experience.',
      'High ATS formatting compatibility and clear structure.'
    ],
    weaknesses: [
      'Quantify impact metrics in project highlights (e.g. improved speed by 35%).',
      'Add cloud orchestration keywords (Docker, Kubernetes) for senior roles.'
    ],
    summary
  };
};

const mockLLMResponse = (prompt) => {
  const lower = prompt.toLowerCase();

  if (lower.includes('generate') || lower.includes('interview questions') || lower.includes('questionnumber')) {
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
        },
        {
          questionNumber: 3,
          questionText: "How do you approach application performance, error handling, and system reliability?",
          category: "Architecture & Quality",
          expectedKeyPoints: ["Monitoring & Logging", "Resilience patterns", "Testing strategy"],
          hints: ["Discuss real-world production practices."]
        },
        {
          questionNumber: 4,
          questionText: "Explain how asynchronous operations, event loops, and state management work in your primary tech stack.",
          category: "Core Concepts",
          expectedKeyPoints: ["Event loop / Call stack", "Asynchronous flow", "State synchronization"],
          hints: ["Explain execution order clearly."]
        },
        {
          questionNumber: 5,
          questionText: "How do you prioritize technical debt vs feature delivery in a fast-paced environment?",
          category: "Behavioral & Leadership",
          expectedKeyPoints: ["Pragmatic trade-offs", "Team communication", "Iterative refactoring"],
          hints: ["Balance long-term quality with short-term delivery."]
        }
      ]
    };
  }

  if (lower.includes('resume') || lower.includes('recruiter') || lower.includes('raw resume text')) {
    return extractResumeFallback(prompt);
  }

  if (lower.includes('feedback') || lower.includes('score') || lower.includes('evaluat') || lower.includes("candidate's answer")) {
    const answerMatch = prompt.match(/Candidate's Answer:\s*"([\s\S]*?)"/i);
    const candidateAnswer = answerMatch ? answerMatch[1].trim() : '';
    const cleanAns = candidateAnswer.toLowerCase();
    const wordCount = candidateAnswer.split(/\s+/).filter(Boolean).length;

    let score = 7;
    let strengths = [];
    let weaknesses = [];
    let suggestion = '';

    if (!candidateAnswer || wordCount < 5 || cleanAns.includes('idk') || cleanAns.includes("don't know") || cleanAns.includes('no idea') || cleanAns.includes('bad') || cleanAns.includes('wrong')) {
      score = 2;
      strengths = ["Submitted a brief initial response"];
      weaknesses = [
        "Response is incomplete and lacks relevant technical concepts",
        "Did not address the expected key points or core problem",
        "Demonstrates significant gaps in domain knowledge"
      ];
      suggestion = "Review the foundational core concepts for this question and structure your answer with concrete technical steps.";
    } else if (wordCount < 18) {
      score = 4;
      strengths = ["Identified the basic problem topic"];
      weaknesses = [
        "Response is overly concise and missing execution details",
        "Lacks architectural context and concrete trade-off analysis"
      ];
      suggestion = "Expand your response to include step-by-step mechanisms, edge cases, and real-world examples.";
    } else if (cleanAns.includes('macrotask') || cleanAns.includes('event loop') || cleanAns.includes('microtask') || cleanAns.includes('promise') || cleanAns.includes('stack') || cleanAns.includes('queue') || cleanAns.includes('heap') || wordCount >= 30) {
      score = 9;
      strengths = [
        "Accurately articulated key technical mechanisms and execution order",
        "Demonstrated strong domain vocabulary and architectural depth",
        "Provided a clear, well-structured explanation covering key expected points"
      ];
      weaknesses = ["Could briefly touch upon performance implications under extreme concurrency"];
      suggestion = "Elaborate slightly on how worker threads or async I/O polling phases operate under high-concurrency loads.";
    } else {
      score = 7;
      strengths = [
        "Clear and understandable technical explanation",
        "Covers basic requirements of the question"
      ];
      weaknesses = ["Could include more specific code-level examples or performance metrics"];
      suggestion = "Incorporate quantifiable benchmarks and explicit trade-off comparisons in your response.";
    }

    return {
      score,
      strengths,
      weaknesses,
      suggestion,
      category: lower.includes('technical') ? 'Technical Core' : 'General',
    };
  }

  return {
    message: "Fallback mock response",
    status: "success"
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callGeminiWithRetry = async (modelName, fullPrompt, maxRetries = 3) => {
  const model = genAIClient.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: "application/json" }
  });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Gemini API] Attempt ${attempt}/${maxRetries} calling model "${modelName}"...`);
      const result = await model.generateContent(fullPrompt);
      return result;
    } catch (err) {
      const status = err.status || err.statusCode || (err.message && err.message.includes('429') ? 429 : err.message && err.message.includes('404') ? 404 : 500);
      const safeErrMsg = (err.message || '').replace(/key=[^&\s]+/gi, 'key=***REDACTED***');
      
      const isRateLimit = status === 429 || /429|quota|rate limit|RESOURCE_EXHAUSTED/i.test(safeErrMsg);
      const isNotFound = status === 404 || /404|not found/i.test(safeErrMsg);

      console.error(`[Gemini API Error] Model "${modelName}" Attempt ${attempt} failed [Status Code: ${status}]: ${safeErrMsg}`);

      if (isNotFound) {
        throw err;
      }

      if (isRateLimit && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`[Gemini API 429 Throttled] Rate limit encountered. Retrying model "${modelName}" in ${backoffMs}ms...`);
        await sleep(backoffMs);
        continue;
      }

      throw err;
    }
  }
};

const extractNumericScore = (obj) => {
  if (!obj || typeof obj !== 'object') return null;
  const candidates = [obj.atsScore, obj.ats_score, obj.ATSScore, obj.score, obj.atsScore?.score, obj.atsScore?.value];
  for (const cand of candidates) {
    if (typeof cand === 'number' && !isNaN(cand)) return cand;
    if (typeof cand === 'string') {
      const parsed = parseInt(cand, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
    }
  }
  return null;
};

/**
 * Calls Gemini or OpenAI GPT and returns parsed JSON.
 * Every returned object includes a `_meta` field so callers (and the UI) can tell
 * whether the response came from a real model call or the offline mock fallback,
 * and why, if it fell back.
 */
export const generateLLMJson = async (prompt, systemMessage = "You are a helpful AI assistant") => {
  // Log prompt being sent before API call
  console.log('----------------------------------------------------');
  console.log('[LLM Prompt Sent]:');
  console.log(prompt.substring(0, 1000) + (prompt.length > 1000 ? '\n...[truncated prompt log]' : ''));
  console.log('----------------------------------------------------');

  // 1. TRY GEMINI API IF CONFIGURED
  if (isGeminiConfigured && genAIClient) {
    const geminiModels = [
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite'
    ];

    for (const modelName of geminiModels) {
      try {
        const fullPrompt = `${systemMessage}\n\nIMPORTANT: Respond strictly with a valid JSON object matching the requested schema.\n\n${prompt}`;
        const result = await callGeminiWithRetry(modelName, fullPrompt, 3);
        const rawText = result.response.text() || '{}';

        console.log(`[Gemini API Success] Raw Response from "${modelName}":`);
        console.log(rawText);
        console.log('----------------------------------------------------');

        const cleanedText = rawText
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();

        const parsed = JSON.parse(cleanedText);

        const extractedScore = extractNumericScore(parsed);
        if (extractedScore !== null) {
          parsed.atsScore = Math.min(100, Math.max(0, extractedScore));
        } else if (prompt.toLowerCase().includes('resume')) {
          console.warn('[Gemini API Warning] Response missing numeric atsScore. Computing dynamic score.');
          const fallbackObj = extractResumeFallback(prompt);
          parsed.atsScore = fallbackObj.atsScore;
        }

        return {
          ...parsed,
          _meta: { source: 'gemini', model: modelName }
        };
      } catch (geminiErr) {
        const status = geminiErr.status || geminiErr.statusCode || 'UNKNOWN';
        const safeErrMsg = (geminiErr.message || '').replace(/key=[^&\s]+/gi, 'key=***REDACTED***');
        console.error(`[Gemini API Final Failure] Skipping model "${modelName}" [Status Code: ${status}]: ${safeErrMsg}`);
      }
    }
  }

  // 2. TRY OPENAI API IF CONFIGURED
  if (isOpenAIConfigured && openaiClient) {
    const client = openaiClient;
    const candidateModels = [
      { name: 'gpt-4o-mini' },
      { name: 'gpt-4o' },
      { name: 'gpt-3.5-turbo' },
    ];

    let lastError = null;
    let lastErrorWasRateLimit = false;

    for (const config of candidateModels) {
      try {
        console.log(`[LLM Service] Sending request to OpenAI model "${config.name}"...`);
        const response = await client.chat.completions.create({
          model: config.name,
          messages: [
            { role: 'system', content: `${systemMessage} Respond strictly with a valid JSON object.` },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' }
        });

        const rawText = response.choices[0]?.message?.content || '{}';
        console.log(`[LLM Service] Raw OpenAI Response from "${config.name}":`);
        console.log(rawText);
        console.log('----------------------------------------------------');

        const cleanedText = rawText
          .replace(/```json/gi, '')
          .replace(/```/g, '')
          .trim();

        const parsed = JSON.parse(cleanedText);

        const extractedScore = extractNumericScore(parsed);
        if (extractedScore !== null) {
          parsed.atsScore = Math.min(100, Math.max(0, extractedScore));
        } else if (prompt.toLowerCase().includes('resume')) {
          const fallbackObj = extractResumeFallback(prompt);
          parsed.atsScore = fallbackObj.atsScore;
        }

        return {
          ...parsed,
          _meta: { source: 'openai', model: config.name }
        };
      } catch (modelErr) {
        lastError = modelErr;
        const rawErrMsg = modelErr.message || '';
        const safeErrMsg = rawErrMsg.replace(/key=[^&\s]+/gi, 'key=***REDACTED***');
        lastErrorWasRateLimit = /429|quota|rate limit/i.test(rawErrMsg);
        console.error(`[LLM Service Error] Call to OpenAI model "${config.name}" failed: ${safeErrMsg}`);
      }
    }
  }

  // 3. DYNAMIC MOCK FALLBACK
  console.error('[LLM Service Notice] No active LLM API succeeded (Gemini / OpenAI). Triggering dynamic mock fallback.');
  const mock = mockLLMResponse(prompt);
  return {
    ...mock,
    _meta: {
      source: 'mock',
      reason: 'api_fallback'
    }
  };
};