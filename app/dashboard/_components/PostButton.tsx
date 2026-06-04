'use client';

import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PostNowDialog } from './PostNowDialog';
import type { DraftFormat } from '@/types/repurpose';

interface PostButtonProps {
  draftId: string;
  draftFormat: DraftFormat;
}

export function PostButton({ draftId, draftFormat }: PostButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPosted, setIsPosted] = useState(false);

  if (isPosted) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-600 gap-1">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Posted
      </Badge>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
        <Send className="h-4 w-4 mr-1.5" />
        Post
      </Button>
      <PostNowDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        draftId={draftId}
        draftFormat={draftFormat}
        onPosted={() => {
          setIsPosted(true);
          setIsDialogOpen(false);
        }}
      />
    </>
  );
}
