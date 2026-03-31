'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import type {
  Campaign, Donation, Raffle, RafflePrize, RaffleTicket,
  TaxCertificate, DonorWallEntry, RecurringDonation,
} from './fundraising-types';

export type {
  Campaign, Donation, Raffle, RafflePrize, RaffleTicket,
  TaxCertificate, DonorWallEntry, RecurringDonation,
};

// ── Helpers ────────────────────────────────────────────

function mapId(doc: Record<string, unknown>): Record<string, unknown> {
  return { ...doc, id: (doc._id as string) ?? (doc.id as string) };
}

function mapList<T>(arr: Record<string, unknown>[]): T[] {
  return arr.map(mapId) as unknown as T[];
}

function extractError(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { error?: string; message?: string } } };
  return e?.response?.data?.error ?? e?.response?.data?.message ?? fallback;
}

function resolveCampaignTitle(d: { campaignId: string | { _id: string; title: string } }): string {
  if (typeof d.campaignId === 'object' && d.campaignId !== null) {
    return (d.campaignId as { title: string }).title;
  }
  return '';
}

// ── Hook ───────────────────────────────────────────────

export function useFundraising() {
  const { user } = useAuthStore();
  const schoolId = user?.schoolId ?? '';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationsLoading, setDonationsLoading] = useState(true);

  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [rafflesLoading, setRafflesLoading] = useState(true);

  const [taxCerts, setTaxCerts] = useState<TaxCertificate[]>([]);
  const [taxCertsLoading, setTaxCertsLoading] = useState(true);

  const [donorWall, setDonorWall] = useState<DonorWallEntry[]>([]);
  const [donorWallLoading, setDonorWallLoading] = useState(false);

  const [recurringDonations, setRecurringDonations] = useState<RecurringDonation[]>([]);
  const [recurringLoading, setRecurringLoading] = useState(true);

  // ── Campaigns ──

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await apiClient.get('/fundraising/campaigns');
      const raw = res.data.data ?? res.data;
      const arr = raw.campaigns ?? (Array.isArray(raw) ? raw : []);
      setCampaigns(mapList<Campaign>(arr as Record<string, unknown>[]));
    } catch {
      console.error('Failed to load campaigns');
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const createCampaign = useCallback(async (data: {
    title: string; description: string; targetAmount: number;
    startDate: string; endDate: string; type?: string;
  }) => {
    await apiClient.post('/fundraising/campaigns', {
      ...data, schoolId, isActive: true,
    });
    toast.success('Campaign created!');
    await fetchCampaigns();
  }, [schoolId, fetchCampaigns]);

  const updateCampaign = useCallback(async (id: string, data: Record<string, unknown>) => {
    await apiClient.put(`/fundraising/campaigns/${id}`, data);
    toast.success('Campaign updated!');
    await fetchCampaigns();
  }, [fetchCampaigns]);

  const deleteCampaign = useCallback(async (id: string) => {
    await apiClient.delete(`/fundraising/campaigns/${id}`);
    toast.success('Campaign deleted!');
    await fetchCampaigns();
  }, [fetchCampaigns]);

  // ── Donations ──

  const fetchDonations = useCallback(async (campaignId?: string) => {
    setDonationsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (campaignId) params.campaignId = campaignId;
      const res = await apiClient.get('/fundraising/donations', { params });
      const raw = res.data.data ?? res.data;
      const arr = raw.donations ?? (Array.isArray(raw) ? raw : []);
      const mapped = (arr as Record<string, unknown>[]).map((d) => {
        const item = mapId(d) as unknown as Donation;
        item.campaignTitle = resolveCampaignTitle(item);
        return item;
      });
      setDonations(mapped);
    } catch {
      console.error('Failed to load donations');
    } finally {
      setDonationsLoading(false);
    }
  }, []);

  const recordDonation = useCallback(async (data: {
    campaignId: string; donorName: string; donorEmail?: string;
    amount: number; message?: string; isAnonymous?: boolean;
  }) => {
    await apiClient.post('/fundraising/donations', { ...data, schoolId });
    toast.success('Donation recorded!');
    await Promise.all([fetchDonations(), fetchCampaigns()]);
  }, [schoolId, fetchDonations, fetchCampaigns]);

  const deleteDonation = useCallback(async (id: string) => {
    await apiClient.delete(`/fundraising/donations/${id}`);
    toast.success('Donation deleted!');
    await Promise.all([fetchDonations(), fetchCampaigns()]);
  }, [fetchDonations, fetchCampaigns]);

  // ── Raffles ──

  const fetchRaffles = useCallback(async () => {
    setRafflesLoading(true);
    try {
      const res = await apiClient.get('/fundraising/raffles');
      const raw = res.data.data ?? res.data;
      const arr = raw.raffles ?? (Array.isArray(raw) ? raw : []);
      const mapped = (arr as Record<string, unknown>[]).map((r) => {
        const item = mapId(r) as unknown as Raffle;
        item.campaignTitle = resolveCampaignTitle(item);
        return item;
      });
      setRaffles(mapped);
    } catch {
      console.error('Failed to load raffles');
    } finally {
      setRafflesLoading(false);
    }
  }, []);

  const createRaffle = useCallback(async (data: {
    campaignId: string; ticketPrice: number; totalTickets: number;
    drawDate: string; prizes: RafflePrize[];
  }) => {
    await apiClient.post('/fundraising/raffles', data);
    toast.success('Raffle created!');
    await fetchRaffles();
  }, [fetchRaffles]);

  const drawWinners = useCallback(async (raffleId: string) => {
    const res = await apiClient.post(`/fundraising/raffles/${raffleId}/draw`);
    toast.success('Winners drawn successfully!');
    await fetchRaffles();
    const raw = res.data.data ?? res.data;
    return Array.isArray(raw) ? mapList<RaffleTicket>(raw as Record<string, unknown>[]) : [];
  }, [fetchRaffles]);

  // ── Tax Certificates ──

  const fetchTaxCerts = useCallback(async () => {
    setTaxCertsLoading(true);
    try {
      const res = await apiClient.get('/fundraising/tax-certificates');
      const raw = res.data.data ?? res.data;
      const arr = raw.certificates ?? (Array.isArray(raw) ? raw : []);
      setTaxCerts(mapList<TaxCertificate>(arr as Record<string, unknown>[]));
    } catch {
      console.error('Failed to load tax certificates');
    } finally {
      setTaxCertsLoading(false);
    }
  }, []);

  const generateTaxCert = useCallback(async (data: {
    donationId: string; donorName: string; donorIdNumber?: string;
    donorAddress?: string; schoolTaxNumber: string;
  }) => {
    await apiClient.post('/fundraising/tax-certificates', { ...data, schoolId });
    toast.success('Tax certificate generated!');
    await fetchTaxCerts();
  }, [schoolId, fetchTaxCerts]);

  // ── Donor Wall ──

  const fetchDonorWall = useCallback(async (campaignId: string) => {
    setDonorWallLoading(true);
    try {
      const res = await apiClient.get(`/fundraising/campaigns/${campaignId}/donor-wall`);
      const raw = res.data.data ?? res.data;
      const arr = raw.entries ?? (Array.isArray(raw) ? raw : []);
      setDonorWall(mapList<DonorWallEntry>(arr as Record<string, unknown>[]));
    } catch {
      console.error('Failed to load donor wall');
    } finally {
      setDonorWallLoading(false);
    }
  }, []);

  const addDonorWallEntry = useCallback(async (data: {
    campaignId: string; donorName: string; amount: number;
    message?: string; isPublic?: boolean; donationId: string;
  }) => {
    await apiClient.post('/fundraising/donor-wall', { ...data, schoolId });
    toast.success('Added to donor wall!');
    await fetchDonorWall(data.campaignId);
  }, [schoolId, fetchDonorWall]);

  // ── Recurring Donations ──

  const fetchRecurring = useCallback(async () => {
    setRecurringLoading(true);
    try {
      const res = await apiClient.get('/fundraising/recurring-donations');
      const raw = res.data.data ?? res.data;
      const arr = raw.recurringDonations ?? (Array.isArray(raw) ? raw : []);
      const mapped = (arr as Record<string, unknown>[]).map((r) => {
        const item = mapId(r) as unknown as RecurringDonation;
        item.campaignTitle = resolveCampaignTitle(item);
        return item;
      });
      setRecurringDonations(mapped);
    } catch {
      console.error('Failed to load recurring donations');
    } finally {
      setRecurringLoading(false);
    }
  }, []);

  const createRecurring = useCallback(async (data: {
    campaignId: string; donorName: string; donorEmail: string;
    amount: number; frequency: 'monthly' | 'weekly'; nextChargeDate: string;
  }) => {
    await apiClient.post('/fundraising/recurring-donations', { ...data, schoolId });
    toast.success('Recurring donation created!');
    await fetchRecurring();
  }, [schoolId, fetchRecurring]);

  const cancelRecurring = useCallback(async (id: string) => {
    await apiClient.patch(`/fundraising/recurring-donations/${id}/cancel`);
    toast.success('Recurring donation cancelled!');
    await fetchRecurring();
  }, [fetchRecurring]);

  const processRecurring = useCallback(async () => {
    const res = await apiClient.post('/fundraising/recurring-donations/process');
    const raw = res.data.data ?? res.data;
    const result = raw as { processed: number; failed: number };
    toast.success(`Processed ${result.processed} donations (${result.failed} failed)`);
    await Promise.all([fetchRecurring(), fetchDonations(), fetchCampaigns()]);
  }, [fetchRecurring, fetchDonations, fetchCampaigns]);

  // ── Initial Load ──

  useEffect(() => {
    fetchCampaigns();
    fetchDonations();
    fetchRaffles();
    fetchTaxCerts();
    fetchRecurring();
  }, [fetchCampaigns, fetchDonations, fetchRaffles, fetchTaxCerts, fetchRecurring]);

  return {
    campaigns, campaignsLoading, fetchCampaigns,
    createCampaign, updateCampaign, deleteCampaign,
    donations, donationsLoading, fetchDonations,
    recordDonation, deleteDonation,
    raffles, rafflesLoading, fetchRaffles,
    createRaffle, drawWinners,
    taxCerts, taxCertsLoading, fetchTaxCerts, generateTaxCert,
    donorWall, donorWallLoading, fetchDonorWall, addDonorWallEntry,
    recurringDonations, recurringLoading, fetchRecurring,
    createRecurring, cancelRecurring, processRecurring,
    extractError, schoolId,
  };
}
