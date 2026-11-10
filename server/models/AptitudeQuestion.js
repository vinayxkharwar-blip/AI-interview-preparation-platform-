import mongoose from 'mongoose';
import crypto from 'crypto';

export const VALID_COMPANIES = [
  'TCS',
  'Infosys',
  'Accenture',
  'Wipro',
  'Capgemini',
  'Cognizant',
  'HCLTech',
  'Tech Mahindra',
  'Deloitte',
];

export const VALID_TOPICS = [
  'Quantitative Aptitude',
  'Logical Reasoning',
  'Verbal Ability',
  'Pseudocode',
  'Programming',
];

export const QUANTITATIVE_SUBTOPICS = [
  'Number System',
  'HCF and LCM',
  'Simplification',
  'Percentage',
  'Profit and Loss',
  'Simple Interest',
  'Compound Interest',
  'Ratio and Proportion',
  'Average',
  'Mixture and Alligation',
  'Time and Work',
  'Pipes and Cisterns',
  'Time, Speed and Distance',
  'Trains',
  'Boats and Streams',
  'Problems on Ages',
  'Partnership',
  'Probability',
  'Permutation and Combination',
  'Mensuration',
  'Geometry',
  'Algebra',
  'Data Interpretation',
  'Data Sufficiency',
];

export const LOGICAL_SUBTOPICS = [
  'Number Series',
  'Alphabet Series',
  'Coding and Decoding',
  'Blood Relations',
  'Direction Sense',
  'Seating Arrangement',
  'Linear Arrangement',
  'Circular Arrangement',
  'Puzzles',
  'Syllogism',
  'Statement and Conclusion',
  'Statement and Assumption',
  'Analogy',
  'Classification',
  'Odd One Out',
  'Ranking and Ordering',
  'Venn Diagrams',
  'Clocks',
  'Calendars',
  'Data Sufficiency',
];

export const VERBAL_SUBTOPICS = [
  'Reading Comprehension',
  'Synonyms',
  'Antonyms',
  'Sentence Correction',
  'Error Detection',
  'Fill in the Blanks',
  'Para Jumbles',
  'Sentence Completion',
  'Vocabulary',
  'Idioms and Phrases',
  'Active and Passive Voice',
  'Direct and Indirect Speech',
  'Subject-Verb Agreement',
  'Prepositions',
  'Grammar',
  'Critical Reasoning',
];

export const PSEUDOCODE_SUBTOPICS = [
  'Bitwise Operations',
  'Loop Logic and Iterations',
  'Recursion and Call Stacks',
  'Conditional Logic and Branching',
  'Array and String Manipulations',
  'Dry Run and Trace Tables',
];

export const PROGRAMMING_SUBTOPICS = [
  'Data Structures (Arrays, Stacks, Queues, Trees)',
  'Algorithm Complexity and Big-O',
  'Object-Oriented Programming (OOP)',
  'SQL and Database Queries',
  'Language Fundamentals (C, Java, Python)',
  'Code Output Tracing and Debugging',
];

export const VALID_DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

export const VALID_VERIFICATION_STATUSES = ['verified', 'unverified', 'archived'];

export const normalizeQuestionContent = (text = '') => {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const computeQuestionHash = (company, questionText) => {
  const normalized = `${(company || '').toUpperCase()}_${normalizeQuestionContent(questionText)}`;
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

const aptitudeQuestionSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: [true, 'Target company is required'],
      trim: true,
      index: true,
    },
    examName: {
      type: String,
      required: [true, 'Exam name is required (e.g., TCS NQT, INFYTQ)'],
      trim: true,
      index: true,
    },
    examYear: {
      type: Number,
      required: [true, 'Exam year is required'],
      min: [2010, 'Exam year must be 2010 or later'],
      max: [new Date().getFullYear() + 1, 'Exam year cannot be in the distant future'],
      index: true,
    },
    topic: {
      type: String,
      required: [true, 'Topic is required'],
      enum: {
        values: VALID_TOPICS,
        message: '{VALUE} is not a supported aptitude topic',
      },
      index: true,
    },
    subtopic: {
      type: String,
      trim: true,
      default: 'General',
    },
    difficulty: {
      type: String,
      enum: {
        values: VALID_DIFFICULTIES,
        message: '{VALUE} is not a valid difficulty level',
      },
      default: 'Medium',
      index: true,
    },
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    questionType: {
      type: String,
      enum: ['single_choice', 'multiple_choice'],
      default: 'single_choice',
    },
    options: {
      type: [String],
      validate: {
        validator: (opts) => Array.isArray(opts) && opts.length >= 2,
        message: 'A question must provide at least two options',
      },
      required: true,
    },
    correctAnswer: {
      type: String,
      required: [true, 'Correct answer is required'],
      trim: true,
    },
    explanation: {
      type: String,
      default: '',
      trim: true,
    },
    sourceUrl: {
      type: String,
      default: '',
      trim: true,
    },
    sourceTitle: {
      type: String,
      default: '',
      trim: true,
    },
    sourceType: {
      type: String,
      enum: [
        'official_sample',
        'contributed_paper',
        'institutional_archive',
        'authorized_curated',
      ],
      default: 'authorized_curated',
    },
    verificationStatus: {
      type: String,
      enum: {
        values: VALID_VERIFICATION_STATUSES,
        message: '{VALUE} is not a valid verification status',
      },
      default: 'unverified',
      index: true,
    },
    contentHash: {
      type: String,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-compute contentHash before validation/save
aptitudeQuestionSchema.pre('validate', function (next) {
  if (this.company && this.questionText) {
    this.contentHash = computeQuestionHash(this.company, this.questionText);
  }
  next();
});

// Compound indexes for optimized querying
aptitudeQuestionSchema.index({ company: 1, examYear: 1, verificationStatus: 1, isArchived: 1 });
aptitudeQuestionSchema.index({ topic: 1, difficulty: 1, verificationStatus: 1, isArchived: 1 });
aptitudeQuestionSchema.index({ company: 1, topic: 1, verificationStatus: 1, isArchived: 1 });

export default mongoose.model('AptitudeQuestion', aptitudeQuestionSchema);
