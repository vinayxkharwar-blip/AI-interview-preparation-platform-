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
    company: 'Google DeepMind',
    logo: 'https://images.unsplash.com/photo-1572021335469-31706a17aaef?auto=format&fit=crop&w=120&q=80',
    title: 'AI Product Systems Engineer',
    location: 'San Francisco, CA / Hybrid',
    salary: '$170,000 - $230,000',
    jobType: 'Full-time',
    experience: 'Senior Level',
    description: 'Build production AI web applications leveraging OpenAI LLMs, Python, Vector DBs, and real-time WebRTC audio/video avatar streams.',
    skills: ['Python', 'Node.js', 'React', 'OpenAI API', 'Vector DB', 'LangChain', 'Docker', 'Kubernetes', 'WebRTC'],
    applyUrl: 'https://deepmind.google/careers',
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
  {
    id: 'job-107',
    company: 'CrowdStrike',
    logo: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=120&q=80',
    title: 'Cybersecurity Analyst / SOC Analyst',
    location: 'Remote (US/India)',
    salary: '$110,000 - $150,000',
    jobType: 'Full-time',
    experience: 'Associate - Mid Level (2+ yrs)',
    description: 'Monitor enterprise security events, perform incident response, triage SIEM alerts, and conduct threat hunting across zero-trust networks.',
    skills: ['SIEM', 'Splunk', 'Network Security', 'Incident Response', 'Wireshark', 'Linux', 'Python', 'Threat Intelligence'],
    applyUrl: 'https://www.crowdstrike.com/careers',
    source: 'Internal',
  },
  {
    id: 'job-108',
    company: 'Atlassian',
    logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=120&q=80',
    title: 'QA Engineer / Software Tester (Automation)',
    location: 'Remote',
    salary: '$105,000 - $145,000',
    jobType: 'Full-time',
    experience: 'Mid Level (2-4 yrs)',
    description: 'Design end-to-end automated testing suites, perform regression drills, manage Playwright/Selenium test harnesses, and integrate automated quality gates into CI/CD.',
    skills: ['Selenium', 'Playwright', 'Cypress', 'JavaScript', 'Python', 'API Testing', 'Postman', 'Jira'],
    applyUrl: 'https://www.atlassian.com/company/careers',
    source: 'Internal',
  },
  {
    id: 'job-109',
    company: 'Snowflake',
    logo: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=120&q=80',
    title: 'Data Analyst & Business Intelligence Specialist',
    location: 'Remote / San Jose, CA',
    salary: '$115,000 - $155,000',
    jobType: 'Full-time',
    experience: 'Mid Level (2+ yrs)',
    description: 'Transform complex enterprise data into executive dashboards, execute SQL analytics models, and collaborate with product teams on growth metrics.',
    skills: ['SQL', 'Python', 'Tableau', 'Power BI', 'Data Modeling', 'Snowflake', 'Excel', 'Statistics'],
    applyUrl: 'https://careers.snowflake.com',
    source: 'Internal',
  },
  {
    id: 'job-110',
    company: 'Accenture Technology',
    logo: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=120&q=80',
    title: 'SAP Consultant / Technical Support Engineer',
    location: 'Bengaluru / Hyderabad / Remote',
    salary: '$95,000 - $135,000',
    jobType: 'Full-time',
    experience: 'Mid Level (3+ yrs)',
    description: 'Configure and support enterprise SAP S/4HANA workflows, diagnose technical incidents, provide client integration support, and maintain high service SLAs.',
    skills: ['SAP S/4HANA', 'ABAP', 'SQL', 'ITIL', 'Troubleshooting', 'ERP Systems', 'Customer Support', 'Jira Service Management'],
    applyUrl: 'https://www.accenture.com/careers',
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
      matchPercentage: 0,
      matchedSkills: [],
      missingSkills: [],
      skillRecommendations: [],
    };
  }

  if (!Array.isArray(userSkills) || userSkills.length === 0) {
    return {
      matchPercentage: 0,
      matchedSkills: [],
      missingSkills: [...jobSkills],
      skillRecommendations: jobSkills.slice(0, 3).map((skill) => ({
        skill,
        recommendation: `Gain hands-on proficiency in ${skill} to increase ATS interview eligibility by +15%.`,
        resources: `Recommended Practice: Complete a 2-hour mini project incorporating ${skill}.`,
      })),
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
  const matchPercentage = matchedSkills.length === 0 ? 0 : Math.min(98, Math.max(15, Math.round(rawScore)));

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
  let filteredJobs = [...MOCK_JOBS];

  if (targetRole && targetRole.trim()) {
    const roleLower = targetRole.toLowerCase().trim();
    const keywords = roleLower.split(/[\s/&-]+/).filter((w) => w.length > 1);

    const roleMatches = filteredJobs.filter((j) => {
      const titleLower = j.title.toLowerCase();
      const descLower = j.description.toLowerCase();
      return (
        titleLower.includes(roleLower) ||
        descLower.includes(roleLower) ||
        keywords.some((kw) => titleLower.includes(kw))
      );
    });

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
