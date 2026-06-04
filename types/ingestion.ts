export type IngestionSourceType = 'blog_url' | 'pdf';

// POST /api/ingestion
// multipart/form-data fields:
//   sourceType: IngestionSourceType
//   url?:       string   (blog_url only)
//   file?:      File     (pdf only)

export interface IngestionJobResponse {
  jobId: string;
}
