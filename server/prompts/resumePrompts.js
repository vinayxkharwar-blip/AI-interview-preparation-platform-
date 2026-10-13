export const buildResumeParsePrompt = (rawText) => {
  return `You are an expert HR, ATS (Applicant Tracking System), and senior technical recruiter analyzer. 
Analyze and extract comprehensive structured information and an ATS Resume Score from the raw resume text below.

STRICT INSTRUCTIONS FOR "targetRole":
- Analyze the candidate's actual work history, professional title, headline, summary, and primary skill set from the raw resume text.
- Determine their primary target role or professional specialization (e.g., "Frontend Engineer", "Backend Engineer", "Full Stack Engineer", "DevOps & Cloud Engineer", "AI / Machine Learning Engineer", "Data Analyst", "QA Engineer", "Cybersecurity Analyst", "SOC Analyst", "SAP Consultant", "Software Tester", "Technical Support Engineer", "Mobile Developer", etc.).
- Do NOT copy sample roles. Base it STRICTLY on the candidate's actual resume content.
- If the role cannot be clearly and reliably deduced from the candidate's resume content, set "targetRole" to null. Do NOT invent a role.

Return ONLY a valid JSON object matching this schema:
{
  "atsScore": 85,
  "targetRole": null,
  "skills": ["Skill1", "Skill2"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Dates",
      "highlights": ["Key achievement"]
    }
  ],
  "education": [
    {
      "degree": "Degree Name",
      "institution": "University / College",
      "year": "Year"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Project Description",
      "techStack": ["Tech1", "Tech2"]
    }
  ],
  "certifications": ["Certification Name"],
  "strengths": ["Clear strength 1", "Clear strength 2"],
  "weaknesses": ["Improvement suggestion 1"],
  "summary": "Professional summary based on the resume"
}

Resume Raw Text:
"""
${rawText}
"""`;
};
