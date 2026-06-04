import { prisma } from '@/lib/prisma';
import { downloadAudio } from '@/lib/ytdlp';
import { transcribeAudio } from '@/lib/whisper';
import { deleteTempFile } from '@/lib/storage';

/**
 * End-to-end transcription pipeline.
 *
 * This function is intended to be called fire-and-forget from the POST API
 * route. It updates the job status in the database at each stage so the
 * polling endpoint can report progress to the client.
 *
 * For production scale, replace this with a proper job queue (e.g. BullMQ).
 */
export async function runTranscriptionJob(jobId: string): Promise<void> {
  let audioFilePath: string | null = null;

  try {
    // Fetch the job to get the YouTube URL
    const job = await prisma.transcriptionJob.findUnique({ where: { id: jobId } });
    if (!job) {
      console.error(`[worker] Job ${jobId} not found`);
      return;
    }

    // ── Stage 1: Download audio ────────────────────────────────────────────
    await prisma.transcriptionJob.update({
      where: { id: jobId },
      data: { status: 'downloading' },
    });

    const { filePath } = await downloadAudio(job.sourceUrl!, jobId);
    audioFilePath = filePath;

    // ── Stage 2: Transcribe with Whisper ───────────────────────────────────
    await prisma.transcriptionJob.update({
      where: { id: jobId },
      data: { status: 'transcribing' },
    });

    const transcriptText = await transcribeAudio(audioFilePath);

    // ── Stage 3: Persist transcript and mark completed ─────────────────────
    await prisma.$transaction([
      prisma.transcript.create({
        data: {
          jobId,
          text: transcriptText,
        },
      }),
      prisma.transcriptionJob.update({
        where: { id: jobId },
        data: { status: 'completed' },
      }),
    ]);

    console.log(`[worker] Job ${jobId} completed successfully`);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred during transcription';

    console.error(`[worker] Job ${jobId} failed:`, err);

    // Mark job as failed — best-effort; don't throw if this update fails
    try {
      await prisma.transcriptionJob.update({
        where: { id: jobId },
        data: { status: 'failed', errorMessage: message },
      });
    } catch (updateErr) {
      console.error(`[worker] Failed to update job ${jobId} status to failed:`, updateErr);
    }
  } finally {
    // Always delete the temp audio file to prevent disk exhaustion
    if (audioFilePath) {
      await deleteTempFile(audioFilePath);
    }
  }
}
