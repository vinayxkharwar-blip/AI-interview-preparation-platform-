export const buildQuestionGenerationPrompt = ({ parsedResume, targetRole, interviewType, difficulty, count = 5, focusTopic }) => {
  const resumeSummary = parsedResume
    ? JSON.stringify(parsedResume, null, 2)
    : 'No resume provided. Generate standard role-focused questions.';

  const focusInstruction = focusTopic
    ? `\nCRITICAL FOCUS REQUIREMENT:\n- Weak Topic Focus: "${focusTopic}"\n- ALL ${count} questions MUST strictly center around testing, probing, and improving candidate proficiency in "${focusTopic}". Do NOT generate unrelated general questions.\n`
    : '';

  return `You are a Senior Technical Interviewer and Hiring Manager.
Generate ${count} personalized interview questions for a candidate based on the parameters below.

Parameters:
- Target Role: ${targetRole}
- Interview Type: ${interviewType} (technical, hr, or behavioral)
- Difficulty Level: ${difficulty} (junior, mid, senior, lead)${focusInstruction}

Candidate Resume Context:
${resumeSummary}

Requirements:
1. Generate exactly ${count} questions.
2. Tailor questions to the candidate's actual skills, experience, or role expectations.${focusTopic ? ` All questions must focus on "${focusTopic}".` : ''}
3. For technical interviews, include coding/architecture/system design/problem-solving questions.
4. For behavioral interviews, use the STAR format framework.
5. Return ONLY a valid JSON object with the following schema:
{
  "questions": [
    {
      "questionNumber": 1,
      "questionText": "string",
      "category": "string",
      "expectedKeyPoints": ["string"],
      "hints": ["string"]
    }
  ]
}`;
};
