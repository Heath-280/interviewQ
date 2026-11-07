import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Download,
  FileDown,
  Lightbulb,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { interviewApi, getErrorMessage } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { formatDate, formatDuration } from '@/lib/format';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ScoreRing, ScorePill } from '@/components/common/Score';
import { ErrorState } from '@/components/common/States';
import { InlineLoader } from '@/components/common/Loading';
import { FeedbackPanel } from '@/components/interviews/FeedbackPanel';
import { SkillBars } from '@/components/charts/SkillBars';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Interview, QuestionFeedback } from '@/types';

function InsightsList({
  title,
  items,
  variant,
}: {
  title: string;
  items: string[];
  variant: 'positive' | 'negative' | 'neutral';
}) {
  if (!items || items.length === 0) return null;
  const Icon = variant === 'positive' ? ThumbsUp : variant === 'negative' ? ThumbsDown : Lightbulb;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2 text-sm text-muted-foreground">
              <Icon
                className={
                  variant === 'positive'
                    ? 'mt-0.5 h-4 w-4 shrink-0 text-success'
                    : variant === 'negative'
                      ? 'mt-0.5 h-4 w-4 shrink-0 text-destructive'
                      : 'mt-0.5 h-4 w-4 shrink-0 text-primary'
                }
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ReviewItem({
  index,
  category,
  question,
  answer,
  feedback,
  followUps,
}: {
  index: number;
  category: string;
  question: string;
  answer: string;
  feedback?: QuestionFeedback;
  followUps: { _id: string; question: string; answer: string; feedback?: QuestionFeedback }[];
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
              {index}
            </span>
            <Badge variant="secondary" className="capitalize">
              {category}
            </Badge>
          </div>
          {feedback ? <ScorePill score={feedback.score} /> : null}
        </div>

        <p className="font-medium">{question}</p>

        <div className="rounded-lg border bg-muted/40 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your answer
          </p>
          <p className="whitespace-pre-wrap text-sm">{answer || '—'}</p>
        </div>

        {feedback ? <FeedbackPanel feedback={feedback} /> : null}

        {followUps.map((followUp) => (
          <div key={followUp._id} className="rounded-xl border border-dashed p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">
              Follow-up
            </p>
            <p className="text-sm font-medium">{followUp.question}</p>
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">
              {followUp.answer || '—'}
            </p>
            {followUp.feedback ? (
              <FeedbackPanel feedback={followUp.feedback} className="mt-3" />
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function InterviewDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: interview, loading, error, reload } = useAsyncData<Interview>(
    () => interviewApi.get(id as string),
    [id],
  );
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (interview && interview.status !== 'completed') {
      navigate(`/interviews/${interview._id}`, { replace: true });
    }
  }, [interview, navigate]);

  const handleDownload = async () => {
    if (!id) return;
    setDownloading(true);
    try {
      await interviewApi.downloadReport(id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <InlineLoader label="Loading report…" />;

  if (error || !interview) {
    return <ErrorState description={error ?? undefined} onRetry={reload} />;
  }

  if (interview.status !== 'completed') {
    return <InlineLoader label="Redirecting…" />;
  }

  const answered = interview.questions.filter((q) => q.userAnswer);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/interviews" aria-label="Back to interviews">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{interview.role}</h1>
              <StatusBadge status={interview.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {interview.company ? `${interview.company} · ` : ''}
              <span className="capitalize">{interview.type}</span> ·{' '}
              {formatDate(interview.completedAt ?? interview.createdAt)}
              {interview.durationSeconds ? ` · ${formatDuration(interview.durationSeconds)}` : ''}
            </p>
          </div>
        </div>
        <Button onClick={handleDownload} disabled={downloading}>
          {downloading ? (
            <FileDown className="h-4 w-4 animate-pulse" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Download PDF
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center gap-5 p-6">
            <ScoreRing score={interview.overallScore} size={148} />
            <div className="w-full">
              <SkillBars scores={interview.skillScores} />
            </div>
            <Separator />
            <div className="grid w-full grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-2xl font-bold">{answered.length}</p>
                <p className="text-xs text-muted-foreground">Answered</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-2xl font-bold">
                  {interview.generationSource === 'ai' ? 'AI' : 'Template'}
                </p>
                <p className="text-xs text-muted-foreground">Source</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {interview.summary ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{interview.summary}</p>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2">
            <InsightsList title="Strengths" items={interview.strengths} variant="positive" />
            <InsightsList title="Areas to improve" items={interview.weaknesses} variant="negative" />
          </div>

          <InsightsList
            title="Recommendations"
            items={interview.recommendations}
            variant="neutral"
          />
        </div>
      </div>

      <div className="mt-8">
        <Tabs defaultValue="review">
          <TabsList>
            <TabsTrigger value="review">Question review</TabsTrigger>
          </TabsList>
          <TabsContent value="review" className="mt-4 space-y-4">
            {interview.questions.map((q, index) => (
              <ReviewItem
                key={q._id}
                index={index + 1}
                category={q.category}
                question={q.question}
                answer={q.userAnswer}
                feedback={q.feedback}
                followUps={q.followUps}
              />
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
