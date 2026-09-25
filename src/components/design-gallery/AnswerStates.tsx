import { Button } from '@/components/ui/button';
import { AnswerMark } from '@/components/content/renderers/AnswerMark';
import { CHOSEN, answerEdge } from '@/components/content/renderers/answer-state';
import { cn } from '@/lib/utils';
import { Specimen } from './GallerySection';

const OPTION = 'flex items-center gap-3 rounded-lg border p-3 text-sm';

/** Task 17: how a lesson block marks answers (no tints): white surface, 1.5px edge, icon and word. Example text only. */
export function AnswerStates() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Specimen title="Answers in a lesson block">
        <div className="space-y-2">
          <div className={cn(OPTION, answerEdge(true))}>
            <span className="font-medium">A.</span>
            <span>x = 4</span>
            <AnswerMark correct className="ml-auto" />
          </div>
          <div className={cn(OPTION, answerEdge(false))}>
            <span className="font-medium">B.</span>
            <span>x = −4</span>
            <AnswerMark correct={false} className="ml-auto" />
          </div>
          <div className={cn(OPTION, CHOSEN)}>
            <span className="font-medium">C.</span>
            <span>Chosen, not checked yet</span>
          </div>
        </div>
      </Specimen>
      <Specimen title="Result and disabled action">
        <div className={cn('rounded-lg p-3 text-sm text-foreground', answerEdge(false))}>
          <div className="flex items-center gap-2 font-medium">
            <AnswerMark correct={false} className="text-sm" />
            <span className="ml-auto text-xs">Score: 1/3</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button>Check answer</Button>
          <Button disabled>Check answer</Button>
        </div>
      </Specimen>
    </div>
  );
}
