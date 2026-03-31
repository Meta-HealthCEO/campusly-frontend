// Sport module types — kept separate from src/types/index.ts per task instructions

export interface SportTeam {
  id: string;
  _id?: string;
  name: string;
  schoolId: string;
  sport: string;
  ageGroup?: string;
  coachId?: SportCoach | string | null;
  playerIds: SportPlayer[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SportCoach {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface SportPlayer {
  _id: string;
  firstName: string;
  lastName: string;
  userId?: string;
}

export interface SportFixture {
  id: string;
  _id?: string;
  teamId: SportTeamRef | string;
  schoolId: string;
  opponent: string;
  date: string;
  time: string;
  venue: string;
  isHome: boolean;
  result?: string | null;
  notes?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SportTeamRef {
  _id: string;
  name: string;
  sport: string;
}

export interface Season {
  id: string;
  _id?: string;
  name: string;
  schoolId: string;
  sport: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerAvailability {
  id: string;
  _id?: string;
  fixtureId: string | SportFixture;
  studentId: string | SportPlayer;
  schoolId: string;
  status: 'available' | 'unavailable' | 'injured';
  parentConfirmed: boolean;
  notes?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MatchResult {
  id: string;
  _id?: string;
  fixtureId: string | SportFixture;
  schoolId: string;
  homeScore: number;
  awayScore: number;
  scorers: Scorer[];
  manOfTheMatch?: SportPlayer | string | null;
  notes?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Scorer {
  studentId: SportPlayer | string;
  goals: number;
}

export interface SeasonStanding {
  id: string;
  _id?: string;
  seasonId: string;
  teamId: SportTeamRef | string;
  schoolId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  isDeleted: boolean;
}

export interface MvpTally {
  studentId: string;
  votes: number;
}

// Input types for create/update operations
export interface CreateTeamInput {
  name: string;
  schoolId: string;
  sport: string;
  ageGroup?: string;
  coachId?: string;
  playerIds?: string[];
  isActive?: boolean;
}

export interface UpdateTeamInput {
  name?: string;
  sport?: string;
  ageGroup?: string;
  coachId?: string;
  playerIds?: string[];
  isActive?: boolean;
}

export interface CreateFixtureInput {
  teamId: string;
  schoolId: string;
  opponent: string;
  date: string;
  time: string;
  venue: string;
  isHome?: boolean;
  notes?: string;
}

export interface UpdateFixtureInput {
  opponent?: string;
  date?: string;
  time?: string;
  venue?: string;
  isHome?: boolean;
  result?: string;
  notes?: string;
}

export interface CreateSeasonInput {
  name: string;
  schoolId: string;
  sport: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}

export interface UpdateSeasonInput {
  name?: string;
  sport?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface CreateResultInput {
  schoolId: string;
  homeScore: number;
  awayScore: number;
  scorers?: { studentId: string; goals: number }[];
  manOfTheMatch?: string;
  notes?: string;
}

export interface UpdateResultInput {
  homeScore?: number;
  awayScore?: number;
  scorers?: { studentId: string; goals: number }[];
  manOfTheMatch?: string;
  notes?: string;
}

export interface CreateAvailabilityInput {
  studentId: string;
  schoolId: string;
  status: 'available' | 'unavailable' | 'injured';
  parentConfirmed?: boolean;
  notes?: string;
}
