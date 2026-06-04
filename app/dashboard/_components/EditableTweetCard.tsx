'use client';

import type { Tweet } from '@/types/repurpose';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const TWEET_LIMIT = 280;

interface EditableTweetCardProps {
  tweet: Tweet;
  isEditing: boolean;
  onChange: (index: number, text: string) => void;
}

export function EditableTweetCard({ tweet, isEditing, onChange }: EditableTweetCardProps) {
  const charCount = tweet.text.length;
  const isOverLimit = charCount > TWEET_LIMIT;

  return (
    <div className="px-5 py-4 flex flex-col gap-2">
      <div className="flex items-start gap-3">
        <Badge variant="secondary" className="font-mono shrink-0 mt-0.5">
          {tweet.index}/
        </Badge>
        {isEditing ? (
          <Textarea
            value={tweet.text}
            onChange={(e) => onChange(tweet.index, e.target.value)}
            className="w-full min-h-[80px] resize-y flex-1 text-sm leading-relaxed"
            aria-label={`Tweet ${tweet.index} text`}
          />
        ) : (
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap flex-1">
            {tweet.text}
          </p>
        )}
      </div>
      <p
        className={cn(
          'text-xs text-right',
          isOverLimit ? 'text-destructive font-medium' : 'text-muted-foreground'
        )}
        aria-label={`${charCount} of ${TWEET_LIMIT} characters`}
      >
        {charCount} / {TWEET_LIMIT}
      </p>
    </div>
  );
}
