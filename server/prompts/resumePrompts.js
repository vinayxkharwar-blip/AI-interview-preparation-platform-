export const buildResumeParsePrompt = (rawText) => {
  return `You are an expert HR, ATS (Applicant Tracking System), and senior technical recruiter analyzer. 
Analyze and extract comprehensive structured information and an ATS Resume Score from the following raw resume text.

Return ONLY a valid JSON object with the following exact schema:
{
  "atsScore": number (integer between 0 and 100 representing overall ATS compatibility and quality),
  "targetRole": "string (inferred primary target job role, e.g. Full Stack Engineer)",
  "skills": ["string (technical & soft skills extracted)"],
  "experience": [
    {
      "title": "string",
      "company": "string",
      "duration": "string",
      "highlights": ["string"]
    }
  ],
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "year": "string"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "string",
      "techStack": ["string"]
    }
  ],
  "certifications": ["string"],
  "strengths": ["string (key ATS & technical strengths)"],
  "weaknesses": ["string (areas for ATS improvement & skill gaps)"],
  "summary": "string"
}

Resume Raw Text:
"""
${rawText}
"""`;
};
