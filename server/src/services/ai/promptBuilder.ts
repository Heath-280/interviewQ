import type {
  EvaluateAnswerParams,
  FollowUpParams,
  GenerateQuestionsParams,
  InterviewSummaryParams,
} from './types';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_INTERVIEWER =
  'You are InterviewIQ, a senior technical interviewer and career coach. ' +
  'You produce realistic, role-specific interview content. ' +
  'You ALWAYS respond with a single valid JSON object and nothing else. ' +
  'Never wrap JSON in markdown unless asked. Never include commentary outside JSON.';

function resumeContext(resumeText?: string, skills?: string[]): string {
  const parts: string[] = [];
  if (skills && skills.length) parts.push(`Detected candidate skills: ${skills.join(', ')}.`);
  if (resumeText) parts.push(`Candidate resume (truncated):\n"""${resumeText.slice(0, 6000)}"""`);
  return parts.join('\n') || 'No resume provided.';
}

export function buildQuestionsPrompt(params: GenerateQuestionsParams): ChatMessage[] {
  const {
    role,
    company,
    jobDescription,
    resumeText,
    skills,
    type,
    difficulty,
    count,
  } = params;
  const categoryMix =
    type === 'mixed'
      ? 'a balanced mix of "technical", "hr", and "behavioral"'
      : `all of category "${type}"`;

  const user = `Create ${count} interview questions for the following candidate.

Target role: ${role}
Company: ${company || 'Not specified'}
Interview type: ${type} (${categoryMix})
Difficulty: ${difficulty}
Job description:
"""${(jobDescription || 'Not provided').slice(0, 5000)}"""

${resumeContext(resumeText, skills)}

Requirements:
- Questions must be specific to the role, job description, and candidate background.
- Do not number the questions.
- Each question must be answerable in a spoken interview.

Respond with JSON exactly in this shape:
{"questions":[{"category":"technical|hr|behavioral","question":"..."}]}`;

  return [
    { role: 'system', content: SYSTEM_INTERVIEWER },
    { role: 'user', content: user },
  ];
}

export function buildEvaluationPrompt(params: EvaluateAnswerParams): ChatMessage[] {
  const { role, category, question, answer, jobDescription, resumeText } = params;
  const user = `Evaluate the candidate's answer to an interview question.

Target role: ${role}
Question category: ${category}
Question: ${question}
Candidate's answer:
"""${answer}"""

Context — job description:
"""${(jobDescription || 'Not provided').slice(0, 3000)}"""
${resumeContext(resumeText)}

Scoring rubric: 0-100 where 60 is an adequate answer, 80+ is strong, below 40 is weak.
Be specific and honest; avoid generic praise.

Respond with JSON exactly in this shape:
{"score":number,"summary":"2-3 sentence assessment","strengths":["..."],"weaknesses":["..."],"suggestedAnswer":"an improved model answer","tips":["actionable improvement tip"]}`;

  return [
    { role: 'system', content: SYSTEM_INTERVIEWER },
    { role: 'user', content: user },
  ];
}

export function buildFollowUpPrompt(params: FollowUpParams): ChatMessage[] {
  const { role, question, answer } = params;
  const user = `Based on the candidate's answer, ask ONE natural follow-up interview question.

Target role: ${role}
Original question: ${question}
Candidate's answer:
"""${answer}"""

The follow-up should probe deeper, request specifics, or explore a gap. Keep it under 40 words.

Respond with JSON exactly in this shape:
{"followUp":"..."}`;

  return [
    { role: 'system', content: SYSTEM_INTERVIEWER },
    { role: 'user', content: user },
  ];
}

export function buildSummaryPrompt(params: InterviewSummaryParams): ChatMessage[] {
  const { role, company, type, items } = params;
  const transcript = items
    .map(
      (item, index) =>
        `${index + 1}. [${item.category}] Q: ${item.question}\n   A: ${item.answer || '(no answer)'}\n   Score: ${item.score}`,
    )
    .join('\n');

  const user = `Summarize this completed mock interview and score the candidate's skills.

Target role: ${role}
Company: ${company || 'Not specified'}
Interview type: ${type}

Transcript:
${transcript}

Score each skill 0-100 based on the evidence in the transcript.

Respond with JSON exactly in this shape:
{"summary":"a paragraph overview","strengths":["..."],"weaknesses":["..."],"recommendations":["next-step study/prep action"],"skillScores":{"technical":number,"communication":number,"problemSolving":number,"confidence":number}}`;

  return [
    { role: 'system', content: SYSTEM_INTERVIEWER },
    { role: 'user', content: user },
  ];
}
