'use client';

import { Info, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Specimen } from './GallerySection';

/** Overlays render in a portal on <body>: they must carry the tokens and fonts in both themes (Review Focus 3). */
export function OverlayStates() {
  return (
    <Specimen title="Overlays: dialog, sheet, menu, tooltip, toast">
      <div className="flex flex-wrap gap-2">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>Open dialog</DialogTrigger>
          <DialogContent className="flex max-h-[85vh] flex-col">
            <DialogHeader>
              <DialogTitle>Rename class</DialogTitle>
              <DialogDescription>Learners see the new name on their next visit.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 space-y-1.5 overflow-y-auto py-2">
              <Label htmlFor="g-dialog-name">Class name</Label>
              <Input id="g-dialog-name" defaultValue="Grade 12 Maths" />
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
              <DialogClose render={<Button />}>Save</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet>
          <SheetTrigger render={<Button variant="outline" />}>Open sheet</SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Sheets slide in over 250ms on the standard curve.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label="More actions" />}>
            <MoreHorizontal aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem><Pencil aria-hidden="true" /> Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive"><Trash2 aria-hidden="true" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <TooltipProvider delay={150}>
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="What is a mark to gain?" />}>
              <Info aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Marks you would add by moving a topic to secure.</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button variant="secondary" onClick={() => toast.success('Marks saved', { description: '28 learners, Paper 1 mini-mock.' })}>
          Show a toast
        </Button>
      </div>
    </Specimen>
  );
}
