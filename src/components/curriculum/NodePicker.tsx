'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Check, Search } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { CurriculumNodeItem } from '@/types';

interface NodePickerProps {
  frameworkId: string;
  value: string | null;
  onChange: (nodeId: string | null, node: CurriculumNodeItem | null) => void;
  onSearch: (frameworkId: string, search: string, filterType?: string) => Promise<CurriculumNodeItem[]>;
  onLoadNode: (id: string) => Promise<CurriculumNodeItem>;
  filterTypes?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export function NodePicker({
  frameworkId,
  value,
  onChange,
  onSearch,
  onLoadNode,
  filterTypes,
  placeholder = 'Select curriculum node...',
  disabled = false,
}: NodePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<CurriculumNodeItem[]>([]);
  const [selectedNode, setSelectedNode] = useState<CurriculumNodeItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (value && !selectedNode) {
      onLoadNode(value)
        .then((node: CurriculumNodeItem) => {
          setSelectedNode(node);
        })
        .catch(() => {
          /* node may not exist */
        });
    }
  }, [value, selectedNode, onLoadNode]);

  const handleSearch = useCallback(
    async (term: string) => {
      setSearch(term);
      if (term.length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const filterType = filterTypes && filterTypes.length > 0 ? filterTypes[0] : undefined;
        const nodes = await onSearch(frameworkId, term, filterType);
        setResults(nodes);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [frameworkId, filterTypes, onSearch],
  );

  const handleSelect = (node: CurriculumNodeItem) => {
    setSelectedNode(node);
    onChange(node.id, node);
    setOpen(false);
    setSearch('');
    setResults([]);
  };

  const handleClear = () => {
    setSelectedNode(null);
    onChange(null, null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selectedNode ? (
            <span className="flex items-center gap-2 truncate">
              <Badge variant="outline" className="text-[10px] px-1 py-0">
                {selectedNode.type}
              </Badge>
              <span className="truncate">{selectedNode.title}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="flex items-center gap-2 pb-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            className="h-8 text-sm"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {loading && (
            <p className="py-4 text-center text-xs text-muted-foreground">Searching...</p>
          )}
          {!loading && results.length === 0 && search.length >= 2 && (
            <p className="py-4 text-center text-xs text-muted-foreground">No results</p>
          )}
          {!loading && search.length < 2 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Type at least 2 characters
            </p>
          )}
          {results.map((node) => (
            <button
              key={node.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => handleSelect(node)}
            >
              {value === node.id && <Check className="h-3.5 w-3.5 text-primary" />}
              <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">
                {node.type}
              </Badge>
              <span className="flex-1 truncate">{node.title}</span>
              <span className="text-[10px] text-muted-foreground">{node.code}</span>
            </button>
          ))}
        </div>
        {selectedNode && (
          <div className="mt-2 border-t pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={handleClear}
            >
              Clear selection
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
