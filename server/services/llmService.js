import { openaiClient, isOpenAIConfigured } from '../config/openai.js';

const extractResumeFallback = (rawText = '') => {
  // Extract actual resume content if wrapped inside LLM prompt
  let resumeContent = rawText;
  const rawMatch = rawText.match(/Resume Raw Text:\s*"""([\s\S]*?)"""/i);
  if (rawMatch && rawMatch[1]) {
    resumeContent = rawMatch[1].trim();
  }

  const commonSkills = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Express', 'Express.js',
    'HTML', 'CSS', 'SQL', 'MySQL', 'MongoDB', 'PostgreSQL', 'Git', 'GitHub',
    'Docker', 'Linux', 'Vercel', 'Render', 'REST API', 'AWS', 'Java', 'C++', 'Tailwind',
    'Kubernetes', 'Selenium', 'Cypress', 'Tableau', 'Power BI', 'TensorFlow', 'PyTorch'
  ];

  const foundSkills = commonSkills.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|\\W)${escaped}(?:$|\\W)`, 'i').test(resumeContent);
  });

  const fallbackSkills = foundSkills.length > 0
    ? foundSkills
    : ['JavaScript', 'React', 'Node.js', 'SQL', 'Git'];

  // Accurately deduce role strictly from resume content (or null if undetectable)
  let targetRole = null;
  const lowerContent = resumeContent.toLowerCase();

  if (/(?:cybersecurity|cyber\s*security|soc\s*analyst|information\s*security|penetration\s*test|incident\s*response|siem)/i.test(lowerContent)) {
    targetRole = 'Cybersecurity Analyst';
  } else if (/(?:qa\s*engineer|quality\s*assurance|software\s*tester|automation\s*test|sdet|manual\s*tester|test\s*engineer)/i.test(lowerContent)) {
    targetRole = 'QA Engineer';
  } else if (/(?:data\s*analyst|data\s*analytics|data\s*scientist|business\s*intelligence|tableau|power\s*bi|pandas)/i.test(lowerContent)) {
    targetRole = 'Data Analyst';
  } else if (/(?:machine\s*learning|ai\s*engineer|ml\s*engineer|deep\s*learning|nlp|tensorflow|pytorch)/i.test(lowerContent)) {
    targetRole = 'AI / Machine Learning Engineer';
  } else if (/(?:devops|cloud\s*engineer|kubernetes|terraform|ci\/cd|site\s*reliability|sre|infrastructure\s*engineer)/i.test(lowerContent)) {
    targetRole = 'DevOps & Cloud Engineer';
  } else if (/(?:frontend|front-end|ui\s*developer|react\s*developer|vue\s*developer|angular\s*developer)/i.test(lowerContent)) {
    targetRole = 'Frontend Engineer';
  } else if (/(?:backend|back-end|node\.?js\s*developer|django|spring\s*boot|flask|microservices)/i.test(lowerContent)) {
    targetRole = 'Backend Engineer';
  } else if (/(?:full\s*stack|full-stack|mern|mean\s*stack)/i.test(lowerContent)) {
    targetRole = 'Full Stack Engineer';
  } else if (/(?:sap\s*consultant|sap\s*developer|abap|sap\s*hana)/i.test(lowerContent)) {
    targetRole = 'SAP Consultant';
  } else if (/(?:technical\s*support|it\s*support|desktop\s*support|service\s*desk)/i.test(lowerContent)) {
    targetRole = 'Technical Support Engineer';
  } else if (/(?:software\s*engineer|software\s*developer|application\s*developer)/i.test(lowerContent)) {
    targetRole = 'Software Engineer';
  }

  const projects = [];
  if (resumeContent.includes('TrainIQ')) {
    projects.push({ name: 'TrainIQ', description: 'Fitness & Nutrition Platform', techStack: ['React', 'TypeScript', 'Node.js', 'Express.js', 'MySQL'] });
  }
  if (resumeContent.includes('DeckForge')) {
    projects.push({ name: 'DeckForge', description: 'AI Presentation Generator', techStack: ['Python', 'NLP', 'REST API'] });
  }
  if (resumeContent.includes('CodeSentinel')) {
    projects.push({ name: 'CodeSentinel', description: 'Security Auditing Tool', techStack: ['Python', 'Docker', 'Linux'] });
  }

  if (projects.length === 0) {
    projects.push({ name: 'Technical Project', description: 'Application portfolio project', techStack: fallbackSkills.slice(0, 4) });
  }

  const summaryMatch = resumeContent.match(/Professional Summary\s*([\s\S]*?)(?=Core Skills|Experience|Projects|Education|$)/i);
  const summary = summaryMatch && summaryMatch[1]?.trim()
    ? summaryMatch[1].trim().replace(/\s+/g, ' ').substring(0, 300)
    : (targetRole ? `${targetRole} with dedicated experience and practical project implementation.` : 'Technical professional with verified project and engineering experience.');

  const dynamicAtsScore = (() => {
    let score = 55;
    score += Math.min(25, fallbackSkills.length * 3);
    const lowerText = resumeContent.toLowerCase();
    if (lowerText.includes('experience') || lowerText.includes('work history') || lowerText.includes('employment')) score += 5;
    if (lowerText.includes('education') || lowerText.includes('university') || lowerText.includes('degree') || lowerText.includes('bachelor')) score += 5;
    if (lowerText.includes('project')) score += 5;
    score += Math.min(6, projects.length * 2);
    const wordCount = resumeContent.split(/\s+/).filter(Boolean).length;
    if (wordCount > 300) score += 2;
    if (wordCount > 600) score += 2;
    return Math.min(98, Math.max(55, score));
  })();

  return {
    atsScore: dynamicAtsScore,
    targetRole, // null if not detected from content
    skills: fallbackSkills,
    experience: [
      {
        title: targetRole || 'Software Professional',
        company: 'Technology Solutions',
        duration: '2024 – Present',
        highlights: ['Developed core domain features and maintained system reliability', 'Optimized architecture and performance standards']
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
    certifications: ['Technical Engineering Assessment Verified'],
    strengths: [
      'Identified domain keywords matching modern technical requirements.',
      'Demonstrated concrete project implementation experience.',
      'Clear document structure suitable for ATS evaluation.'
    ],
    weaknesses: [
      'Incorporate quantifiable impact metrics across bullet points.',
      'Ensure standard section headers are clearly demarcated.'
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

const callOpenAIWithRetry = async (modelName, prompt, systemMessage, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[OpenAI API] Attempt ${attempt}/${maxRetries} calling model "${modelName}"...`);
      const response = await openaiClient.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content: `${systemMessage}\n\nIMPORTANT: Respond strictly with a valid JSON object matching the requested schema. Do not include markdown code block syntax if possible, just raw JSON.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || '{}';
    } catch (err) {
      const status = err.status || err.statusCode || (err.message && err.message.includes('429') ? 429 : 500);
      const safeErrMsg = (err.message || '').replace(/sk-[a-zA-Z0-9_\-]+/gi, 'sk-***REDACTED***');
      const isRateLimit = status === 429 || /429|quota|rate limit/i.test(safeErrMsg);

      console.error(`[OpenAI API Error] Model "${modelName}" Attempt ${attempt} failed [Status Code: ${status}]: ${safeErrMsg}`);

      if (isRateLimit && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.warn(`[OpenAI API 429 Throttled] Rate limit encountered. Retrying model "${modelName}" in ${backoffMs}ms...`);
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
 * Calls OpenAI LLM and returns parsed JSON.
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

  // 1. TRY OPENAI API IF CONFIGURED
  if (isOpenAIConfigured && openaiClient) {
    const openaiModels = [
      'gpt-4o-mini',
      'gpt-4o',
      'gpt-3.5-turbo'
    ];

    for (const modelName of openaiModels) {
      try {
        const rawText = await callOpenAIWithRetry(modelName, prompt, systemMessage, 3);

        console.log(`[OpenAI API Success] Raw Response from "${modelName}":`);
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
          console.warn('[OpenAI API Warning] Response missing numeric atsScore. Computing dynamic score.');
          const fallbackObj = extractResumeFallback(prompt);
          parsed.atsScore = fallbackObj.atsScore;
        }

        if (
          !parsed.targetRole ||
          typeof parsed.targetRole !== 'string' ||
          !parsed.targetRole.trim() ||
          ['null', 'none', 'n/a', 'undefined', 'not detected', 'unknown'].includes(parsed.targetRole.trim().toLowerCase())
        ) {
          parsed.targetRole = null;
        } else {
          parsed.targetRole = parsed.targetRole.trim();
        }

        return {
          ...parsed,
          _meta: { source: 'openai', model: modelName }
        };
      } catch (openAiErr) {
        const status = openAiErr.status || openAiErr.statusCode || 'UNKNOWN';
        const safeErrMsg = (openAiErr.message || '').replace(/sk-[a-zA-Z0-9_\-]+/gi, 'sk-***REDACTED***');
        console.error(`[OpenAI API Final Failure] Skipping model "${modelName}" [Status Code: ${status}]: ${safeErrMsg}`);
      }
    }
  }

  // 2. DYNAMIC MOCK FALLBACK
  console.error('[LLM Service Notice] OpenAI API was unavailable or exhausted. Triggering dynamic mock fallback.');
  const mock = mockLLMResponse(prompt);
  return {
    ...mock,
    _meta: {
      source: 'mock',
      reason: 'api_fallback'
    }
  };
};