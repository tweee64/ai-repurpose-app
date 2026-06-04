import { prisma } from '@/lib/prisma';
import { scrapeBlogUrl } from '@/lib/blog-scraper';
import { parsePdf } from '@/lib/pdf-parser';

/**
 * Fire-and-forget ingestion pipeline for blog URL and PDF jobs.
 *
 * Mirrors the pattern in lib/queue/transcription-worker.ts.
 * Updates TranscriptionJob.status at each stage so the polling endpoint
 * can report progress to the client.
 *
 * @param jobId  - ID of the TranscriptionJob record
 * @param pdfBuffer - Raw PDF bytes (only required for sourceType === 'pdf')
 */
export async function runIngestionJob(
  jobId: string,
  pdfBuffer?: Buffer,
): Promise<void> {
  try {
    const job = await prisma.transcriptionJob.findUnique({ where: { id: jobId } });
    if (!job) {
      console.error(`[ingestion-worker] Job ${jobId} not found`);
      return;
    }

    await prisma.transcriptionJob.update({
      where: { id: jobId },
      data: { status: 'processing' },
    });

    let text: string;

    if (job.sourceType === 'blog_url') {
      if (!job.sourceUrl) {
        throw new Error('sourceUrl is required for blog_url jobs');
      }
      const article = await scrapeBlogUrl(job.sourceUrl);
      text = article.text;
    } else if (job.sourceType === 'pdf') {
      if (!pdfBuffer) {
        throw new Error('pdfBuffer is required for pdf jobs');
      }
      text = await parsePdf(pdfBuffer);
    } else {
      throw new Error(`Unsupported sourceType: ${job.sourceType}`);
    }

    await prisma.$transaction([
      prisma.transcript.create({
        data: { jobId, text },
      }),
      prisma.transcriptionJob.update({
        where: { id: jobId },
        data: { status: 'completed' },
      }),
    ]);

    console.log(`[ingestion-worker] Job ${jobId} completed successfully`);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred during ingestion';

    console.error(`[ingestion-worker] Job ${jobId} failed:`, err);

    try {
      await prisma.transcriptionJob.update({
        where: { id: jobId },
        data: { status: 'failed', errorMessage: message },
      });
    } catch (updateErr) {
      console.error(
        `[ingestion-worker] Failed to update job ${jobId} status to failed:`,
        updateErr,
      );
    }
  }
}
