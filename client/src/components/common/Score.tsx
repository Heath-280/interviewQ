import { cn } from '@/lib/utils';
import { scoreLabel, scoreTone } from '@/lib/format';

const toneClasses = {
  success: 'text-success',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-destructive',
};

const strokeTone = {
  success: 'stroke-success',
  warning: 'stroke-amber-500',
  danger: 'stroke-destructive',
};

export function ScoreRing({
  score,
  size = 132,
  showLabel = true,
  className,
}: {
  score: number;
  size?: number;
  showLabel?: boolean;
  className?: string;
}) {
  const tone = scoreTone(score);
  const radius = (size - 14) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={10}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(strokeTone[tone], 'transition-all duration-700')}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-3xl font-bold tabular-nums', toneClasses[tone])}>{score}</span>
        {showLabel ? (
          <span className="text-xs font-medium text-muted-foreground">{scoreLabel(score)}</span>
        ) : null}
      </div>
    </div>
  );
}

export function ScorePill({ score, className }: { score: number; className?: string }) {
  const tone = scoreTone(score);
  const bg = {
    success: 'bg-success/10 text-success',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-destructive/10 text-destructive',
  }[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
        bg,
        className,
      )}
    >
      {score}
    </span>
  );
}
