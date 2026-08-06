import { BusinessProfile } from '../types';

/** Profil entreprise vide pour les nouveaux comptes (sans données de démo). */
export const EMPTY_BUSINESS_PROFILE: BusinessProfile = {
  companyName: '',
  tagline: '',
  nif: '',
  rccm: '',
  address: '',
  city: '',
  country: '',
  phone: '',
  email: '',
  website: '',
  logoUrl: '',
  stampUrl: '',
  signatureUrl: '',
  bankDetails: {
    bankName: '',
    ibanRib: '',
    accountName: '',
    mobileMoney: '',
  },
  defaultTaxRate: 18,
  defaultPaymentTermsDays: 15,
  legalFooter: '',
};
