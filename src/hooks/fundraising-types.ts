// Fundraising module types — shared between hook and components.

export interface Campaign {
  id: string;
  title: string;
  description: string;
  schoolId: string;
  targetAmount: number;
  raisedAmount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface Donation {
  id: string;
  campaignId: string | { _id: string; title: string };
  schoolId: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  message: string;
  isAnonymous: boolean;
  createdAt: string;
  campaignTitle?: string;
}

export interface RafflePrize {
  place: number;
  description: string;
  value: number;
}

export interface Raffle {
  id: string;
  campaignId: string | { _id: string; title: string };
  ticketPrice: number;
  totalTickets: number;
  soldTickets: number;
  drawDate: string;
  prizes: RafflePrize[];
  winnersDrawn: boolean;
  campaignTitle?: string;
}

export interface RaffleTicket {
  id: string;
  raffleId: string;
  parentId: string;
  studentId: string;
  ticketNumber: string;
  purchasedAt: string;
  isWinner: boolean;
  prizePlace?: number;
}

export interface TaxCertificate {
  id: string;
  donationId: string | { _id: string; donorName: string; amount: number };
  schoolId: string;
  certificateNumber: string;
  donorName: string;
  donorIdNumber: string;
  donorAddress: string;
  amount: number;
  dateIssued: string;
  schoolTaxNumber: string;
}

export interface DonorWallEntry {
  id: string;
  campaignId: string;
  schoolId: string;
  donorName: string;
  amount: number;
  message: string;
  isPublic: boolean;
  donationId: string;
  createdAt: string;
}

export interface RecurringDonation {
  id: string;
  campaignId: string | { _id: string; title: string };
  schoolId: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  frequency: 'monthly' | 'weekly';
  isActive: boolean;
  nextChargeDate: string;
  lastChargedDate?: string;
  totalCharged: number;
  campaignTitle?: string;
}
