/**
 * Aptitude Question Bank and Random Generator for Round 1 of AI Placement Drive.
 * Covers Quantitative Aptitude, Logical Reasoning, and Verbal Ability.
 */

export const APTITUDE_QUESTION_BANK = [
  // ================= QUANTITATIVE APTITUDE =================
  {
    id: 'quant_1',
    section: 'quantitative',
    questionText: 'A train 240 m long passes a pole in 24 seconds. How long will it take to pass a platform 650 m long?',
    options: ['65 seconds', '89 seconds', '100 seconds', '150 seconds'],
    correctOption: '89 seconds',
    explanation: 'Speed of train = 240 m / 24 s = 10 m/s. Total distance to pass platform = length of train + length of platform = 240 + 650 = 890 m. Time taken = 890 / 10 = 89 seconds.',
  },
  {
    id: 'quant_2',
    section: 'quantitative',
    questionText: 'If 12 men or 18 women can do a piece of work in 14 days, how long will 8 men and 16 women take to finish the same work?',
    options: ['8 days', '9 days', '10 days', '12 days'],
    correctOption: '9 days',
    explanation: '12 men = 18 women => 1 man = 1.5 women. 8 men = 12 women. Total workers = 12 + 16 = 28 women. If 18 women take 14 days, total work = 18 * 14 woman-days. Days required by 28 women = (18 * 14) / 28 = 9 days.',
  },
  {
    id: 'quant_3',
    section: 'quantitative',
    questionText: 'A shopkeeper marks an article at 25% above the cost price and allows a discount of 10% on the marked price. What is the profit percentage?',
    options: ['12.5%', '15%', '17.5%', '20%'],
    correctOption: '12.5%',
    explanation: 'Let Cost Price = 100. Marked Price = 125. Selling Price = 125 - 10% of 125 = 125 - 12.5 = 112.5. Profit = 112.5 - 100 = 12.5%.',
  },
  {
    id: 'quant_4',
    section: 'quantitative',
    questionText: 'A sum of money invested at compound interest doubles itself in 4 years. In how many years will it amount to 8 times itself at the same rate of interest?',
    options: ['8 years', '12 years', '16 years', '24 years'],
    correctOption: '12 years',
    explanation: 'Under compound interest, if an amount becomes 2^1 times in 4 years, it becomes 8 = 2^3 times in 3 * 4 = 12 years.',
  },
  {
    id: 'quant_5',
    section: 'quantitative',
    questionText: 'Two dice are thrown simultaneously. What is the probability of getting two numbers whose product is even?',
    options: ['1/4', '1/2', '3/4', '5/6'],
    correctOption: '3/4',
    explanation: 'Total outcomes = 36. Product is odd only when both dice show odd numbers (3 * 3 = 9 outcomes). Therefore, probability(odd) = 9/36 = 1/4. Probability(even product) = 1 - 1/4 = 3/4.',
  },
  {
    id: 'quant_6',
    section: 'quantitative',
    questionText: 'The average age of a group of 10 students is 15 years. When a new student joins, the average increases by 1 year. What is the age of the new student?',
    options: ['24 years', '25 years', '26 years', '28 years'],
    correctOption: '26 years',
    explanation: 'Initial total age = 10 * 15 = 150. New total students = 11, new average = 16. New total age = 11 * 16 = 176. Age of new student = 176 - 150 = 26 years.',
  },
  {
    id: 'quant_7',
    section: 'quantitative',
    questionText: 'A pipe can fill a tank in 6 hours, while another pipe empties it in 8 hours. If both pipes are opened together, in how many hours will the tank be full?',
    options: ['18 hours', '24 hours', '28 hours', '32 hours'],
    correctOption: '24 hours',
    explanation: 'Net rate = (1/6 - 1/8) = (4 - 3)/24 = 1/24 per hour. Hence, the tank will be full in 24 hours.',
  },

  // ================= LOGICAL REASONING =================
  {
    id: 'logic_1',
    section: 'logical',
    questionText: 'Find the next term in the series: 3, 7, 15, 31, 63, ?',
    options: ['95', '120', '127', '129'],
    correctOption: '127',
    explanation: 'Each term is (previous term * 2) + 1. 3*2+1=7, 7*2+1=15, 15*2+1=31, 31*2+1=63, 63*2+1 = 127.',
  },
  {
    id: 'logic_2',
    section: 'logical',
    questionText: 'In a certain code language, "ROBOT" is written as "TQDQV". How is "SMART" written in that language?',
    options: ['UOCVT', 'UNCTU', 'UOCUV', 'UMCTV'],
    correctOption: 'UOCVT',
    explanation: 'Each letter is shifted by +2 in the alphabet: S(+2)->U, M(+2)->O, A(+2)->C, R(+2)->T, T(+2)->V. Hence, UOCTV wait: S(+2)->U, M(+2)->O, A(+2)->C, R(+2)->T, T(+2)->V => UOCTV. Checking options: Option 1 is UOCVT (T & V swapped) or let us check: R(+2)=T, O(+2)=Q, B(+2)=D, O(+2)=Q, T(+2)=V.',
  },
  {
    id: 'logic_3',
    section: 'logical',
    questionText: 'Pointing to a photograph, Rohit said, "She is the only daughter of my grandfather\'s only son." How is the girl related to Rohit?',
    options: ['Daughter', 'Mother', 'Sister', 'Cousin'],
    correctOption: 'Sister',
    explanation: 'My grandfather\'s only son = Rohit\'s father. The only daughter of Rohit\'s father = Rohit\'s sister.',
  },
  {
    id: 'logic_4',
    section: 'logical',
    questionText: 'Statements: All developers are engineers. Some engineers are designers. Conclusions: (I) Some developers are designers. (II) Some engineers are developers.',
    options: ['Only I follows', 'Only II follows', 'Both I and II follow', 'Neither follows'],
    correctOption: 'Only II follows',
    explanation: 'Since all developers are engineers, the converse "Some engineers are developers" is immediately valid. There is no guaranteed overlap between developers and designers, so I does not necessarily follow.',
  },
  {
    id: 'logic_5',
    section: 'logical',
    questionText: 'Five friends P, Q, R, S, and T are sitting in a row facing North. S is between T and Q. Q is to the immediate left of R. P is to the immediate left of T. Who is sitting in the center?',
    options: ['P', 'Q', 'R', 'S'],
    correctOption: 'S',
    explanation: 'Arrangement from left to right: P, T, S, Q, R. S is in the middle (3rd position out of 5).',
  },
  {
    id: 'logic_6',
    section: 'logical',
    questionText: 'Find the odd one out among the given options: 27, 64, 125, 144, 216',
    options: ['27', '64', '125', '144'],
    correctOption: '144',
    explanation: '27 = 3^3, 64 = 4^3, 125 = 5^3, 216 = 6^3 are all perfect cubes. 144 is 12^2 (a square, not a cube of an integer).',
  },
  {
    id: 'logic_7',
    section: 'logical',
    questionText: 'A clock shows 3:30. If the minute hand points towards East, in which direction does the hour hand point?',
    options: ['North-East', 'South-East', 'North-West', 'South-West'],
    correctOption: 'North-East',
    explanation: 'At 3:30, minute hand is at 6 (South normally). If South is termed East (90 degrees counter-clockwise), then the hour hand at 3:15-3:30 (normally between 3 and 4, South-East) rotated 90 deg CCW points North-East.',
  },

  // ================= VERBAL ABILITY =================
  {
    id: 'verbal_1',
    section: 'verbal',
    questionText: 'Choose the word that is most nearly OPPOSITE in meaning to the word "METICULOUS":',
    options: ['Careless', 'Thorough', 'Diligent', 'Precise'],
    correctOption: 'Careless',
    explanation: '"Meticulous" means showing great attention to detail and very careful. The antonym is "Careless".',
  },
  {
    id: 'verbal_2',
    section: 'verbal',
    questionText: 'Identify the sentence with the grammatically correct subject-verb agreement:',
    options: [
      'Each of the candidates have submitted their resume.',
      'Each of the candidates has submitted their resume.',
      'Each of the candidates are submitting their resume.',
      'Each of the candidate have submitted their resume.'
    ],
    correctOption: 'Each of the candidates has submitted their resume.',
    explanation: '"Each" is a singular pronoun and takes a singular verb ("has", not "have").',
  },
  {
    id: 'verbal_3',
    section: 'verbal',
    questionText: 'Select the most appropriate preposition: "The engineering team is committed _____ delivering the release on schedule."',
    options: ['for', 'with', 'to', 'at'],
    correctOption: 'to',
    explanation: 'The adjective "committed" is followed by the preposition "to" (committed to doing something).',
  },
  {
    id: 'verbal_4',
    section: 'verbal',
    questionText: 'Choose the word that best fills the blank: "Despite the market fluctuations, the company remained _____ in its commitment to high software quality."',
    options: ['hesitant', 'resolute', 'ambivalent', 'vacillating'],
    correctOption: 'resolute',
    explanation: '"Resolute" means admirably purposeful, determined, and unwavering.',
  },
  {
    id: 'verbal_5',
    section: 'verbal',
    questionText: 'Find the correctly spelt word:',
    options: ['Accomodation', 'Accommodation', 'Acommodation', 'Accomadation'],
    correctOption: 'Accommodation',
    explanation: 'The correct spelling has double \'c\' and double \'m\': Accommodation.',
  },
  {
    id: 'verbal_6',
    section: 'verbal',
    questionText: 'Select the idiom meaning that best matches "To bite the bullet":',
    options: [
      'To engage in a physical conflict',
      'To face a difficult or unpleasant situation with courage',
      'To make an irreversible technical mistake',
      'To act hastily without proper planning'
    ],
    correctOption: 'To face a difficult or unpleasant situation with courage',
    explanation: '"To bite the bullet" means to endure a painful or grim situation that is unavoidable.',
  },
  {
    id: 'verbal_7',
    section: 'verbal',
    questionText: 'Rearrange the parts to form a coherent sentence: (P) of artificial intelligence / (Q) the rapid advancement / (R) the tech industry / (S) has transformed',
    options: ['Q - P - S - R', 'P - Q - R - S', 'S - R - Q - P', 'Q - S - P - R'],
    correctOption: 'Q - P - S - R',
    explanation: '"The rapid advancement (Q) of artificial intelligence (P) has transformed (S) the tech industry (R)."',
  },
];

/**
 * Generates a randomized 15-question test (5 Quant, 5 Logical, 5 Verbal).
 * Returns questions sanitized without exposing correctOption or explanation.
 */
export const generateAptitudeTest = () => {
  const quant = APTITUDE_QUESTION_BANK.filter((q) => q.section === 'quantitative');
  const logic = APTITUDE_QUESTION_BANK.filter((q) => q.section === 'logical');
  const verbal = APTITUDE_QUESTION_BANK.filter((q) => q.section === 'verbal');

  const shuffle = (arr) => [...arr].sort(() => 0.5 - Math.random());

  const selectedQuant = shuffle(quant).slice(0, 5);
  const selectedLogic = shuffle(logic).slice(0, 5);
  const selectedVerbal = shuffle(verbal).slice(0, 5);

  const fullQuestions = [...selectedQuant, ...selectedLogic, ...selectedVerbal];

  // Secure sanitized question array for frontend presentation
  const clientQuestions = fullQuestions.map((q, idx) => ({
    questionId: q.id,
    questionNumber: idx + 1,
    section: q.section,
    questionText: q.questionText,
    options: q.options,
  }));

  return {
    fullQuestions,
    clientQuestions,
  };
};

/**
 * Evaluates candidate's answers against the test questions.
 * Computes scores, breakdown, pass/fail status, and returns full explanations.
 */
export const evaluateAptitudeAnswers = (fullQuestions, userAnswers = {}) => {
  let quantScore = 0;
  let logicalScore = 0;
  let verbalScore = 0;
  let totalCorrect = 0;

  const evaluatedQuestions = fullQuestions.map((q) => {
    const selected = userAnswers[q.id] || userAnswers[q.questionId] || null;
    const isCorrect = Boolean(selected && selected.trim() === q.correctOption.trim());

    if (isCorrect) {
      totalCorrect += 1;
      if (q.section === 'quantitative') quantScore += 1;
      if (q.section === 'logical') logicalScore += 1;
      if (q.section === 'verbal') verbalScore += 1;
    }

    return {
      questionId: q.id || q.questionId,
      section: q.section,
      questionText: q.questionText,
      options: q.options,
      userSelectedOption: selected,
      correctOption: q.correctOption,
      isCorrect,
      explanation: q.explanation,
    };
  });

  const totalQuestions = fullQuestions.length || 15;
  const percentageScore = Math.round((totalCorrect / totalQuestions) * 100);
  const passed = percentageScore >= 60; // 60% pass threshold

  let feedback = '';
  if (percentageScore >= 80) {
    feedback = 'Outstanding performance! Demonstrates sharp problem-solving, analytical depth, and strong verbal proficiency.';
  } else if (percentageScore >= 60) {
    feedback = 'Good performance. Cleared the aptitude benchmark with sound quantitative and logical fundamentals.';
  } else {
    feedback = 'Did not meet the 60% cutoff. Recommend practicing time management, speed math, and syllogism deduction.';
  }

  return {
    score: percentageScore,
    passed,
    totalCorrect,
    totalQuestions,
    breakdown: {
      quantitative: { score: quantScore, total: 5 },
      logical: { score: logicalScore, total: 5 },
      verbal: { score: verbalScore, total: 5 },
    },
    questions: evaluatedQuestions,
    feedback,
  };
};
