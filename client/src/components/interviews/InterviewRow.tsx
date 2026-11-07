import { Link } from 'react-router-dom';
import { ArrowRight, Building2 } from 'lucide-react';
import type { Interview, InterviewStatus, InterviewType } from '@/types';
import { formatRelative } from '@/lib/format';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ScorePill } from '@/components/common/Score';
import { Button } from '@/components/ui/button';

export interface InterviewListItem {
  _id: string;
  role: string;
  company: string;
  status: InterviewStatus;
  type: InterviewType;
  overallScore: number;
  createdAt: string;
  answeredCount?: number;
  totalCount?: number;
}

export function toListItem(interview: Interview): InterviewListItem {
  return {
    _id: interview._id,
    role: interview.role,
    company: interview.company,
    status: interview.status,
    type: interview.type,
    overallScore: interview.overallScore,
    createdAt: interview.createdAt,
    answeredCount: interview.questions.filter((q) => q.status === 'evaluated').length,
    totalCount: interview.questions.length,
  };
}

export function InterviewRow({ interview }: { interview: InterviewListItem }) {
  const isCompleted = interview.status === 'completed';

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={isCompleted ? `/interviews/${interview._id}/report` : `/interviews/${interview._id}`}
            className="truncate font-semibold hover:text-primary"
          >
            {interview.role || 'Untitled role'}
          </Link>
          <StatusBadge status={interview.status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {interview.company ? (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {interview.company}
            </span>
          ) : null}
          <span className="capitalize">{interview.type}</span>
          <span>{formatRelative(interview.createdAt)}</span>
          {!isCompleted && interview.totalCount ? (
            <span>
              {interview.answeredCount ?? 0}/{interview.totalCount} answered
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isCompleted ? <ScorePill score={interview.overallScore} /> : null}
        <Button asChild variant={isCompleted ? 'outline' : 'default'} size="sm">
          <Link
            to={isCompleted ? `/interviews/${interview._id}/report` : `/interviews/${interview._id}`}
          >
            {isCompleted ? 'View report' : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
