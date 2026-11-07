import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Download,
  FileText,
  Loader2,
  Star,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { resumeApi, getErrorMessage } from '@/lib/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { formatDate, formatFileSize } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState, ErrorState } from '@/components/common/States';
import { CardSkeleton } from '@/components/common/Loading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
import type { Resume } from '@/types';

const ACCEPT = '.pdf,.docx,.txt';

export default function Resumes() {
  const { data, loading, error, reload } = useAsyncData(() => resumeApi.list({ limit: 100 }));
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [toDelete, setToDelete] = useState<Resume | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const resumes = data?.items ?? [];

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    const isPrimary = resumes.length === 0;
    setUploading(true);
    setProgress(0);
    try {
      await resumeApi.upload(file, isPrimary, setProgress);
      toast.success('Resume uploaded');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleSetPrimary = async (resume: Resume) => {
    setBusyId(resume._id);
    try {
      await resumeApi.setPrimary(resume._id);
      toast.success('Primary resume updated');
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (resume: Resume) => {
    try {
      await resumeApi.download(resume._id, resume.originalName);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setBusyId(toDelete._id);
    try {
      await resumeApi.remove(toDelete._id);
      toast.success('Resume deleted');
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Resumes"
        description="Upload resumes to personalize your interview questions."
      />

      <Card
        className={cn(
          'mb-6 border-dashed transition-colors',
          dragging ? 'border-primary bg-primary/5' : '',
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <CardContent className="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <UploadCloud className="h-6 w-6" />
            )}
          </div>
          <div>
            <p className="font-medium">
              {uploading ? 'Uploading & extracting…' : 'Drop your resume here'}
            </p>
            <p className="text-sm text-muted-foreground">
              PDF, DOCX or TXT · up to 5 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            Choose file
          </Button>
          {uploading ? <Progress value={progress} className="max-w-xs" /> : null}
        </CardContent>
      </Card>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <ErrorState description={error} onRetry={reload} />
      ) : resumes.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title="No resumes yet"
          description="Upload a resume to get personalized, experience-aware interview questions."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {resumes.map((resume) => (
            <Card key={resume._id}>
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium" title={resume.originalName}>
                        {resume.originalName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(resume.size)} · {resume.wordCount} words ·{' '}
                        {formatDate(resume.createdAt)}
                      </p>
                    </div>
                  </div>
                  {resume.isPrimary ? (
                    <Badge className="shrink-0 bg-primary/10 text-primary" variant="secondary">
                      Primary
                    </Badge>
                  ) : null}
                </div>

                {resume.skills.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {resume.skills.slice(0, 8).map((skill) => (
                      <Badge key={skill} variant="secondary" className="font-normal">
                        {skill}
                      </Badge>
                    ))}
                    {resume.skills.length > 8 ? (
                      <Badge variant="secondary" className="font-normal">
                        +{resume.skills.length - 8}
                      </Badge>
                    ) : null}
                  </div>
                ) : null}

                {resume.summary ? (
                  <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                    {resume.summary}
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  {!resume.isPrimary ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetPrimary(resume)}
                      disabled={busyId === resume._id}
                    >
                      <Star className="h-4 w-4" />
                      Set primary
                    </Button>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(resume)}>
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setToDelete(resume)}
                    disabled={busyId === resume._id}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this resume?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the resume and its extracted text. Interviews already created are not
              affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busyId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={!!busyId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busyId ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
