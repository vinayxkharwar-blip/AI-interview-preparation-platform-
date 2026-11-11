import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { generateLLMJson } from '../services/llmService.js';
import { buildResumeParsePrompt } from '../prompts/resumePrompts.js';

const resumeJunior = `
John Doe
Email: john@example.com | Phone: 123-456-7890
Summary: Recent graduate seeking entry level software job.
Skills: HTML, CSS, basic JavaScript.
Education: Bachelor of Science in Information Technology, 2024.
Experience:
Intern at WebStudio (3 months): Helped team update web pages.
`;

const resumeSenior = `
Alex Mercer
Email: alex.mercer@eng.io | GitHub: github.com/alexmercer | LinkedIn: linkedin.com/in/alexmercer
Full Stack Software Engineer | Distributed Systems & Cloud Architecture

Professional Summary:
Full Stack Engineer with 5+ years of production experience designing resilient microservices, high-throughput REST/GraphQL APIs, and responsive web platforms. Proven track record of optimizing database query paths, scaling distributed architectures to 250,000+ daily active users, and improving system uptime to 99.99%.

Core Technical Skills:
- Languages: JavaScript (ES6+), TypeScript, Python, SQL, Go
- Frontend: React.js, Next.js, Redux Toolkit, Tailwind CSS, Webpack, Vite
- Backend: Node.js, Express.js, Fastify, Microservices, REST APIs, GraphQL, gRPC
- Databases & Caching: PostgreSQL, MongoDB, Redis, Elasticsearch
- DevOps & Cloud: Docker, Kubernetes, AWS (EC2, S3, RDS, Lambda), GitHub Actions, CI/CD, Terraform
- Testing & Quality: Jest, Cypress, Supertest, SonarQube

Professional Experience:
Senior Full Stack Engineer | CloudScale Systems (2022 - Present)
- Architected and deployed event-driven payment processing microservices handling $4.5M in monthly transactions with zero downtime.
- Refactored PostgreSQL queries and implemented Redis caching, reducing p99 API response latency by 58% (from 420ms to 175ms).
- Directed migration from monolithic architecture to containerized microservices on AWS EKS, accelerating deployment frequency by 3x.
- Mentored 6 junior engineers and spearheaded automated testing practices, boosting test coverage from 62% to 91%.

Software Engineer | DevPulse Technologies (2020 - 2022)
- Built real-time analytics dashboard in React and TypeScript serving 120,000+ concurrent enterprise users.
- Designed schema indexing and materialized views in MongoDB, mitigating database CPU spikes during flash peak events.
- Automated CI/CD delivery pipelines using GitHub Actions, reducing release cycle duration from 4 hours to 18 minutes.

Education:
Bachelor of Technology in Computer Science & Engineering | National Institute of Technology (2020) | GPA: 3.8/4.0

Certifications:
- AWS Certified Solutions Architect - Associate
- Certified Kubernetes Administrator (CKA)
`;

async function run() {
  console.log('====================================================');
  console.log('TESTING DYNAMIC GPT ATS SCORING (NO HARDCODING)');
  console.log('====================================================\n');

  console.log('1. Parsing Junior Brief Resume via GPT...');
  const prompt1 = buildResumeParsePrompt(resumeJunior);
  const result1 = await generateLLMJson(prompt1, 'You parse raw resume text into JSON format.');
  console.log('Junior Resume ATS Result:');
  console.log({
    atsScore: result1.atsScore,
    atsBreakdown: result1.atsBreakdown,
    targetRole: result1.targetRole,
    skillsCount: result1.skills?.length,
    source: result1._meta?.source,
    model: result1._meta?.model
  });

  console.log('\n2. Parsing Senior Comprehensive Resume via GPT...');
  const prompt2 = buildResumeParsePrompt(resumeSenior);
  const result2 = await generateLLMJson(prompt2, 'You parse raw resume text into JSON format.');
  console.log('Senior Resume ATS Result:');
  console.log({
    atsScore: result2.atsScore,
    atsBreakdown: result2.atsBreakdown,
    targetRole: result2.targetRole,
    skillsCount: result2.skills?.length,
    source: result2._meta?.source,
    model: result2._meta?.model
  });

  console.log('\n--- VERIFICATION CHECKS ---');
  console.log('Check 1: Junior ATS score is a valid number:', typeof result1.atsScore === 'number' && result1.atsScore > 0);
  console.log('Check 2: Senior ATS score is a valid number:', typeof result2.atsScore === 'number' && result2.atsScore > 0);
  console.log('Check 3: Scores are NOT hardcoded 85:', result1.atsScore !== 85 || result2.atsScore !== 85);
  console.log('Check 4: Senior score is significantly higher than Junior score:', result2.atsScore > result1.atsScore);
  console.log('Check 5: Score difference:', result2.atsScore - result1.atsScore, 'points');
  console.log('Check 6: Both evaluated via OpenAI live model:', result1._meta?.source === 'openai' && result2._meta?.source === 'openai');
}

run().catch(console.error);

