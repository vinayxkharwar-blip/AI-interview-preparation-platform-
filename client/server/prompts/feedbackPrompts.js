export const buildAnswerFeedbackPrompt = ({ questionText, category, expectedKeyPoints, candidateAnswer }) => {
  const points = expectedKeyPoints && expectedKeyPoints.length > 0 ? expectedKeyPoints.join(', ') : 'Relevant domain knowledge';

  return `You are a strict but constructive AI Interview Grader evaluating a candidate's response.

Question Asked:
"${questionText}"

Question Category:
"${category || 'General'}"

Expected Key Points:
"${points}"

Candidate's Answer:
"${candidateAnswer}"

Grading Criteria:
- Score from 1 to 10 based on accuracy, clarity, completeness, depth, and relevance.
- List specific strengths demonstrated in the response.
- List specific weaknesses or missing key concepts.
- Provide a clear, actionable 1-2 sentence recommendation for how the candidate can improve this answer.

Return ONLY a valid JSON object matching this schema:
{
  "score": number,
  "strengths": ["string"],
  "weaknesses": ["string"],
  "suggestion": "string",
  "category": "string"
}`;
};
