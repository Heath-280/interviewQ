import { Link } from 'react-router-dom';
import {
  Activity,
  Clock,
  FileText,
  ListChecks,
  PlusCircle,
  Sparkles,
  Target,
} from 'lucide-react';
import { progressApi } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ScoreRing } from '@/components/common/Score';
import { EmptyState, ErrorState } from '@/components/common/States';
import { CardSkeleton, InlineLoader } from '@/components/common/Loading';
import { InterviewRow, type InterviewListItem } from '@/components/interviews/InterviewRow';
import { ScoreTrendChart } from '@/components/charts/ScoreTrendChart';
import { SkillBars } from '@/components/charts/SkillBars';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { data, loading, error, reload } = useAsyncData(() => progressApi.overview());

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" description="Your interview preparation at a glance." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="mt-6">
          <CardSkeleton />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <ErrorState
          title="Could not load your dashboard"
          description={error ?? undefined}
          onRetry={reload}
        />
      </>
    );
  }

  const hasInterviews = data.totals.interviews > 0;
  const recent: InterviewListItem[] = data.recentInterviews.map((item) => ({
    _id: item.id,
    role: item.role,
    company: item.company,
    status: item.status,
    type: item.type,
    overallScore: item.overallScore,
    createdAt: item.createdAt,
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your interview preparation at a glance."
        actions={
          <Button asChild>
            <Link to="/interviews/new">
              <PlusCircle className="h-4 w-4" />
              New interview
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Interviews"
          value={data.totals.interviews}
          hint={`${data.totals.completed} completed`}
          icon={<ListChecks className="h-5 w-5" />}
        />
        <StatCard
          label="Average score"
          value={data.averageScore || '—'}
          hint={`Best: ${data.bestScore || '—'}`}
          icon={<Target className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Answers evaluated"
          value={data.totals.answers}
          hint={`${data.totals.inProgress} in progress`}
          icon={<Activity className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="Practice time"
          value={`${data.totals.practiceMinutes}m`}
          hint={`${data.totals.resumes} resume${data.totals.resumes === 1 ? '' : 's'}`}
          icon={<Clock className="h-5 w-5" />}
          accent="neutral"
        />
      </div>

      {!hasInterviews ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <EmptyState
              icon={<Sparkles className="h-6 w-6" />}
              title="Start your first mock interview"
              description="Generate AI-powered questions from your resume and target role, then get instant feedback."
              action={
                <Button asChild>
                  <Link to="/interviews/new">
                    <PlusCircle className="h-4 w-4" />
                    New interview
                  </Link>
                </Button>
              }
            />
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add your resume</CardTitle>
              <CardDescription>
                Upload a resume for sharper, more personalized questions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/resumes">
                  <FileText className="h-4 w-4" />
                  Manage resumes
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Score trend</CardTitle>
              <CardDescription>Your overall score across recent interviews.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.scoreTrend.length > 1 ? (
                <ScoreTrendChart data={data.scoreTrend} />
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Complete a couple more interviews to see your trend.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overall performance</CardTitle>
              <CardDescription>Average across completed interviews.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <ScoreRing score={data.averageScore} />
              <div className="w-full">
                <SkillBars scores={data.skillAverages} />
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base">Recent interviews</CardTitle>
                <CardDescription>Pick up where you left off.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/interviews">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {recent.length === 0 ? (
                <InlineLoader label="No interviews yet" />
              ) : (
                recent.map((item) => <InterviewRow key={item._id} interview={item} />)
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
