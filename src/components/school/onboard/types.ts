export interface WizardData {
  schoolName: string;
  city: string;
  province: string;
  phone: string;
  schoolType: string;
  modules: string[];
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
  tier: string;
}

export const DEFAULT_WIZARD_DATA: WizardData = {
  schoolName: '',
  city: '',
  province: '',
  phone: '',
  schoolType: 'combined',
  modules: ['fees', 'communication'],
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminPassword: '',
  tier: 'basic',
};
