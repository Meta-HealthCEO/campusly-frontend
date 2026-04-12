'use client';

import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { LessonTypeBadge } from './LessonTypeBadge';
import { GripVertical, Plus, Trash2, Check, X, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CourseTree, CourseLesson } from '@/types';

type ReorderLessonOrders = { id: string; moduleId: string; orderIndex: number }[];
type ReorderModuleOrders = { id: string; orderIndex: number }[];

interface CourseBuilderOutlineProps {
  course: CourseTree;
  selectedLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  onAddModule: (title: string) => Promise<void>;
  onRenameModule: (moduleId: string, title: string) => Promise<void>;
  onDeleteModule: (moduleId: string) => Promise<void>;
  onReorderModules: (orders: ReorderModuleOrders) => Promise<void>;
  onAddLesson: (moduleId: string) => void;
  onDeleteLesson: (lessonId: string) => Promise<void>;
  onReorderLessons: (orders: ReorderLessonOrders) => Promise<void>;
  readOnly: boolean;
}

/**
 * The three-panel course builder's LEFT panel. Shows modules + lessons
 * with drag-and-drop reordering, inline module rename, and delete
 * confirmation dialogs. Disabled when `readOnly` (course is not draft).
 */
export function CourseBuilderOutline(props: CourseBuilderOutlineProps) {
  const { course, selectedLessonId, onSelectLesson, onAddModule, onRenameModule, onDeleteModule, onReorderModules, onAddLesson, onDeleteLesson, onReorderLessons, readOnly } = props;
  const [addingModule, setAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [pendingDeleteModule, setPendingDeleteModule] = useState<string | null>(null);
  const [pendingDeleteLesson, setPendingDeleteLesson] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleModuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = course.modules.findIndex((m) => m.id === active.id);
    const newIndex = course.modules.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...course.modules];
    const [moved] = reordered.splice(oldIndex, 1);
    if (moved) reordered.splice(newIndex, 0, moved);
    void onReorderModules(reordered.map((m, i) => ({ id: m.id, orderIndex: i })));
  };

  const handleSaveNewModule = async () => {
    const title = newModuleTitle.trim();
    if (!title) return;
    await onAddModule(title);
    setNewModuleTitle('');
    setAddingModule(false);
  };

  const cancelAddModule = () => { setAddingModule(false); setNewModuleTitle(''); };

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
        <SortableContext items={course.modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          {course.modules.map((module) => (
            <SortableModule
              key={module.id}
              module={module}
              selectedLessonId={selectedLessonId}
              onSelectLesson={onSelectLesson}
              onRenameModule={onRenameModule}
              onRequestDeleteModule={() => setPendingDeleteModule(module.id)}
              onAddLesson={() => onAddLesson(module.id)}
              onRequestDeleteLesson={(id) => setPendingDeleteLesson(id)}
              onReorderLessons={onReorderLessons}
              readOnly={readOnly}
            />
          ))}
        </SortableContext>
      </DndContext>

      {!readOnly && (addingModule ? (
        <div className="flex items-center gap-1">
          <Input
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSaveNewModule();
              if (e.key === 'Escape') cancelAddModule();
            }}
            placeholder="Module title"
            autoFocus
            className="h-8 text-sm"
          />
          <Button size="icon-sm" onClick={handleSaveNewModule} aria-label="Save module">
            <Check className="h-4 w-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={cancelAddModule} aria-label="Cancel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="w-full" onClick={() => setAddingModule(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Module
        </Button>
      ))}

      <ConfirmDialog
        open={pendingDeleteModule !== null}
        onOpenChange={(v) => { if (!v) setPendingDeleteModule(null); }}
        title="Delete module"
        description="This will delete the module and every lesson inside it. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (pendingDeleteModule) await onDeleteModule(pendingDeleteModule);
        }}
      />
      <ConfirmDialog
        open={pendingDeleteLesson !== null}
        onOpenChange={(v) => { if (!v) setPendingDeleteLesson(null); }}
        title="Delete lesson"
        description="Are you sure you want to remove this lesson from the course?"
        confirmLabel="Delete"
        onConfirm={async () => {
          if (pendingDeleteLesson) await onDeleteLesson(pendingDeleteLesson);
        }}
      />
    </div>
  );
}

// ─── SortableModule ───────────────────────────────────────────────────

interface SortableModuleProps {
  module: CourseTree['modules'][number];
  selectedLessonId: string | null;
  onSelectLesson: (lessonId: string) => void;
  onRenameModule: (moduleId: string, title: string) => Promise<void>;
  onRequestDeleteModule: () => void;
  onAddLesson: () => void;
  onRequestDeleteLesson: (lessonId: string) => void;
  onReorderLessons: (orders: ReorderLessonOrders) => Promise<void>;
  readOnly: boolean;
}

function SortableModule(props: SortableModuleProps) {
  const { module, selectedLessonId, onSelectLesson, onRenameModule, onRequestDeleteModule, onAddLesson, onRequestDeleteLesson, onReorderLessons, readOnly } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: module.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(module.title);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleLessonDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = module.lessons.findIndex((l) => l.id === active.id);
    const newIndex = module.lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = [...module.lessons];
    const [moved] = reordered.splice(oldIndex, 1);
    if (moved) reordered.splice(newIndex, 0, moved);
    void onReorderLessons(
      reordered.map((l, i) => ({ id: l.id, moduleId: module.id, orderIndex: i })),
    );
  };

  const handleRename = async () => {
    const trimmed = newTitle.trim();
    if (trimmed && trimmed !== module.title) {
      await onRenameModule(module.id, trimmed);
    }
    setRenaming(false);
  };

  const cancelRename = () => { setRenaming(false); setNewTitle(module.title); };
  const startRename = () => { setRenaming(true); setNewTitle(module.title); };

  return (
    <div ref={setNodeRef} style={style} className="rounded-md border bg-card p-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        {!readOnly && (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground hover:text-foreground"
            aria-label="Drag module"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
          aria-label={expanded ? 'Collapse module' : 'Expand module'}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        {renaming ? (
          <>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleRename();
                if (e.key === 'Escape') cancelRename();
              }}
              autoFocus
              className="h-7 text-sm"
            />
            <Button size="icon-sm" variant="ghost" onClick={handleRename} aria-label="Save">
              <Check className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <>
            <span className="flex-1 truncate text-sm font-medium">{module.title}</span>
            {!readOnly && (
              <>
                <Button size="icon-sm" variant="ghost" onClick={startRename} aria-label="Rename module">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={onRequestDeleteModule} aria-label="Delete module">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </>
            )}
          </>
        )}
      </div>

      {expanded && (
        <>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleLessonDragEnd}>
            <SortableContext items={module.lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1 pl-5">
                {module.lessons.map((lesson) => (
                  <SortableLesson
                    key={lesson.id}
                    lesson={lesson}
                    selected={selectedLessonId === lesson.id}
                    onSelect={() => onSelectLesson(lesson.id)}
                    onRequestDelete={() => onRequestDeleteLesson(lesson.id)}
                    readOnly={readOnly}
                  />
                ))}
                {module.lessons.length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-2 py-1">No lessons yet.</p>
                )}
              </div>
            </SortableContext>
          </DndContext>
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start pl-5 text-xs"
              onClick={onAddLesson}
            >
              <Plus className="mr-2 h-3.5 w-3.5" /> Add Lesson
            </Button>
          )}
        </>
      )}
    </div>
  );
}

// ─── SortableLesson ───────────────────────────────────────────────────

interface SortableLessonProps {
  lesson: CourseLesson;
  selected: boolean;
  onSelect: () => void;
  onRequestDelete: () => void;
  readOnly: boolean;
}

function SortableLesson({ lesson, selected, onSelect, onRequestDelete, readOnly }: SortableLessonProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-sm cursor-pointer',
        selected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50',
      )}
      onClick={onSelect}
    >
      {!readOnly && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab text-muted-foreground hover:text-foreground"
          aria-label="Drag lesson"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <span className="flex-1 truncate">{lesson.title}</span>
      <LessonTypeBadge type={lesson.type} />
      {!readOnly && (
        <Button
          size="icon-sm"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) => { e.stopPropagation(); onRequestDelete(); }}
          aria-label="Delete lesson"
        >
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
