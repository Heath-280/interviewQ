import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ListChecks, PlusCircle, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { interviewApi, getErrorMessage } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState, ErrorState } from '@/components/common/States';
import { InlineLoader } from '@/components/common/Loading';
import { InterviewRow, toListItem } from '@/components/interviews/InterviewRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Interview } from '@/types';

const STATUSES = ['all', 'in_progress', 'completed', 'created'];
const TYPES = ['all', 'mixed', 'technical', 'hr', 'behavioral'];

export default function InterviewHistory() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [type, setType] = useState('all');
  const [search, setSearch] = useState('');
  const [toDelete, setToDelete] = useState<Interview | null>(null);
  const [deleting, setDeleting] = useState(false);
  const debouncedSearch = useDebounce(search, 350);

  const { data, loading, error, reload, setData } = useAsyncData(
    () =>
      interviewApi.list({
        page,
        limit: 10,
        status: status === 'all' ? undefined : status,
        type: type === 'all' ? undefined : type,
        search: debouncedSearch.trim() || undefined,
      }),
    [page, status, type, debouncedSearch],
  );

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await interviewApi.remove(toDelete._id);
      toast.success('Interview deleted');
      setToDelete(null);
      if (data && data.items.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else if (data) {
        setData({
          ...data,
          items: data.items.filter((i) => i._id !== toDelete._id),
          pagination: { ...data.pagination, total: data.pagination.total - 1 },
        });
      } else {
        reload();
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const resetFilters = () => {
    setStatus('all');
    setType('all');
    setSearch('');
    setPage(1);
  };

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <>
      <PageHeader
        title="Interviews"
        description="Every practice session, in one place."
        actions={
          <Button asChild>
            <Link to="/interviews/new">
              <PlusCircle className="h-4 w-4" />
              New interview
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by role or company…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {value === 'all' ? 'All statuses' : value.replace('_', ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {value === 'all' ? 'All types' : value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <InlineLoader label="Loading interviews…" />
      ) : error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-6 w-6" />}
          title="No interviews found"
          description={
            search || status !== 'all' || type !== 'all'
              ? 'Try adjusting your filters.'
              : 'Create your first mock interview to get started.'
          }
          action={
            search || status !== 'all' || type !== 'all' ? (
              <Button variant="outline" onClick={resetFilters}>
                Clear filters
              </Button>
            ) : (
              <Button asChild>
                <Link to="/interviews/new">
                  <PlusCircle className="h-4 w-4" />
                  New interview
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((interview) => (
              <div key={interview._id} className="group relative">
                <InterviewRow interview={toListItem(interview)} />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={() => setToDelete(interview)}
                  aria-label="Delete interview"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasPrevPage}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this interview?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the interview, its answers and feedback. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
