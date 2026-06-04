export type JobStatus =
  | 'pending'
  | 'downloading'
  | 'transcribing'
  | 'processing'
  | 'completed'
  | 'failed';

/** Client-side UI state — extends JobStatus with pre-submission stages */
export type UIJobStatus = JobStatus | 'idle' | 'submitting';

export interface TranscriptionJob {
  id: string;
  userId: string;
  sourceType: 'youtube' | 'blog_url' | 'pdf';
  sourceUrl: string | null;
  fileName: string | null;
  status: JobStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Transcript {
  id: string;
  jobId: string;
  text: string;
  createdAt: string;
}

// POST /api/transcription
export interface SubmitUrlRequest {
  url: string;
}

export interface SubmitUrlResponse {
  jobId: string;
}

// GET /api/transcription/[jobId]
export interface JobStatusResponse {
  job: TranscriptionJob;
  transcript: Transcript | null;
}

export interface ApiErrorResponse {
  error: string;
  code: string;
}
