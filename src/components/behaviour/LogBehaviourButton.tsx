'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogBehaviourDialog } from '@/components/behaviour/LogBehaviourDialog';
import { useBehaviourActions, type LogBehaviourInput } from '@/hooks/useBehaviour';
import { useModule } from '@/hooks/useModule';

interface Props {
  learner: { id: string; name: string };
  source: LogBehaviourInput['source'];
  /** An icon button in a row, or a full button (the profile). */
  variant?: 'icon' | 'full';
  onLogged?: () => void;
}

/** Log behaviour for one learner, wherever their name is: roster, register, profile. */
export function LogBehaviourButton({ learner, source, variant = 'icon', onLogged }: Props) {
  const { isModuleEnabled } = useModule();
  const actions = useBehaviourActions();
  const [open, setOpen] = useState(false);
  // The behaviour log sits behind the attendance module, like the Discipline and Merits it replaces.
  if (!isModuleEnabled('attendance') || !learner.id) return null;

  const log = async (input: LogBehaviourInput): Promise<void> => {
    if (await actions.log(input)) {
      setOpen(false);
      onLogged?.();
    }
  };

  return (
    <>
      {variant === 'icon' ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => { actions.clearLogError(); setOpen(true); }}
          aria-label={`Log behaviour for ${learner.name}`}
          title="Log behaviour"
          className="h-11 w-11 shrink-0 sm:h-8 sm:w-8"
        >
          <Shield className="h-4 w-4" aria-hidden />
        </Button>
      ) : (
        <Button variant="outline" onClick={() => { actions.clearLogError(); setOpen(true); }} className="min-h-11 w-full gap-1.5 sm:min-h-9 sm:w-auto">
          <Shield className="h-4 w-4" aria-hidden /> Log behaviour
        </Button>
      )}
      {open ? (
        <LogBehaviourDialog
          open
          onOpenChange={setOpen}
          learners={[]}
          learner={learner}
          source={source}
          saving={actions.logging}
          error={actions.logError}
          onLog={(input) => void log(input)}
        />
      ) : null}
    </>
  );
}
