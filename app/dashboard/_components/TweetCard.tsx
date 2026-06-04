'use client';

import type { Tweet } from '@/types/repurpose';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TweetCardProps {
  tweet: Tweet;
}

export function TweetCard({ tweet }: TweetCardProps) {
  const charCount = tweet.text.length;
  const isOverLimit = charCount > 280;

  return (
    <div className="px-5 py-4 flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <Badge variant="secondary" className="font-mono shrink-0 mt-0.5">
          {tweet.index}/
        </Badge>
        <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap flex-1">
          {tweet.text}
        </p>
      </div>
      <p
        className={cn(
          'text-xs text-right',
          isOverLimit
            ? 'text-destructive font-medium'
            : 'text-muted-foreground'
        )}
        aria-label={`${charCount} of 280 characters`}
      >
        {charCount} / 280
      </p>
    </div>
  );
}
