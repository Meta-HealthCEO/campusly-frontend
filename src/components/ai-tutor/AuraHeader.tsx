'use client';

import {
  History,
  MessageSquarePlus,
  MoreHorizontal,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ConversationList } from './ConversationList';
import { SubjectChip, ModeChip, TopicChip, type TopicOption } from './TutorChips';
import type { Subject, TutorConversationSummary, TutorMode } from '@/types';

export interface AuraModeOption {
  id: TutorMode;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

interface AuraHeaderProps {
  subjects: Subject[];
  effectiveSubjectId: string;
  effectiveSubjectName: string;
  grade: number;
  onSwitchSubject: (id: string) => void;
  topicOptions: TopicOption[];
  selectedTopicId: string;
  selectedTopicTitle: string;
  customTopic: string;
  onSelectTopic: (id: string, title: string) => void;
  onSelectCustomTopic: (title: string) => void;
  onClearTopic: () => void;
  topicsLoading: boolean;
  modeOptions: AuraModeOption[];
  activeMode: TutorMode;
  onSwitchMode: (mode: TutorMode) => void;
  onNewConversation: () => void;
  historyOpen: boolean;
  setHistoryOpen: (open: boolean) => void;
  conversations: TutorConversationSummary[];
  activeConversationId: string | undefined;
  onSelectConversation: (id: string) => void;
  practiceHref: string;
  onNavigate: (href: string) => void;
}

/** Slim toolbar above the Aura chat: brand mark, chips, history + overflow. */
export function AuraHeader({
  subjects, effectiveSubjectId, effectiveSubjectName, grade, onSwitchSubject,
  topicOptions, selectedTopicId, selectedTopicTitle, customTopic,
  onSelectTopic, onSelectCustomTopic, onClearTopic, topicsLoading,
  modeOptions, activeMode, onSwitchMode, onNewConversation,
  historyOpen, setHistoryOpen, conversations, activeConversationId,
  onSelectConversation, practiceHref, onNavigate,
}: AuraHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">Aura</span>
        </div>
        <SubjectChip
          subjects={subjects}
          selectedId={effectiveSubjectId}
          selectedName={effectiveSubjectName}
          grade={grade}
          onSelect={onSwitchSubject}
          disabled={subjects.length === 0}
        />
        <TopicChip
          topics={topicOptions}
          selectedId={selectedTopicId}
          selectedTitle={selectedTopicTitle}
          customTitle={customTopic}
          onSelectTopic={onSelectTopic}
          onSelectCustom={onSelectCustomTopic}
          onClear={onClearTopic}
          disabled={!effectiveSubjectId}
          loading={topicsLoading}
        />
        <ModeChip
          options={modeOptions}
          selectedId={activeMode}
          onSelect={onSwitchMode}
        />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {/* New session — visible on desktop, in overflow on mobile */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onNewConversation}
          className="hidden sm:inline-flex"
          aria-label="New session"
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span className="hidden md:inline">New</span>
        </Button>

        {/* History drawer trigger */}
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetTrigger render={<Button variant="ghost" size="sm" aria-label="History" />}>
            <History className="h-4 w-4" />
            <span className="hidden md:inline">History</span>
          </SheetTrigger>
          <SheetContent side="right" className="w-85 p-0">
            <SheetHeader className="border-b p-4">
              <SheetTitle>Recent sessions</SheetTitle>
            </SheetHeader>
            <ConversationList
              conversations={conversations}
              activeId={activeConversationId}
              onSelect={onSelectConversation}
              onNew={() => {
                onNewConversation();
                setHistoryOpen(false);
              }}
            />
          </SheetContent>
        </Sheet>

        {/* Overflow — mobile-only New + Practice link */}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="sm" aria-label="More" />}>
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={onNewConversation} className="sm:hidden">
              <MessageSquarePlus className="h-4 w-4" />
              New session
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate(practiceHref)}>
              <Target className="h-4 w-4" />
              Practice drill
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate('/student/ai-tutor/practice/history')}>
              <History className="h-4 w-4" />
              Practice history
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
