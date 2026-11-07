import { useState } from 'react';
import { Check, ChevronDown, Lightbulb, MessageSquareQuote, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { QuestionFeedback } from '@/types';
import { cn } from '@/lib/utils';
import { ScorePill } from '@/components/common/Score';

function ListBlock({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  icon: React.ReactNode;
  tone: 'positive' | 'negative';
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p
        className={cn(
          'mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide',
          tone === 'positive' ? 'text-success' : 'text-destructive',
        )}
      >
        {icon}
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FeedbackPanel({
  feedback,
  className,
}: {
  feedback: QuestionFeedback;
  className?: string;
}) {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className={cn('rounded-xl border bg-card', className)}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-2 font-medium">
          <MessageSquareQuote className="h-4 w-4 text-primary" />
          AI feedback
        </div>
        <ScorePill score={feedback.score} />
      </div>

      <div className="space-y-5 p-4">
        {feedback.summary ? (
          <p className="text-sm text-muted-foreground">{feedback.summary}</p>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <ListBlock
            title="Strengths"
            items={feedback.strengths}
            icon={<ThumbsUp className="h-3.5 w-3.5" />}
            tone="positive"
          />
          <ListBlock
            title="Improve"
            items={feedback.weaknesses}
            icon={<ThumbsDown className="h-3.5 w-3.5" />}
            tone="negative"
          />
        </div>

        {feedback.tips && feedback.tips.length > 0 ? (
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Lightbulb className="h-3.5 w-3.5" />
              Tips
            </p>
            <ul className="space-y-1.5">
              {feedback.tips.map((tip, index) => (
                <li key={index} className="flex gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {feedback.suggestedAnswer ? (
          <div className="rounded-lg border bg-muted/40">
            <button
              type="button"
              onClick={() => setShowAnswer((s) => !s)}
              className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium"
            >
              <span>Suggested answer</span>
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', showAnswer && 'rotate-180')}
              />
            </button>
            {showAnswer ? (
              <p className="whitespace-pre-wrap border-t px-3 py-3 text-sm text-muted-foreground">
                {feedback.suggestedAnswer}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
