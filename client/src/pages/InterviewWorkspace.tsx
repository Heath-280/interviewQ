import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Flag,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';
import { interviewApi, getErrorMessage } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ScorePill } from '@/components/common/Score';
import { ErrorState, EmptyState } from '@/components/common/States';
import { InlineLoader } from '@/components/common/Loading';
import { FeedbackPanel } from '@/components/interviews/FeedbackPanel';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Interview } from '@/types';

const CATEGORY_STYLES: Record<string, string> = {
  technical: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  behavioral: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  hr: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

export default function InterviewWorkspace() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: interview, loading, error, reload, setData } = useAsyncData<Interview>(
    () => interviewApi.get(id as string),
    [id],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [answer, setAnswer] = useState('');
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [requestingFollowUp, setRequestingFollowUp] = useState(false);
  const [answeringFollowUp, setAnsweringFollowUp] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (interview && !initialized) {
      setActiveIndex(interview.currentQuestionIndex);
      setInitialized(true);
    }
  }, [interview, initialized]);

  useEffect(() => {
    if (interview?.status === 'completed') {
      navigate(`/interviews/${interview._id}/report`, { replace: true });
    }
  }, [interview, navigate]);

  useEffect(() => {
    setAnswer('');
  }, [activeIndex]);

  const questions = useMemo(() => interview?.questions ?? [], [interview]);
  const current = questions[activeIndex];

  const { answeredCount, pendingIndexes } = useMemo(() => {
    const pending: number[] = [];
    let answered = 0;
    questions.forEach((q, index) => {
      if (q.status === 'pending') pending.push(index);
      else answered += 1;
    });
    return { answeredCount: answered, pendingIndexes: pending };
  }, [questions]);

  const total = questions.length;
  const progress = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const noMorePending = pendingIndexes.length === 0;

  const applyInterview = (updated: Interview) => {
    setData(updated);
  };

  const handleSubmitAnswer = async () => {
    if (!id || !current || !answer.trim()) return;
    setSubmittingAnswer(true);
    try {
      const res = await interviewApi.submitAnswer(id, current._id, answer.trim());
      applyInterview(res.interview);
      if (res.warning) toast.warning(res.warning);
      setAnswer('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleRequestFollowUp = async () => {
    if (!id || !current) return;
    setRequestingFollowUp(true);
    try {
      const res = await interviewApi.requestFollowUp(id, current._id);
      applyInterview(res.interview);
      if (res.warning) toast.warning(res.warning);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRequestingFollowUp(false);
    }
  };

  const handleAnswerFollowUp = async (followUpId: string) => {
    const text = (followUpAnswers[followUpId] ?? '').trim();
    if (!id || !current || !text) return;
    setAnsweringFollowUp(followUpId);
    try {
      const res = await interviewApi.answerFollowUp(id, current._id, followUpId, text);
      applyInterview(res.interview);
      if (res.warning) toast.warning(res.warning);
      setFollowUpAnswers((prev) => ({ ...prev, [followUpId]: '' }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setAnsweringFollowUp(null);
    }
  };

  const goNext = () => {
    const ahead = pendingIndexes.find((i) => i > activeIndex);
    const target = ahead ?? pendingIndexes[0] ?? Math.min(activeIndex + 1, total - 1);
    setActiveIndex(target);
  };

  const goPrev = () => setActiveIndex((i) => Math.max(0, i - 1));

  const handleComplete = async () => {
    if (!id) return;
    setCompleting(true);
    try {
      const res = await interviewApi.complete(id);
      if (res.warning) toast.warning(res.warning);
      toast.success('Interview complete');
      navigate(`/interviews/${id}/report`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <InlineLoader label="Loading interview…" />;

  if (error || !interview) {
    return <ErrorState description={error ?? undefined} onRetry={reload} />;
  }

  if (questions.length === 0) {
    return (
      <EmptyState
        title="No questions in this interview"
        description="This interview has no questions. Try creating a new one."
        action={<Button onClick={() => navigate('/interviews/new')}>New interview</Button>}
      />
    );
  }

  const isPending = current?.status === 'pending';

  return (
    <>
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-bold">{interview.role}</h1>
              <StatusBadge status={interview.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {interview.company ? `${interview.company} · ` : ''}
              <span className="capitalize">{interview.type}</span> ·{' '}
              <span className="capitalize">{interview.difficulty}</span> · started{' '}
              {formatDate(interview.startedAt ?? interview.createdAt)}
            </p>
          </div>
          <Button onClick={handleComplete} disabled={completing || answeredCount === 0}>
            {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
            Finish & report
          </Button>
        </CardContent>
        <div className="border-t px-5 py-3">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {answeredCount} of {total} answered
            </span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Question {activeIndex + 1} of {total}
                  </span>
                  <Badge
                    variant="secondary"
                    className={CATEGORY_STYLES[current.category] ?? ''}
                  >
                    {current.category}
                  </Badge>
                </div>
                {current.status === 'evaluated' && current.feedback ? (
                  <ScorePill score={current.feedback.score} />
                ) : null}
              </div>

              <p className="text-lg font-medium leading-relaxed">{current.question}</p>

              {isPending ? (
                <div className="mt-6 space-y-3">
                  <Textarea
                    rows={7}
                    placeholder="Type your answer here. Be specific and use examples where possible…"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={submittingAnswer}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {answer.trim().length} characters
                    </span>
                    <Button
                      onClick={handleSubmitAnswer}
                      disabled={submittingAnswer || !answer.trim()}
                    >
                      {submittingAnswer ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {submittingAnswer ? 'Evaluating…' : 'Submit answer'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 space-y-5">
                  <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Your answer
                    </p>
                    <p className="whitespace-pre-wrap text-sm">{current.userAnswer || '—'}</p>
                  </div>

                  {current.feedback ? <FeedbackPanel feedback={current.feedback} /> : null}

                  {current.followUps.map((followUp) => (
                    <div key={followUp._id} className="rounded-xl border border-dashed p-4">
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                        <CornerDownRight className="h-3.5 w-3.5" />
                        Follow-up
                      </p>
                      <p className="text-sm font-medium">{followUp.question}</p>

                      {followUp.answer ? (
                        <div className="mt-3 space-y-3">
                          <div className="rounded-lg bg-muted/40 p-3">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Your answer
                            </p>
                            <p className="whitespace-pre-wrap text-sm">{followUp.answer}</p>
                          </div>
                          {followUp.feedback ? (
                            <FeedbackPanel feedback={followUp.feedback} />
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          <Textarea
                            rows={4}
                            placeholder="Answer the follow-up…"
                            value={followUpAnswers[followUp._id] ?? ''}
                            onChange={(e) =>
                              setFollowUpAnswers((prev) => ({
                                ...prev,
                                [followUp._id]: e.target.value,
                              }))
                            }
                            disabled={answeringFollowUp === followUp._id}
                          />
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleAnswerFollowUp(followUp._id)}
                              disabled={
                                answeringFollowUp === followUp._id ||
                                !(followUpAnswers[followUp._id] ?? '').trim()
                              }
                            >
                              {answeringFollowUp === followUp._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                              Submit follow-up
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={handleRequestFollowUp}
                    disabled={requestingFollowUp}
                  >
                    {requestingFollowUp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {requestingFollowUp ? 'Generating…' : 'Ask a follow-up question'}
                  </Button>

                  <div className="flex items-center justify-between border-t pt-4">
                    <Button
                      variant="ghost"
                      onClick={goPrev}
                      disabled={activeIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    {noMorePending && activeIndex === total - 1 ? (
                      <Button onClick={handleComplete} disabled={completing}>
                        {completing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Flag className="h-4 w-4" />
                        )}
                        Finish & view report
                      </Button>
                    ) : (
                      <Button onClick={goNext} disabled={activeIndex === total - 1}>
                        Next question
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-3">
          <p className="px-1 text-sm font-semibold">Questions</p>
          <div className="space-y-2">
            {questions.map((q, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={q._id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors',
                    isActive ? 'border-primary bg-primary/5' : 'hover:bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      q.status === 'pending'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-success/10 text-success',
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{q.question}</span>
                  {q.feedback ? <ScorePill score={q.feedback.score} /> : null}
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </>
  );
}
