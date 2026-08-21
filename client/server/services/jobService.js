/**
 * Job Matching Engine & Extensible Job Provider Service
 */

// Sample Rich Jobs Dataset for Mock Provider
const MOCK_JOBS = [
  {
    id: 'job-101',
    company: 'Vercel',
    logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80',
    title: 'Senior Frontend Engineer - Next.js',
    location: 'Remote (US/EU)',
    salary: '$140,000 - $185,000',
    jobType: 'Full-time',
    experience: 'Senior Level (4+ yrs)',
    description: 'We are seeking a Senior Frontend Engineer to build high-performance React & Next.js web applications, optimize Web Vitals, and lead design system architectures.',
    skills: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'GraphQL', 'Performance Optimization', 'Jest'],
    applyUrl: 'https://vercel.com/careers',
    source: 'Internal',
  },
  {
    id: 'job-102',
    company: 'Stripe',
    logo: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=120&q=80',
    title: 'Full Stack Engineer - Financial Platform',
    location: 'San Francisco, CA / Remote',
    salary: '$150,000 - $195,000',
    jobType: 'Full-time',
    experience: 'Mid-Senior Level (3+ yrs)',
    description: 'Join Stripe to build robust payment API integrations, Node.js backend microservices, and modern React financial dashboards processing millions in transactions.',
    skills: ['Node.js', 'React', 'TypeScript', 'MongoDB', 'PostgreSQL', 'Redis', 'Docker', 'AWS'],
    applyUrl: 'https://stripe.com/jobs',
    source: 'Internal',
  },
  {
    id: 'job-103',
    company: 'OpenAI',
    logo: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=120&q=80',
    title: 'AI Product Systems Engineer',
    location: 'San Francisco, CA / Hybrid',
    salary: '$170,000 - $230,000',
    jobType: 'Full-time',
    experience: 'Senior Level',
    description: 'Build production AI web applications leveraging LLMs, LangChain, Python, Vector DBs, and real-time WebRTC audio/video avatar streams.',
    skills: ['Python', 'Node.js', 'React', 'LLMs', 'Vector DB', 'LangChain', 'Docker', 'Kubernetes', 'WebRTC'],
    applyUrl: 'https://openai.com/careers',
    source: 'Internal',
  },
  {
    id: 'job-104',
    company: 'Datadog',
    logo: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=120&q=80',
    title: 'Backend Systems Engineer - Cloud Infrastructure',
    location: 'New York, NY / Remote',
    salary: '$135,000 - $175,000',
    jobType: 'Full-time',
    experience: 'Mid Level (2-4 yrs)',
    description: 'Develop distributed real-time data pipelines, high-throughput REST APIs, and microservices in Go, Node.js, and Redis.',
    skills: ['Node.js', 'Go', 'MongoDB', 'Redis', 'Docker', 'AWS', 'System Architecture', 'Kafka'],
    applyUrl: 'https://datadog.com/careers',
    source: 'Internal',
  },
  {
    id: 'job-105',
    company: 'Figma',
    logo: 'https://images.unsplash.com/photo-1600132806370-bf17e65e942f?auto=format&fit=crop&w=120&q=80',
    title: 'UI Software Engineer - Canvas & Collaboration',
    location: 'Remote',
    salary: '$145,000 - $190,000',
    jobType: 'Full-time',
    experience: 'Mid-Senior Level',
    description: 'Help craft the world\'s premiere collaborative design interface using WebGL, WebAssembly, React, TypeScript, and state synchronization engines.',
    skills: ['React', 'TypeScript', 'WebSockets', 'Canvas API', 'State Management', 'Jest', 'Tailwind CSS'],
    applyUrl: 'https://figma.com/careers',
    source: 'Internal',
  },
  {
    id: 'job-106',
    company: 'GitHub',
    logo: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&w=120&q=80',
    title: 'DevOps & Cloud Automation Engineer',
    location: 'Remote (Worldwide)',
    salary: '$130,000 - $170,000',
    jobType: 'Full-time',
    experience: 'Mid Level',
    description: 'Automate CI/CD pipelines, manage Kubernetes clusters, enforce zero-trust security policies, and maintain cloud infrastructure resilience.',
    skills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'GitHub Actions', 'Terraform', 'Linux', 'Python'],
    applyUrl: 'https://github.com/careers',
    source: 'Internal',
  },
];

/**
 * Job Matching Engine:
 * Compares candidate resume skills against job requirements to produce match %,
 * matched skills list, missing skills list, and skill improvement suggestions.
 */
export const calculateJobMatch = (userSkills = [], jobSkills = []) => {
  if (!Array.isArray(jobSkills) || jobSkills.length === 0) {
    return {
      matchPercentage: 85,
      matchedSkills: userSkills,
      missingSkills: [],
      skillRecommendations: [],
    };
  }

  const normalizedUserSkills = userSkills.map((s) => s.toLowerCase().trim());
  const matchedSkills = [];
  const missingSkills = [];

  jobSkills.forEach((jobSkill) => {
    const norm = jobSkill.toLowerCase().trim();
    const isMatched = normalizedUserSkills.some(
      (uSkill) => uSkill === norm || uSkill.includes(norm) || norm.includes(uSkill)
    );
    if (isMatched) {
      matchedSkills.push(jobSkill);
    } else {
      missingSkills.push(jobSkill);
    }
  });

  const rawScore = (matchedSkills.length / jobSkills.length) * 100;
  // Baseline match score between 55% and 98%
  const matchPercentage = Math.min(98, Math.max(55, Math.round(rawScore)));

  const skillRecommendations = missingSkills.map((skill) => ({
    skill,
    recommendation: `Gain hands-on proficiency in ${skill} to increase ATS interview eligibility by +15%.`,
    resources: `Recommended Practice: Complete a 2-hour mini project incorporating ${skill}.`,
  }));

  return {
    matchPercentage,
    matchedSkills,
    missingSkills,
    skillRecommendations,
  };
};

/**
 * Extensible Job Provider Service:
 * Currently serves enriched mock recommendations and is designed so real APIs
 * (Adzuna, JSearch, Remotive, Arbeitnow) can be plugged in directly without UI changes.
 */
export const fetchJobRecommendations = async ({ targetRole = '', skills = [], experience = '', location = '' }) => {
  console.log('[jobService] Fetching job recommendations for role:', targetRole || 'Software Engineer');

  let filteredJobs = [...MOCK_JOBS];

  if (targetRole && targetRole.trim()) {
    const roleLower = targetRole.toLowerCase().trim();
    const roleMatches = filteredJobs.filter(
      (j) => j.title.toLowerCase().includes(roleLower) || j.description.toLowerCase().includes(roleLower)
    );
    if (roleMatches.length > 0) {
      filteredJobs = roleMatches;
    }
  }

  // Calculate Match % and Skill breakdown for each job
  const enrichedJobs = filteredJobs.map((job) => {
    const matchAnalysis = calculateJobMatch(skills, job.skills);
    return {
      ...job,
      matchPercentage: matchAnalysis.matchPercentage,
      matchedSkills: matchAnalysis.matchedSkills,
      missingSkills: matchAnalysis.missingSkills,
      skillRecommendations: matchAnalysis.skillRecommendations,
    };
  });

  // Sort by match percentage descending
  enrichedJobs.sort((a, b) => b.matchPercentage - a.matchPercentage);

  return enrichedJobs;
};
