export const buildResumeParsePrompt = (rawText) => {
  return `You are an expert HR, ATS (Applicant Tracking System), and senior technical recruiter analyzer. 
Analyze and extract comprehensive structured information and a dynamically calculated ATS Resume Score from the raw resume text below.

STRICT INSTRUCTIONS FOR "atsScore" (0-100) & "atsBreakdown":
- Do NOT use a hardcoded or default number (like 85). You MUST calculate the ATS score dynamically based strictly on the candidate's actual resume content.
- Evaluate the candidate across these 4 quantitative ATS dimensions (0 to 25 points each):
  1. "keywordDepth" (0-25): Presence, density, and relevance of modern technical tools, programming languages, libraries, databases, and domain terminology.
  2. "quantifiableImpact" (0-25): Presence of measurable business outcomes, metrics, percentages (e.g. "improved latency by 40%", "scaled to 100k users", "reduced bugs by 25%"), versus passive duty descriptions.
  3. "formattingStructure" (0-25): Clear standard ATS section headings (Work Experience, Skills, Projects, Education), concise bullet points, and high readability without parsing blockers.
  4. "roleAlignment" (0-25): Consistency of experience, relevant degree/certifications, and project portfolio alignment with the candidate's identified target role.
- Set "atsScore" to the exact sum of these 4 dimensions: atsScore = keywordDepth + quantifiableImpact + formattingStructure + roleAlignment (integer from 0 to 100).
- Score ranges to adhere to:
  * Incomplete or brief resumes (< 200 words, missing metrics, few skills): 40 - 58
  * Average resumes with basic skills and duties but few numbers: 60 - 74
  * Strong, detailed resumes with verified technical projects and clear metrics: 75 - 88
  * Elite, comprehensive resumes with outstanding quantifiable impact and deep tech stack: 89 - 98

STRICT INSTRUCTIONS FOR "targetRole":
- Analyze the candidate's actual work history, professional title, headline, summary, and primary skill set from the raw resume text.
- Determine their primary target role or professional specialization (e.g., "Frontend Engineer", "Backend Engineer", "Full Stack Engineer", "DevOps & Cloud Engineer", "AI / Machine Learning Engineer", "Data Analyst", "QA Engineer", "Cybersecurity Analyst", "SOC Analyst", "SAP Consultant", "Software Tester", "Technical Support Engineer", "Mobile Developer", etc.).
- Do NOT copy sample roles. Base it STRICTLY on the candidate's actual resume content.
- If the role cannot be clearly and reliably deduced from the candidate's resume content, set "targetRole" to null. Do NOT invent a role.

Return ONLY a valid JSON object matching this schema:
{
  "atsScore": 76,
  "atsBreakdown": {
    "keywordDepth": 20,
    "quantifiableImpact": 18,
    "formattingStructure": 20,
    "roleAlignment": 18
  },
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
  "weaknesses": ["Actionable improvement suggestion 1"],
  "summary": "Professional summary based on the resume"
}

Resume Raw Text:
"""
${rawText}
"""`;
};
