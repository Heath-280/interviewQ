import {
  Activity,
  Clock,
  ListChecks,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { progressApi } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ScoreRing } from '@/components/common/Score';
import { EmptyState, ErrorState } from '@/components/common/States';
import { CardSkeleton } from '@/components/common/Loading';
import { ScoreTrendChart } from '@/components/charts/ScoreTrendChart';
import { CategoryBars } from '@/components/charts/CategoryBars';
import { SkillBars } from '@/components/charts/SkillBars';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Progress() {
  const { data, loading, error, reload } = useAsyncData(() => progressApi.overview());

  if (loading) {
    return (
      <>
        <PageHeader title="Progress" description="Track how your interview skills evolve." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <PageHeader title="Progress" />
        <ErrorState description={error ?? undefined} onRetry={reload} />
      </>
    );
  }

  if (data.totals.interviews === 0) {
    return (
      <>
        <PageHeader title="Progress" description="Track how your interview skills evolve." />
        <EmptyState
          icon={<TrendingUp className="h-6 w-6" />}
          title="No data yet"
          description="Complete an interview to unlock your progress analytics."
          action={
            <Button asChild>
              <Link to="/interviews/new">Start an interview</Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Progress"
        description="Track how your interview skills evolve over time."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Average score"
          value={data.averageScore || '—'}
          icon={<Target className="h-5 w-5" />}
          accent="success"
        />
        <StatCard
          label="Best score"
          value={data.bestScore || '—'}
          icon={<Trophy className="h-5 w-5" />}
          accent="warning"
        />
        <StatCard
          label="Interviews"
          value={data.totals.interviews}
          hint={`${data.totals.completed} completed`}
          icon={<ListChecks className="h-5 w-5" />}
        />
        <StatCard
          label="Answers evaluated"
          value={data.totals.answers}
          icon={<Activity className="h-5 w-5" />}
        />
        <StatCard
          label="Practice time"
          value={`${data.totals.practiceMinutes}m`}
          icon={<Clock className="h-5 w-5" />}
          accent="neutral"
        />
        <StatCard
          label="In progress"
          value={data.totals.inProgress}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="neutral"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Score trend</CardTitle>
            <CardDescription>Overall score across your recent interviews.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.scoreTrend.length > 1 ? (
              <ScoreTrendChart data={data.scoreTrend} />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Complete a couple more interviews to see your trend.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skill breakdown</CardTitle>
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
          <CardHeader>
            <CardTitle className="text-base">Performance by category</CardTitle>
            <CardDescription>How you do on technical, HR and behavioral questions.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.categoryPerformance.length > 0 ? (
              <CategoryBars data={data.categoryPerformance} />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No category data yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
