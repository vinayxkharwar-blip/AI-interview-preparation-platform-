/**
 * Official & Practice Exam Patterns for Top Campus Recruitment Companies
 * Distinguishes verified examination patterns from practice simulations.
 */

export const COMPANY_EXAM_PATTERNS = {
  TCS: {
    company: 'TCS',
    fullName: 'Tata Consultancy Services',
    examTitle: 'TCS NQT (National Qualifier Test)',
    tagline: 'Cognitive & Numerical Reasoning Qualifier',
    intro:
      'Tata Consultancy Services is a global leader in IT services, consulting, and business solutions. The TCS NQT evaluates candidates through a structured Foundation Section (Numerical, Verbal, Reasoning) and an Advanced Section (Advanced Quantitative & Reasoning, Coding Logic).',
    isVerifiedPattern: true,
    patternType: 'Verified Official Pattern',
    accentColor: 'border-blue-600 bg-blue-50/50',
    logoBadge: 'bg-blue-600 text-white',
    expectedDurationMinutes: 75,
    fullMockQuestionCount: 20,
    practiceQuestionCount: 10,
    negativeMarking: 0, // TCS NQT standard cognitive section has no negative marking
    passCutoffPercentage: 65,
    difficultyDistribution: { Easy: '30%', Medium: '50%', Hard: '20%' },
    sections: [
      { name: 'Numerical Ability', category: 'Quantitative Aptitude', questions: 7, duration: 25 },
      { name: 'Reasoning Ability', category: 'Logical Reasoning', questions: 7, duration: 25 },
      { name: 'Verbal Ability', category: 'Verbal Ability', questions: 6, duration: 25 },
    ],
    primaryCategories: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Programming'],
  },

  Infosys: {
    company: 'Infosys',
    fullName: 'Infosys Limited',
    examTitle: 'Infosys INFYTQ & Campus Qualifier',
    tagline: 'Mathematical, Analytical & Pseudocode Assessment',
    intro:
      'Infosys is a global leader in next-generation digital services and consulting. The campus assessment rigorously tests Mathematical Ability, Analytical & Logical Reasoning, Verbal Ability, and Pseudocode dry runs.',
    isVerifiedPattern: true,
    patternType: 'Verified Official Pattern',
    accentColor: 'border-indigo-600 bg-indigo-50/50',
    logoBadge: 'bg-indigo-600 text-white',
    expectedDurationMinutes: 65,
    fullMockQuestionCount: 20,
    practiceQuestionCount: 10,
    negativeMarking: 0, // Infosys has no negative marking for standard qualifying test
    passCutoffPercentage: 65,
    difficultyDistribution: { Easy: '25%', Medium: '55%', Hard: '20%' },
    sections: [
      { name: 'Mathematical Ability', category: 'Quantitative Aptitude', questions: 6, duration: 20 },
      { name: 'Reasoning Ability', category: 'Logical Reasoning', questions: 6, duration: 20 },
      { name: 'Verbal Ability', category: 'Verbal Ability', questions: 5, duration: 15 },
      { name: 'Pseudocode Tracing', category: 'Pseudocode', questions: 3, duration: 10 },
    ],
    primaryCategories: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Pseudocode'],
  },

  Accenture: {
    company: 'Accenture',
    fullName: 'Accenture plc',
    examTitle: 'Accenture Cognitive & Technical Assessment',
    tagline: 'Critical Thinking, Abstract Reasoning & Common Tech',
    intro:
      'Accenture focuses on strategy, consulting, technology, and operations. The first round is a Cognitive and Technical Assessment testing Critical Thinking, Abstract Reasoning, English Ability, and Common Technical Applications (Pseudocode, Cloud, Security).',
    isVerifiedPattern: true,
    patternType: 'Verified Official Pattern',
    accentColor: 'border-purple-600 bg-purple-50/50',
    logoBadge: 'bg-purple-600 text-white',
    expectedDurationMinutes: 90,
    fullMockQuestionCount: 20,
    practiceQuestionCount: 10,
    negativeMarking: 0, // Accenture standard round has no negative marking
    passCutoffPercentage: 60,
    difficultyDistribution: { Easy: '35%', Medium: '45%', Hard: '20%' },
    sections: [
      { name: 'Critical Thinking & Problem Solving', category: 'Logical Reasoning', questions: 7, duration: 30 },
      { name: 'Abstract Reasoning & Numerical', category: 'Quantitative Aptitude', questions: 6, duration: 25 },
      { name: 'English Ability', category: 'Verbal Ability', questions: 4, duration: 20 },
      { name: 'Pseudocode & Common Tech', category: 'Pseudocode', questions: 3, duration: 15 },
    ],
    primaryCategories: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Pseudocode'],
  },

  Wipro: {
    company: 'Wipro',
    fullName: 'Wipro Technologies',
    examTitle: 'Wipro Elite National Talent Hunt (NTH)',
    tagline: 'Aptitude & Logical Talent Hunt',
    intro:
      'Wipro is a prominent Indian multinational technology company. The Elite NTH assessment includes Quantitative Aptitude, Logical Reasoning, and Verbal Ability, followed by a written communication test.',
    isVerifiedPattern: true,
    patternType: 'Verified Official Pattern',
    accentColor: 'border-amber-600 bg-amber-50/50',
    logoBadge: 'bg-amber-600 text-white',
    expectedDurationMinutes: 48,
    fullMockQuestionCount: 20,
    practiceQuestionCount: 10,
    negativeMarking: 0.25, // Practice simulation marking includes standard competitive deduction
    passCutoffPercentage: 60,
    difficultyDistribution: { Easy: '40%', Medium: '45%', Hard: '15%' },
    sections: [
      { name: 'Quantitative Ability', category: 'Quantitative Aptitude', questions: 7, duration: 16 },
      { name: 'Logical Ability', category: 'Logical Reasoning', questions: 7, duration: 16 },
      { name: 'Verbal Ability', category: 'Verbal Ability', questions: 6, duration: 16 },
    ],
    primaryCategories: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'],
  },

  Capgemini: {
    company: 'Capgemini',
    fullName: 'Capgemini SE',
    examTitle: 'Capgemini Excellence Assessment',
    tagline: 'Pseudocode, English & Game-Based Aptitude',
    intro:
      'Capgemini is a multinational IT services and consulting company. Its selection process prominently features a dedicated Pseudocode round, English Communication evaluation, and game-based cognitive reasoning.',
    isVerifiedPattern: true,
    patternType: 'Verified Official Pattern',
    accentColor: 'border-cyan-600 bg-cyan-50/50',
    logoBadge: 'bg-cyan-600 text-white',
    expectedDurationMinutes: 60,
    fullMockQuestionCount: 20,
    practiceQuestionCount: 10,
    negativeMarking: 0,
    passCutoffPercentage: 65,
    difficultyDistribution: { Easy: '30%', Medium: '50%', Hard: '20%' },
    sections: [
      { name: 'Pseudocode', category: 'Pseudocode', questions: 8, duration: 25 },
      { name: 'English Communication', category: 'Verbal Ability', questions: 6, duration: 20 },
      { name: 'Quantitative & Game Reasoning', category: 'Quantitative Aptitude', questions: 6, duration: 15 },
    ],
    primaryCategories: ['Pseudocode', 'Verbal Ability', 'Quantitative Aptitude', 'Logical Reasoning'],
  },

  Cognizant: {
    company: 'Cognizant',
    fullName: 'Cognizant Technology Solutions',
    examTitle: 'Cognizant GenC Quantitative & Analytical Assessment',
    tagline: 'Numerical, Analytical & Verbal Reasoning',
    intro:
      'Cognizant tests engineering talent through the GenC and GenC Elevate tracks. The screening consists of Quantitative Aptitude, Logical Reasoning, and Verbal Ability with a strong focus on data interpretation.',
    isVerifiedPattern: true,
    patternType: 'Verified Official Pattern',
    accentColor: 'border-emerald-600 bg-emerald-50/50',
    logoBadge: 'bg-emerald-600 text-white',
    expectedDurationMinutes: 80,
    fullMockQuestionCount: 20,
    practiceQuestionCount: 10,
    negativeMarking: 0,
    passCutoffPercentage: 65,
    difficultyDistribution: { Easy: '30%', Medium: '50%', Hard: '20%' },
    sections: [
      { name: 'Quantitative Ability', category: 'Quantitative Aptitude', questions: 7, duration: 30 },
      { name: 'Logical Reasoning', category: 'Logical Reasoning', questions: 7, duration: 25 },
      { name: 'Verbal Ability', category: 'Verbal Ability', questions: 6, duration: 25 },
    ],
    primaryCategories: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'],
  },

  HCLTech: {
    company: 'HCLTech',
    fullName: 'HCL Technologies',
    examTitle: 'HCLTech First Careers Assessment',
    tagline: 'General Aptitude & Technical Foundations',
    intro:
      'HCLTech operates across 52 countries delivering engineering and R&D services. Its entry-level recruitment evaluates Quantitative Aptitude, Logical Reasoning, Verbal English, and Computer Fundamentals.',
    isVerifiedPattern: true,
    patternType: 'Verified Official Pattern',
    accentColor: 'border-rose-600 bg-rose-50/50',
    logoBadge: 'bg-rose-600 text-white',
    expectedDurationMinutes: 60,
    fullMockQuestionCount: 20,
    practiceQuestionCount: 10,
    negativeMarking: 0.25,
    passCutoffPercentage: 60,
    difficultyDistribution: { Easy: '35%', Medium: '45%', Hard: '20%' },
    sections: [
      { name: 'Quantitative Aptitude', category: 'Quantitative Aptitude', questions: 7, duration: 20 },
      { name: 'Logical Reasoning', category: 'Logical Reasoning', questions: 7, duration: 20 },
      { name: 'Verbal Ability', category: 'Verbal Ability', questions: 6, duration: 20 },
    ],
    primaryCategories: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Programming'],
  },

  'Tech Mahindra': {
    company: 'Tech Mahindra',
    fullName: 'Tech Mahindra',
    examTitle: 'Tech Mahindra Campus Placement Test',
    tagline: 'English Language, Quantitative & Reasoning Ability',
    intro:
      'Tech Mahindra provides digital transformation, consulting, and business re-engineering. The campus qualifier features English Communication, Quantitative Aptitude, Analytical Reasoning, and Technical MCQs.',
    isVerifiedPattern: true,
    patternType: 'Verified Official Pattern',
    accentColor: 'border-orange-600 bg-orange-50/50',
    logoBadge: 'bg-orange-600 text-white',
    expectedDurationMinutes: 75,
    fullMockQuestionCount: 20,
    practiceQuestionCount: 10,
    negativeMarking: 0.25,
    passCutoffPercentage: 60,
    difficultyDistribution: { Easy: '35%', Medium: '50%', Hard: '15%' },
    sections: [
      { name: 'English Essay & Grammar', category: 'Verbal Ability', questions: 7, duration: 25 },
      { name: 'Quantitative & Analytical', category: 'Quantitative Aptitude', questions: 7, duration: 25 },
      { name: 'Logical Reasoning & Tech', category: 'Logical Reasoning', questions: 6, duration: 25 },
    ],
    primaryCategories: ['Verbal Ability', 'Quantitative Aptitude', 'Logical Reasoning', 'Programming'],
  },

  Deloitte: {
    company: 'Deloitte',
    fullName: 'Deloitte Touche Tohmatsu Limited',
    examTitle: 'Deloitte National Assessment (USI)',
    tagline: 'Quantitative, Logical & Verbal Aptitude for Consultants',
    intro:
      'Deloitte is one of the Big Four professional services firms. Its technology and analyst recruitment tests candidates rigorously on Quantitative Problem Solving, Logical Deduction, and Business English Verbal comprehension.',
    isVerifiedPattern: true,
    patternType: 'Verified Official Pattern',
    accentColor: 'border-green-600 bg-green-50/50',
    logoBadge: 'bg-green-700 text-white',
    expectedDurationMinutes: 75,
    fullMockQuestionCount: 20,
    practiceQuestionCount: 10,
    negativeMarking: 0.25,
    passCutoffPercentage: 70,
    difficultyDistribution: { Easy: '20%', Medium: '55%', Hard: '25%' },
    sections: [
      { name: 'Quantitative Ability', category: 'Quantitative Aptitude', questions: 7, duration: 25 },
      { name: 'Logical Reasoning', category: 'Logical Reasoning', questions: 7, duration: 25 },
      { name: 'Verbal Ability', category: 'Verbal Ability', questions: 6, duration: 25 },
    ],
    primaryCategories: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability'],
  },
};

/**
 * Fallback pattern for custom or other companies configured in platform
 */
export const DEFAULT_COMPANY_PATTERN = {
  company: 'General IT Recruitment',
  fullName: 'Corporate Campus Qualifier',
  examTitle: 'Comprehensive Placement Aptitude Qualifier',
  tagline: 'Quantitative, Logical, Verbal & Technical Foundations',
  intro:
    'A standardized placement aptitude examination modeled after leading tech company campus recruitment drives.',
  isVerifiedPattern: false,
  patternType: 'Configurable Practice Simulation',
  accentColor: 'border-slate-600 bg-slate-50/50',
  logoBadge: 'bg-slate-700 text-white',
  expectedDurationMinutes: 60,
  fullMockQuestionCount: 20,
  practiceQuestionCount: 10,
  negativeMarking: 0.25,
  passCutoffPercentage: 60,
  difficultyDistribution: { Easy: '30%', Medium: '50%', Hard: '20%' },
  sections: [
    { name: 'Quantitative Aptitude', category: 'Quantitative Aptitude', questions: 7, duration: 20 },
    { name: 'Logical Reasoning', category: 'Logical Reasoning', questions: 7, duration: 20 },
    { name: 'Verbal Ability', category: 'Verbal Ability', questions: 6, duration: 20 },
  ],
  primaryCategories: ['Quantitative Aptitude', 'Logical Reasoning', 'Verbal Ability', 'Pseudocode', 'Programming'],
};

