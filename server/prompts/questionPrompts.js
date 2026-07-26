export const buildQuestionGenerationPrompt = ({ parsedResume, targetRole, interviewType, difficulty, count = 5 }) => {
  const resumeSummary = parsedResume
    ? JSON.stringify(parsedResume, null, 2)
    : 'No resume provided. Generate standard role-focused questions.';

  return `You are a Senior Technical Interviewer and Hiring Manager.
Generate ${count} personalized interview questions for a candidate based on the parameters below.

Parameters:
- Target Role: ${targetRole}
- Interview Type: ${interviewType} (technical, hr, or behavioral)
- Difficulty Level: ${difficulty} (junior, mid, senior, lead)

Candidate Resume Context:
${resumeSummary}

Requirements:
1. Generate exactly ${count} questions.
2. Tailor questions to the candidate's actual skills, experience, or role expectations.
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
