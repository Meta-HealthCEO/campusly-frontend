'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { medicalProfileSchema, type MedicalProfileFormData } from '@/lib/validations';
import { updateMedicalProfile } from '@/hooks/useStudentProfile';
import type { MedicalProfile } from '@/types';

interface MedicalProfileFormProps {
  studentId: string;
  medicalProfile: MedicalProfile;
  onSaved: () => void;
}

export function MedicalProfileForm({ studentId, medicalProfile, onSaved }: MedicalProfileFormProps) {
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, control, formState: { errors } } = useForm<MedicalProfileFormData>({
    resolver: zodResolver(medicalProfileSchema),
    defaultValues: {
      allergies: medicalProfile.allergies ?? [],
      conditions: medicalProfile.conditions ?? [],
      bloodType: medicalProfile.bloodType ?? '',
      emergencyContacts: medicalProfile.emergencyContacts?.length
        ? medicalProfile.emergencyContacts
        : [{ name: '', relationship: '', phone: '' }],
      medicalAidInfo: medicalProfile.medicalAidInfo ?? undefined,
    },
  });

  const { fields: ecFields, append: addEC, remove: removeEC } = useFieldArray({
    control,
    name: 'emergencyContacts',
  });

  const [allergiesText, setAllergiesText] = useState(medicalProfile.allergies?.join(', ') ?? '');
  const [conditionsText, setConditionsText] = useState(medicalProfile.conditions?.join(', ') ?? '');
  const [showMedicalAid, setShowMedicalAid] = useState(!!medicalProfile.medicalAidInfo);

  const onSubmit = async (data: MedicalProfileFormData) => {
    setSaving(true);
    const payload = {
      ...data,
      allergies: allergiesText.split(',').map((s) => s.trim()).filter(Boolean),
      conditions: conditionsText.split(',').map((s) => s.trim()).filter(Boolean),
      medicalAidInfo: showMedicalAid ? data.medicalAidInfo : undefined,
    };

    const result = await updateMedicalProfile(studentId, payload);
    setSaving(false);

    if (result.success) {
      toast.success('Medical profile updated');
      onSaved();
    } else {
      toast.error(result.error ?? 'Failed to update');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Medical Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Blood Type</Label>
              <Input {...register('bloodType')} placeholder="e.g. O+" />
            </div>
            <div className="space-y-2">
              <Label>Allergies (comma-separated)</Label>
              <Input value={allergiesText} onChange={(e) => setAllergiesText(e.target.value)} placeholder="e.g. peanuts, dairy" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Conditions (comma-separated)</Label>
              <Input value={conditionsText} onChange={(e) => setConditionsText(e.target.value)} placeholder="e.g. asthma" />
            </div>
          </div>

          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Emergency Contacts</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => addEC({ name: '', relationship: '', phone: '' })}>
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </div>
            {ecFields.map((field, i) => (
              <div key={field.id} className="grid gap-2 sm:grid-cols-4 items-end rounded-lg border p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input {...register(`emergencyContacts.${i}.name`)} placeholder="Name" />
                  {errors.emergencyContacts?.[i]?.name && (
                    <p className="text-xs text-destructive">{errors.emergencyContacts[i].name?.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relationship</Label>
                  <Input {...register(`emergencyContacts.${i}.relationship`)} placeholder="e.g. Mother" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input {...register(`emergencyContacts.${i}.phone`)} placeholder="+27..." />
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeEC(i)} disabled={ecFields.length <= 1}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={showMedicalAid} onChange={(e) => setShowMedicalAid(e.target.checked)} id="hasMedicalAid" />
              <Label htmlFor="hasMedicalAid">Has Medical Aid</Label>
            </div>
            {showMedicalAid && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Provider</Label>
                  <Input {...register('medicalAidInfo.provider')} placeholder="e.g. Discovery" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Member Number</Label>
                  <Input {...register('medicalAidInfo.memberNumber')} placeholder="DH123456" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Main Member</Label>
                  <Input {...register('medicalAidInfo.mainMember')} placeholder="Name" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Medical Profile'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
