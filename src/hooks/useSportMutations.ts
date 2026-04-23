'use client';

import apiClient from '@/lib/api-client';
import type {
  SportTeam, SportFixture, Season, MatchResult,
} from '@/types/sport';

function unwrapSingle<T>(res: { data: unknown }): T {
  const raw = res.data as Record<string, unknown>;
  return (raw.data ?? raw) as T;
}

// --- Team mutations ---

export async function createTeam(payload: {
  name: string;
  sport: string;
  ageGroup?: string;
  coachId?: string;
  playerIds: string[];
  isActive: boolean;
  schoolId: string;
}): Promise<SportTeam> {
  const res = await apiClient.post('/sports/teams', payload);
  return unwrapSingle<SportTeam>(res);
}

export async function updateTeam(
  teamId: string,
  payload: {
    name: string;
    sport: string;
    ageGroup?: string;
    coachId?: string;
    playerIds: string[];
    isActive: boolean;
  }
): Promise<SportTeam> {
  const res = await apiClient.put(`/sports/teams/${teamId}`, payload);
  return unwrapSingle<SportTeam>(res);
}

export async function deleteTeam(teamId: string): Promise<void> {
  await apiClient.delete(`/sports/teams/${teamId}`);
}

// --- Season mutations ---

export async function createSeason(payload: {
  name: string;
  schoolId: string;
  sport: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}): Promise<Season> {
  const res = await apiClient.post('/sports/seasons', payload);
  return unwrapSingle<Season>(res);
}

export async function updateSeason(
  seasonId: string,
  payload: {
    name: string;
    sport: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
  }
): Promise<Season> {
  const res = await apiClient.put(`/sports/seasons/${seasonId}`, payload);
  return unwrapSingle<Season>(res);
}

export async function deleteSeason(seasonId: string): Promise<void> {
  await apiClient.delete(`/sports/seasons/${seasonId}`);
}

// --- Fixture mutations ---

export async function createFixture(payload: {
  teamId: string;
  schoolId: string;
  opponent: string;
  date: string;
  time: string;
  venue: string;
  isHome: boolean;
  notes?: string;
}): Promise<SportFixture> {
  const res = await apiClient.post('/sports/fixtures', payload);
  return unwrapSingle<SportFixture>(res);
}

export async function updateFixture(
  fixtureId: string,
  payload: {
    opponent: string;
    date: string;
    time: string;
    venue: string;
    isHome: boolean;
    notes?: string;
  }
): Promise<SportFixture> {
  const res = await apiClient.put(`/sports/fixtures/${fixtureId}`, payload);
  return unwrapSingle<SportFixture>(res);
}

export async function deleteFixture(fixtureId: string): Promise<void> {
  await apiClient.delete(`/sports/fixtures/${fixtureId}`);
}

// --- Result mutations ---

export async function createResult(
  fixtureId: string,
  payload: {
    schoolId: string;
    homeScore: number;
    awayScore: number;
    scorers: { studentId: string; goals: number }[];
    manOfTheMatch?: string;
    notes?: string;
  }
): Promise<MatchResult> {
  const res = await apiClient.post(`/sports/fixtures/${fixtureId}/result`, payload);
  return unwrapSingle<MatchResult>(res);
}

export async function updateResult(
  fixtureId: string,
  payload: {
    schoolId: string;
    homeScore: number;
    awayScore: number;
    scorers: { studentId: string; goals: number }[];
    manOfTheMatch?: string;
    notes?: string;
  }
): Promise<MatchResult> {
  const res = await apiClient.put(`/sports/fixtures/${fixtureId}/result`, payload);
  return unwrapSingle<MatchResult>(res);
}

// --- MVP mutations ---

export async function castMvpVote(
  fixtureId: string,
  payload: { studentId: string; schoolId: string }
): Promise<void> {
  await apiClient.post(`/sports/fixtures/${fixtureId}/mvp`, payload);
}

// --- Team sheet ---

export async function generateTeamSheet(fixtureId: string): Promise<void> {
  await apiClient.post(`/sports/fixtures/${fixtureId}/team-sheet`);
}

// --- Availability mutations ---

export async function setPlayerAvailability(
  fixtureId: string,
  payload: {
    studentId: string;
    schoolId: string;
    status: 'available' | 'unavailable' | 'injured';
    parentConfirmed: boolean;
    notes?: string;
  }
): Promise<void> {
  await apiClient.post(`/sports/fixtures/${fixtureId}/availability`, payload);
}
