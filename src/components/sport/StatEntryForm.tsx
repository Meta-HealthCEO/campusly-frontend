'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { SportCodeConfig, RecordMatchStatsPayload, StatField } from '@/types/sport';

interface Player {
  id: string;
  name: string;
}

interface StatEntryFormProps {
  sportConfig: SportCodeConfig;
  players: Player[];
  onSubmit: (data: RecordMatchStatsPayload) => void;
  loading: boolean;
}

type PlayerStatRow = {
  studentId: string;
  position: string;
  stats: Record<string, number | string | boolean>;
};

export function StatEntryForm({ sportConfig, players, onSubmit, loading }: StatEntryFormProps) {
  const [playerStats, setPlayerStats] = useState<PlayerStatRow[]>(
    players.map((p) => ({
      studentId: p.id,
      position: '',
      stats: {},
    }))
  );
  const [teamStats, setTeamStats] = useState<Record<string, number | string>>({});

  const updatePlayerStat = useCallback(
    (idx: number, key: string, value: number | string | boolean) => {
      setPlayerStats((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], stats: { ...next[idx].stats, [key]: value } };
        return next;
      });
    },
    []
  );

  const updatePlayerPosition = useCallback((idx: number, pos: string) => {
    setPlayerStats((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], position: pos };
      return next;
    });
  }, []);

  const updateTeamStat = useCallback((key: string, value: number | string) => {
    setTeamStats((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = () => {
    onSubmit({
      sportCode: sportConfig.code,
      playerStats: playerStats.map((ps) => ({
        studentId: ps.studentId,
        position: ps.position || undefined,
        stats: ps.stats,
      })),
      teamStats: Object.keys(teamStats).length > 0 ? teamStats : undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Player stats table */}
      <div>
        <h4 className="mb-3 font-medium">Player Statistics</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-3 font-medium">Player</th>
                {sportConfig.positions.length > 0 && (
                  <th className="pb-2 pr-3 font-medium">Position</th>
                )}
                {sportConfig.playerStatFields.map((f: StatField) => (
                  <th key={f.key} className="pb-2 pr-3 font-medium">
                    {f.label}{f.unit ? ` (${f.unit})` : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((player, idx) => (
                <tr key={player.id} className="border-b">
                  <td className="py-2 pr-3">
                    <span className="truncate font-medium">{player.name}</span>
                  </td>
                  {sportConfig.positions.length > 0 && (
                    <td className="py-2 pr-3">
                      <Select
                        value={playerStats[idx]?.position ?? ''}
                        onValueChange={(val: unknown) => updatePlayerPosition(idx, (val as string) ?? '')}
                      >
                        <SelectTrigger className="w-full sm:w-28">
                          <SelectValue placeholder="Pos" />
                        </SelectTrigger>
                        <SelectContent>
                          {sportConfig.positions.map((pos: string) => (
                            <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  )}
                  {sportConfig.playerStatFields.map((field: StatField) => (
                    <td key={field.key} className="py-2 pr-3">
                      <StatFieldInput
                        field={field}
                        value={playerStats[idx]?.stats[field.key]}
                        onChange={(v) => updatePlayerStat(idx, field.key, v)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Team stats */}
      {sportConfig.teamStatFields.length > 0 && (
        <div>
          <h4 className="mb-3 font-medium">Team Statistics</h4>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {sportConfig.teamStatFields.map((field: StatField) => (
              <div key={field.key}>
                <Label>{field.label}{field.unit ? ` (${field.unit})` : ''}</Label>
                <StatFieldInput
                  field={field}
                  value={teamStats[field.key]}
                  onChange={(v) => updateTeamStat(field.key, v as number | string)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={loading} className="w-full sm:w-auto">
        {loading ? 'Saving...' : 'Save Match Stats'}
      </Button>
    </div>
  );
}

// --- Stat field input renderer ---

interface StatFieldInputProps {
  field: StatField;
  value: number | string | boolean | undefined;
  onChange: (value: number | string | boolean) => void;
}

function StatFieldInput({ field, value, onChange }: StatFieldInputProps) {
  switch (field.type) {
    case 'number':
    case 'time':
    case 'distance':
      return (
        <Input
          type="number"
          step={field.type === 'time' ? '0.01' : '1'}
          className="w-full sm:w-20"
          value={value !== undefined ? String(value) : ''}
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
      );
    case 'select':
      return (
        <Select
          value={value !== undefined ? String(value) : ''}
          onValueChange={(val: unknown) => onChange((val as string) ?? '')}
        >
          <SelectTrigger className="w-full sm:w-28">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((opt: string) => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'boolean':
      return (
        <Checkbox
          checked={!!value}
          onCheckedChange={(checked) => onChange(!!checked)}
        />
      );
    default:
      return null;
  }
}
