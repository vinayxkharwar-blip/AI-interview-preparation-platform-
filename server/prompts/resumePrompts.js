export const buildResumeParsePrompt = (rawText) => {
  return `You are an expert HR, ATS (Applicant Tracking System), and senior technical recruiter analyzer. 
Analyze and extract comprehensive structured information and an ATS Resume Score from the raw resume text below.

Return ONLY a valid JSON object matching this exact structure:
{
  "atsScore": 85,
  "targetRole": "Full Stack Engineer",
  "skills": ["JavaScript", "React", "Node.js", "SQL"],
  "experience": [
    {
      "title": "Software Developer",
      "company": "Tech Corp",
      "duration": "2023 - Present",
      "highlights": ["Developed React web applications and REST APIs"]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Technology in Computer Science",
      "institution": "University",
      "year": "2023"
    }
  ],
  "projects": [
    {
      "name": "AI Application Platform",
      "description": "Full stack web application",
      "techStack": ["React", "Node.js", "MongoDB"]
    }
  ],
  "certifications": ["AWS Certified Developer"],
  "strengths": ["Strong technical stack density", "Clear project implementation"],
  "weaknesses": ["Include quantifiable performance metrics in project descriptions"],
  "summary": "Full stack engineer with strong development experience."
}

Resume Raw Text:
"""
${rawText}
"""`;
};
