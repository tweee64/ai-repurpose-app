'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TranscriptDisplayProps {
  transcript: string;
}

export function TranscriptDisplay({ transcript }: TranscriptDisplayProps) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-green-500 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Transcript Ready
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea
          className="max-h-[60vh] sm:max-h-[40vh] md:max-h-[60vh]"
          tabIndex={0}
          aria-label="Transcript text"
        >
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap pr-3">
            {transcript}
          </p>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
