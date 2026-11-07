import { Types } from 'mongoose';
import { Interview } from '../../models/Interview';
import { Resume } from '../../models/Resume';

export interface ScoreTrendPoint {
  id: string;
  role: string;
  company: string;
  score: number;
  date: string;
}

export interface DashboardOverview {
  totals: {
    interviews: number;
    completed: number;
    inProgress: number;
    answers: number;
    resumes: number;
    practiceMinutes: number;
  };
  averageScore: number;
  bestScore: number;
  skillAverages: {
    technical: number;
    communication: number;
    problemSolving: number;
    confidence: number;
  };
  scoreTrend: ScoreTrendPoint[];
  categoryPerformance: { category: string; average: number; count: number }[];
  recentInterviews: {
    id: string;
    role: string;
    company: string;
    status: string;
    type: string;
    overallScore: number;
    createdAt: string;
    completedAt?: string;
  }[];
}

const round = (n: number) => Math.round(n);

export async function getOverview(userId: string): Promise<DashboardOverview> {
  const userObjectId = new Types.ObjectId(userId);

  const [interviews, resumeCount] = await Promise.all([
    Interview.find({ userId: userObjectId }).sort({ createdAt: -1 }),
    Resume.countDocuments({ userId: userObjectId }),
  ]);

  const completed = interviews.filter((i) => i.status === 'completed');
  const inProgress = interviews.filter((i) => i.status === 'in_progress' || i.status === 'created');

  const answers = interviews.reduce(
    (sum, i) => sum + i.questions.filter((q) => q.userAnswer.trim().length > 0).length,
    0,
  );

  const practiceSeconds = completed.reduce((sum, i) => sum + (i.durationSeconds || 0), 0);

  const scores = completed.map((i) => i.overallScore).filter((s) => s > 0);
  const averageScore = scores.length ? round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const bestScore = scores.length ? Math.max(...scores) : 0;

  const skillAverages = completed.reduce(
    (acc, i) => {
      acc.technical += i.skillScores.technical;
      acc.communication += i.skillScores.communication;
      acc.problemSolving += i.skillScores.problemSolving;
      acc.confidence += i.skillScores.confidence;
      return acc;
    },
    { technical: 0, communication: 0, problemSolving: 0, confidence: 0 },
  );
  if (completed.length) {
    skillAverages.technical = round(skillAverages.technical / completed.length);
    skillAverages.communication = round(skillAverages.communication / completed.length);
    skillAverages.problemSolving = round(skillAverages.problemSolving / completed.length);
    skillAverages.confidence = round(skillAverages.confidence / completed.length);
  }

  const scoreTrend: ScoreTrendPoint[] = [...completed]
    .sort(
      (a, b) =>
        (a.completedAt?.getTime() ?? a.createdAt.getTime()) -
        (b.completedAt?.getTime() ?? b.createdAt.getTime()),
    )
    .map((i) => ({
      id: i._id.toString(),
      role: i.role,
      company: i.company,
      score: i.overallScore,
      date: (i.completedAt ?? i.createdAt).toISOString(),
    }));

  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const interview of interviews) {
    for (const q of interview.questions) {
      if (q.status !== 'evaluated' || !q.feedback) continue;
      const entry = categoryMap.get(q.category) ?? { total: 0, count: 0 };
      entry.total += q.feedback.score;
      entry.count += 1;
      categoryMap.set(q.category, entry);
    }
  }
  const categoryPerformance = Array.from(categoryMap.entries()).map(([category, v]) => ({
    category,
    average: round(v.total / v.count),
    count: v.count,
  }));

  const recentInterviews = interviews.slice(0, 5).map((i) => ({
    id: i._id.toString(),
    role: i.role,
    company: i.company,
    status: i.status,
    type: i.type,
    overallScore: i.overallScore,
    createdAt: i.createdAt.toISOString(),
    completedAt: i.completedAt?.toISOString(),
  }));

  return {
    totals: {
      interviews: interviews.length,
      completed: completed.length,
      inProgress: inProgress.length,
      answers,
      resumes: resumeCount,
      practiceMinutes: round(practiceSeconds / 60),
    },
    averageScore,
    bestScore,
    skillAverages,
    scoreTrend,
    categoryPerformance,
    recentInterviews,
  };
}
