export const buildResumeParsePrompt = (rawText) => {
  return `You are an expert HR and technical recruiter analyzer. 
Extract structured information from the following raw resume text.

Return ONLY a valid JSON object with the following schema:
{
  "skills": ["string"],
  "experience": [
    {
      "title": "string",
      "company": "string",
      "duration": "string",
      "highlights": ["string"]
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "techStack": ["string"]
    }
  ],
  "targetRole": "string",
  "summary": "string"
}

Resume Raw Text:
"""
${rawText}
"""`;
};
