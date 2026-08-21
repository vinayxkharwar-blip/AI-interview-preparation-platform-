export const buildImprovementPlanPrompt = ({ targetRole, interviewType, qnAHistory }) => {
  const historyText = JSON.stringify(qnAHistory, null, 2);

  return `You are a Principal Career Coach & Technical Advisor.
Review all questions, candidate answers, scores, and feedback from this completed interview session.

Session Context:
- Target Role: ${targetRole}
- Interview Type: ${interviewType}

Session Transcript & Grading History:
${historyText}

Synthesize recurring patterns and technical gaps across the entire interview session.
Identify 3 to 5 key focus areas for candidate improvement with concrete study recommendations.

Return ONLY a valid JSON object matching this schema:
{
  "overallSummary": "string",
  "focusAreas": [
    {
      "topic": "string",
      "observation": "string",
      "recommendation": "string"
    }
  ]
}`;
};
