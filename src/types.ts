export type DocumentType = 'devis' | 'facture';

export type InvoiceStatus = 'payee' | 'en_attente' | 'en_attente_paiement' | 'commande' | 'en_cours' | 'livre' | 'pose' | 'en_retard' | 'annulee' | string;
export type DevisStatus = 'brouillon' | 'en_attente' | 'commande' | 'en_cours' | 'livre' | 'pose' | 'accepte' | 'refuse' | 'converti' | string;

export type DocumentStatus = string;

export interface Client {
  id: string;
  name: string;
  clientType?: 'entreprise' | 'personne_physique'; // Catégorie : Entreprise ou Personne physique
  companyName?: string;
  email: string;
  phone: string;
  address: string;
  city?: string;
  country?: string;
  nifRccm?: string; // NIF / RCCM fiscal ID
  createdAt: string;
  notes?: string;
}

export interface DocumentItem {
  id: string;
  description: string;
  length?: number | string; // Longueur / Hauteur (ex: 2000 mm)
  width?: number | string;  // Largeur (ex: 1500 mm)
  clientPrice?: number;     // Prix client (tarif/m²) — P.U. = ((Largeur×Hauteur)/1e6)×Prix client
  quantity: number;
  unitPrice: number; // in FCFA
  taxRate: number; // e.g. 18 for 18% TVA, or 0
  discount: number; // percentage discount e.g. 5
}

export interface BusinessProfile {
  companyName: string;
  tagline?: string;
  nif: string; // Numéro d'Identification Fiscale
  rccm: string; // Registre du Commerce et du Crédit Mobilier
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  stampUrl?: string;     // Cachet officiel de l'entreprise
  signatureUrl?: string; // Signature numérique autorisée
  bankDetails: {
    bankName: string;
    ibanRib: string;
    accountName: string;
    mobileMoney?: string; // Orange Money / Wave / MTN
  };
  defaultTaxRate: number; // e.g., 18%
  defaultPaymentTermsDays: number;
  legalFooter?: string;
}

export interface ElementPosition {
  x: number; // Position X relative en %
  y: number; // Position Y relative en %
  width?: number; // Largeur en px
  height?: number; // Hauteur en px
}

export interface DocumentPreviewOptions {
  showContactName?: boolean;       // Afficher le nom du contact (À l'attention de : Nom)
  showClientNif?: boolean;         // Afficher l'identifiant fiscal du client (NIF/RCCM)
  showClientPhoneEmail?: boolean;  // Afficher téléphone et email du client
  showClientAddress?: boolean;     // Afficher l'adresse du client
  showPaymentDetails?: boolean;    // Afficher les détails bancaires / moyens de paiement
  showAmountInWords?: boolean;     // Afficher le montant en toutes lettres
  showSignatures?: boolean;        // Afficher le cadre des signatures
  showStamp?: boolean;             // Afficher le cachet sur le document
  showSignature?: boolean;         // Afficher la signature apposée
  stampPosition?: ElementPosition; // Coordonnées du cachet (X, Y %)
  signaturePosition?: ElementPosition; // Coordonnées de la signature (X, Y %)
  logoWidth?: number;              // Largeur du logo en px (redimensionnable sur l'aperçu)
  showDimensions?: boolean;        // Afficher/masquer les colonnes Hauteur et Largeur
}

export interface InvoiceDocument {
  id: string;
  number: string; // e.g. FAC-2026-00001 or DEV-2026-00001
  type: DocumentType;
  status: DocumentStatus;
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  clientId: string;
  clientInfo: {
    name: string;
    companyName?: string;
    email: string;
    phone: string;
    address: string;
    nifRccm?: string;
  };
  items: DocumentItem[];
  currency: 'FCFA' | 'XOF' | 'XAF';
  taxRate: number; // Global or item-level
  notes?: string;
  sourceDevisNumber?: string;
  sourceDevisId?: string;
  convertedFactureNumber?: string;
  convertedFactureId?: string;
  termsAndConditions?: string;
  amountInWords?: string;
  previewOptions?: DocumentPreviewOptions;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  businessProfile: BusinessProfile;
  createdAt: string;
}

export interface DateRangeFilter {
  startDate: string; // YYYY-MM-DD or empty
  endDate: string;   // YYYY-MM-DD or empty
  preset: 'all' | 'this_month' | 'last_month' | 'this_year' | 'custom';
}

export interface TrashItem {
  id: string; // ID unique dans la corbeille
  itemType: 'document' | 'client';
  deletedAt: string; // Horodatage ISO de suppression
  documentData?: InvoiceDocument;
  clientData?: Client;
}
