export type GenerationStatus = 'idle' | 'generating' | 'streaming' | 'completed' | 'error';
export type DraftFormat = 'twitter_thread' | 'linkedin_post' | 'blog_post';

export interface Tweet {
  index: number;
  text: string;
}

export interface TwitterThreadContent {
  tweets: Tweet[];
}

export interface Draft {
  id: string;
  userId: string;
  transcriptId: string;
  format: DraftFormat;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// POST /api/repurpose/twitter-thread
export interface GenerateTwitterThreadRequest {
  transcriptId: string;
}

export interface GenerateTwitterThreadResponse {
  draft: Draft;
  tweets: Tweet[];
}

export interface GenerationErrorResponse {
  error: string;
  code: string;
}

export interface LinkedInPostContent {
  post: string;
}

// POST /api/repurpose/linkedin-post
export interface GenerateLinkedInPostRequest {
  transcriptId: string;
}

export interface GenerateLinkedInPostResponse {
  draft: Draft;
  post: string;
}

// SSE event shapes (client-side parsing)
export interface SseDeltaEvent {
  type: 'delta';
  text: string;
}

export interface SseTweetEvent {
  type: 'tweet';
  index: number;
  text: string;
}

export interface SseDoneEvent {
  type: 'done';
  draftId: string;
}

export interface SseErrorEvent {
  type: 'error';
  message: string;
  code: string;
}

export type SseEvent = SseDeltaEvent | SseTweetEvent | SseDoneEvent | SseErrorEvent;

export interface TwitterStreamState {
  generationStatus: GenerationStatus;
  partialTweets: Tweet[];
  currentTweetText: string;
  tweets: Tweet[];
  draftId: string | null;
  errorMessage: string | null;
}

export interface LinkedInStreamState {
  generationStatus: GenerationStatus;
  streamingText: string;
  post: string | null;
  draftId: string | null;
  errorMessage: string | null;
}

// PUT /api/drafts/[draftId]
export interface UpdateDraftRequest {
  content: string;
}

export interface UpdateDraftResponse {
  draft: Draft;
}

export interface BlogPostContent {
  post: string;
}

// POST /api/repurpose/blog-post
export interface GenerateBlogPostRequest {
  transcriptId: string;
}

export interface GenerateBlogPostResponse {
  draft: Draft;
  post: string;
}

export interface BlogPostStreamState {
  generationStatus: GenerationStatus;
  streamingText: string;
  post: string | null;
  draftId: string | null;
  errorMessage: string | null;
}

// Schedule Draft for Publishing
export interface ScheduleDraftRequest {
  scheduledFor: string; // ISO 8601 UTC string
}

export interface ScheduleDraftResponse {
  draftId: string;
  scheduledFor: string; // ISO 8601 echo of the requested time
}
