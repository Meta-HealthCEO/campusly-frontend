'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import type { StudentProfileFormData } from '@/hooks/useStudentEditor';

type MedicalProfile = NonNullable<StudentProfileFormData['medicalProfile']>;
type EmergencyContact = NonNullable<MedicalProfile['emergencyContacts']>[number];

interface Props {
  form: Partial<StudentProfileFormData>;
  onChange: (patch: Partial<StudentProfileFormData>) => void;
}

const emptyContact = (): EmergencyContact => ({ name: '', relationship: '', phone: '' });

export function MedicalEditTab({ form, onChange }: Props) {
  const [showMedAid, setShowMedAid] = useState(
    !!(form.medicalProfile?.medicalAidInfo?.provider),
  );

  const mp = form.medicalProfile ?? {};
  const contacts = mp.emergencyContacts ?? [];
  const medAid = mp.medicalAidInfo ?? { provider: '', memberNumber: '', mainMember: '' };

  function patchMp(patch: Partial<MedicalProfile>) {
    onChange({ medicalProfile: { ...mp, ...patch } });
  }

  function updateContact(index: number, patch: Partial<EmergencyContact>) {
    const updated = contacts.map((c, i) => (i === index ? { ...c, ...patch } : c));
    patchMp({ emergencyContacts: updated });
  }

  function addContact() {
    patchMp({ emergencyContacts: [...contacts, emptyContact()] });
  }

  function removeContact(index: number) {
    patchMp({ emergencyContacts: contacts.filter((_, i) => i !== index) });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="allergies">Allergies</Label>
          <Input
            id="allergies"
            placeholder="Comma-separated, e.g. Peanuts, Latex"
            value={(mp.allergies ?? []).join(', ')}
            onChange={(e) =>
              patchMp({
                allergies: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="conditions">Medical Conditions</Label>
          <Input
            id="conditions"
            placeholder="Comma-separated, e.g. Asthma, Diabetes"
            value={(mp.conditions ?? []).join(', ')}
            onChange={(e) =>
              patchMp({
                conditions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="bloodType">Blood Type</Label>
          <Input
            id="bloodType"
            placeholder="e.g. O+"
            value={mp.bloodType ?? ''}
            onChange={(e) => patchMp({ bloodType: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={form.transportRequired ?? false}
          onCheckedChange={(v: boolean) => onChange({ transportRequired: v })}
          id="transportRequired"
        />
        <Label htmlFor="transportRequired">Transport Required</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          checked={form.afterCareRequired ?? false}
          onCheckedChange={(v: boolean) => onChange({ afterCareRequired: v })}
          id="afterCareRequired"
        />
        <Label htmlFor="afterCareRequired">After Care Required</Label>
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Emergency Contacts</p>
          <Button type="button" size="sm" variant="outline" onClick={addContact} className="gap-1">
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>
        {contacts.length === 0 && (
          <p className="text-xs text-muted-foreground">No emergency contacts recorded.</p>
        )}
        {contacts.map((contact, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Contact {i + 1}</p>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeContact(i)}
                className="h-6 w-6 p-0"
              >
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="Name"
                value={contact.name}
                onChange={(e) => updateContact(i, { name: e.target.value })}
              />
              <Input
                placeholder="Relationship"
                value={contact.relationship}
                onChange={(e) => updateContact(i, { relationship: e.target.value })}
              />
              <Input
                placeholder="Phone"
                value={contact.phone}
                onChange={(e) => updateContact(i, { phone: e.target.value })}
              />
            </div>
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Medical Aid</p>
          <Switch
            checked={showMedAid}
            onCheckedChange={(v: boolean) => {
              setShowMedAid(v);
              if (!v) patchMp({ medicalAidInfo: undefined });
            }}
            id="showMedAid"
          />
        </div>
        {showMedAid && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Provider</Label>
              <Input
                value={medAid.provider}
                onChange={(e) => patchMp({ medicalAidInfo: { ...medAid, provider: e.target.value } })}
              />
            </div>
            <div className="space-y-1">
              <Label>Member Number</Label>
              <Input
                value={medAid.memberNumber}
                onChange={(e) => patchMp({ medicalAidInfo: { ...medAid, memberNumber: e.target.value } })}
              />
            </div>
            <div className="space-y-1">
              <Label>Main Member</Label>
              <Input
                value={medAid.mainMember}
                onChange={(e) => patchMp({ medicalAidInfo: { ...medAid, mainMember: e.target.value } })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
