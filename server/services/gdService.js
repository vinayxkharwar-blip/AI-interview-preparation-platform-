import { generateLLMJson } from './llmService.js';

export const GD_TOPICS = [
  {
    id: 'gd_topic_ai',
    title: 'AI in Software Engineering: Augmentation vs Total Developer Displacement',
    category: 'Technology & Career',
    context:
      'With the rapid surge of Generative AI, LLMs, and automated code-generation agents, the tech landscape is debating whether software developers will be completely displaced or whether engineering roles will evolve into system orchestration and high-level architectural design.',
    starterPrompts: [
      'What core aspects of software engineering can AI never truly replace?',
      'How should fresh graduates adapt their skill sets for an AI-native engineering world?',
      'Does AI increase or decrease the risk of massive production vulnerabilities?',
    ],
  },
  {
    id: 'gd_topic_remote',
    title: 'Remote Engineering vs Return-To-Office Mandates',
    category: 'Workplace & Culture',
    context:
      'Major global tech organizations are split: some enforce 5-day in-office mandates citing spontaneous collaboration and mentorship, while others maintain remote-first operations highlighting global talent pools and worker flexibility.',
    starterPrompts: [
      'Does physical co-location significantly enhance junior engineer mentorship?',
      'How does remote work impact deep technical focus versus team alignment?',
    ],
  },
  {
    id: 'gd_topic_privacy',
    title: 'Data Privacy Regulations vs Rapid AI Innovation',
    category: 'Ethics & Governance',
    context:
      'Strict data compliance frameworks like GDPR and regional AI acts aim to safeguard citizen privacy, but startup founders argue they handicap domestic AI research against less-regulated international competitors.',
    starterPrompts: [
      'Can robust privacy protocols coexist with large-scale model training?',
      'Who bears the legal and ethical liability when autonomous AI systems err?',
    ],
  },
];

export const VIRTUAL_PARTICIPANTS = [
  {
    id: 'p1',
    name: 'Priya',
    role: 'participant',
    title: 'The Tech Optimist',
    avatarColor: 'from-amber-500 to-orange-500',
    perspective: 'Data-driven, optimistic, focuses on productivity leaps and technological acceleration.',
  },
  {
    id: 'p2',
    name: 'Rohan',
    role: 'participant',
    title: 'The Pragmatic Skeptic',
    avatarColor: 'from-blue-600 to-cyan-500',
    perspective: 'Risk-conscious, emphasizes ethical concerns, technical debt, and real-world failure modes.',
  },
  {
    id: 'p3',
    name: 'Ananya',
    role: 'participant',
    title: 'The Balanced Strategist',
    avatarColor: 'from-emerald-500 to-teal-600',
    perspective: 'Consensus builder, focuses on hybrid policies, organizational culture, and balanced trade-offs.',
  },
];

/**
 * Initializes a new GD session with moderator opening speech.
 */
export const initializeGDRound = (topicIndex = 0) => {
  const topic = GD_TOPICS[topicIndex % GD_TOPICS.length];

  const openingMessages = [
    {
      speaker: 'Moderator (Mr. Sharma)',
      role: 'moderator',
      text: `Good day everyone. Welcome to Round 3: Group Discussion. Today's topic is: "${topic.title}". ${topic.context} You will be evaluated on clarity, content relevance, active listening, and constructive collaboration. Priya, would you like to start us off?`,
      timestamp: new Date(),
    },
    {
      speaker: 'Priya (Tech Optimist)',
      role: 'participant',
      text: `Thank you, Mr. Sharma. Looking at developer productivity metrics, engineers using modern AI tooling ship code up to 40% faster. Rather than eliminating software jobs, AI eliminates repetitive boilerplate and allows us to focus on solving high-impact domain problems and system architecture.`,
      timestamp: new Date(Date.now() + 1500),
    },
    {
      speaker: 'Rohan (Pragmatic Skeptic)',
      role: 'participant',
      text: `I appreciate your optimism Priya, but we cannot ignore code quality and security. When juniors rely entirely on AI code generation without understanding runtime internals or memory leaks, technical debt skyrockets. Furthermore, junior hiring numbers have already tightened in several sectors.`,
      timestamp: new Date(Date.now() + 3000),
    },
  ];

  return {
    topic: topic.title,
    discussionContext: topic.context,
    transcript: openingMessages,
  };
};

/**
 * Generates responses from AI peers reacting to the candidate's speech/text.
 */
export const generatePeerResponses = async (candidateMessage, transcript = [], topicTitle = '') => {
  const recentTranscriptText = transcript
    .slice(-6)
    .map((m) => `${m.speaker}: "${m.text}"`)
    .join('\n');

  const prompt = `
You are simulating a Group Discussion with 2 participants in a placement interview:
1. "Ananya (Balanced Strategist)"
2. "Moderator (Mr. Sharma)"

Topic: "${topicTitle}"
Recent Transcript:
${recentTranscriptText}

Candidate just said:
"${candidateMessage}"

Generate natural, concise reactions (1-2 sentences each).
- Ananya should constructively acknowledge or challenge the candidate's specific points and synthesize the discussion.
- Moderator should acknowledge the flow or invite further elaboration.

Respond STRICTLY in JSON format:
{
  "ananyaResponse": "...",
  "moderatorResponse": "..."
}
`;

  try {
    const result = await generateLLMJson(prompt, 'You are an AI simulating interactive group discussions.');
    if (result && result.ananyaResponse) {
      return [
        {
          speaker: 'Ananya (Balanced Strategist)',
          role: 'participant',
          text: result.ananyaResponse.trim(),
          timestamp: new Date(),
        },
        ...(result.moderatorResponse
          ? [
              {
                speaker: 'Moderator (Mr. Sharma)',
                role: 'moderator',
                text: result.moderatorResponse.trim(),
                timestamp: new Date(Date.now() + 1500),
              },
            ]
          : []),
      ];
    }
  } catch (err) {
    console.warn('[GD Service Notice] LLM peer generation fallback:', err.message);
  }

  // Fallback heuristic peer responses
  const cleanCandidate = (candidateMessage || '').toLowerCase();
  let ananyaText = '';
  let moderatorText = '';

  if (cleanCandidate.includes('balance') || cleanCandidate.includes('hybrid') || cleanCandidate.includes('both')) {
    ananyaText = `That is an insightful observation. Finding that middle ground—leveraging AI for velocity while establishing human review standards—is exactly what scalable engineering teams require.`;
    moderatorText = `Well said. Keeping human accountability at the core is critical. Let us see if anyone has contrasting data.`;
  } else if (cleanCandidate.includes('security') || cleanCandidate.includes('risk') || cleanCandidate.includes('debt') || cleanCandidate.includes('danger')) {
    ananyaText = `I agree with your caution on system risks and technical debt. Automated tests and static analysis must evolve alongside AI-generated code to prevent catastrophic regressions.`;
    moderatorText = `Strong point on security and governance. That aligns with industry risk management standards.`;
  } else {
    ananyaText = `I see your point, and building on what you mentioned, the key differentiator for upcoming engineers will be architectural judgment and deep cross-functional communication rather than just syntax mastery.`;
    moderatorText = `Good articulation. You contributed directly to the core problem statement.`;
  }

  return [
    {
      speaker: 'Ananya (Balanced Strategist)',
      role: 'participant',
      text: ananyaText,
      timestamp: new Date(),
    },
    {
      speaker: 'Moderator (Mr. Sharma)',
      role: 'moderator',
      text: moderatorText,
      timestamp: new Date(Date.now() + 1500),
    },
  ];
};

/**
 * Evaluates the candidate's performance across the entire GD transcript.
 */
export const evaluateGDPerformance = async (transcript = [], topicTitle = '') => {
  const candidateMessages = transcript
    .filter((m) => m.role === 'candidate' || m.speaker.toLowerCase().includes('candidate') || m.speaker.toLowerCase().includes('you'))
    .map((m) => m.text);

  const fullCandidateText = candidateMessages.join(' ');
  const wordCount = fullCandidateText.split(/\s+/).filter(Boolean).length;
  const contributionCount = candidateMessages.length;

  if (contributionCount === 0 || wordCount < 10) {
    return {
      score: 30,
      passed: false,
      rubrics: {
        clarityAndArticulation: 8,
        problemSolvingAndIdeas: 8,
        collaborationAndListening: 7,
        persuasionAndConfidence: 7,
      },
      feedback: {
        strengths: ['Attended the group discussion session.'],
        weaknesses: [
          'Minimal participation recorded during the discussion.',
          'Did not put forth structured arguments or acknowledge peers.',
        ],
        summary: 'Insufficient verbal contribution to meet the 60% evaluation benchmark. Please actively share your perspectives and engage with team points.',
      },
    };
  }

  const prompt = `
You are a senior HR and technical communication assessor evaluating a candidate in a Placement Drive Group Discussion.

Topic: "${topicTitle}"
Candidate's total contributions (${contributionCount} interventions, ${wordCount} words):
"${fullCandidateText}"

Full discussion context:
${transcript.map((m) => `${m.speaker}: ${m.text}`).join('\n')}

Evaluate the candidate on a 0-25 scale for each of the 4 rubrics:
1. clarityAndArticulation (0-25)
2. problemSolvingAndIdeas (0-25)
3. collaborationAndListening (0-25)
4. persuasionAndConfidence (0-25)

Total score is the sum (0-100).
Pass threshold is 60.

Respond strictly in JSON format:
{
  "clarityAndArticulation": 20,
  "problemSolvingAndIdeas": 19,
  "collaborationAndListening": 18,
  "persuasionAndConfidence": 19,
  "strengths": ["...", "..."],
  "weaknesses": ["..."],
  "summary": "..."
}
`;

  try {
    const result = await generateLLMJson(prompt, 'You are an expert communication and placement interviewer.');
    if (result && typeof result.clarityAndArticulation === 'number') {
      const clarity = Math.min(25, Math.max(0, result.clarityAndArticulation));
      const problemSolving = Math.min(25, Math.max(0, result.problemSolvingAndIdeas));
      const collaboration = Math.min(25, Math.max(0, result.collaborationAndListening));
      const persuasion = Math.min(25, Math.max(0, result.persuasionAndConfidence));
      const totalScore = clarity + problemSolving + collaboration + persuasion;

      return {
        score: totalScore,
        passed: totalScore >= 60,
        rubrics: {
          clarityAndArticulation: clarity,
          problemSolvingAndIdeas: problemSolving,
          collaborationAndListening: collaboration,
          persuasionAndConfidence: persuasion,
        },
        feedback: {
          strengths: Array.isArray(result.strengths) ? result.strengths : ['Articulate communication', 'Relevant ideas'],
          weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : ['Could cite more concrete industry examples'],
          summary: result.summary || 'Solid participation demonstrating clear reasoning and team collaboration.',
        },
      };
    }
  } catch (err) {
    console.warn('[GD Service Notice] LLM evaluation fallback:', err.message);
  }

  // Heuristic evaluation fallback
  let clarity = 15;
  let problemSolving = 15;
  let collaboration = 15;
  let persuasion = 15;

  if (wordCount > 60) {
    clarity += 5;
    problemSolving += 4;
  }
  if (contributionCount >= 2) {
    collaboration += 5;
    persuasion += 4;
  }
  if (fullCandidateText.toLowerCase().includes('agree') || fullCandidateText.toLowerCase().includes('point') || fullCandidateText.toLowerCase().includes('however')) {
    collaboration += 3;
    persuasion += 3;
  }

  clarity = Math.min(25, clarity);
  problemSolving = Math.min(25, problemSolving);
  collaboration = Math.min(25, collaboration);
  persuasion = Math.min(25, persuasion);

  const totalScore = clarity + problemSolving + collaboration + persuasion;

  return {
    score: totalScore,
    passed: totalScore >= 60,
    rubrics: {
      clarityAndArticulation: clarity,
      problemSolvingAndIdeas: problemSolving,
      collaborationAndListening: collaboration,
      persuasionAndConfidence: persuasion,
    },
    feedback: {
      strengths: [
        'Articulated points clearly with appropriate technical vocabulary.',
        'Acknowledged peer viewpoints and framed constructive responses.',
      ],
      weaknesses: [
        'Could include more quantitative case studies and real-world engineering metrics.',
      ],
      summary: totalScore >= 60
        ? 'Well-rounded group discussion performance. Cleared the communication benchmark.'
        : 'Needs greater assertiveness and structured argument delivery to pass the benchmark.',
    },
  };
};
