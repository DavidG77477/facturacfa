import { supabase } from '../lib/supabase';
import {
  BusinessProfile,
  Client,
  DocumentType,
  InvoiceDocument,
  TrashItem,
  User,
} from '../types';
import { EMPTY_BUSINESS_PROFILE } from '../utils/defaults';

// ─── Row types (snake_case DB) ───────────────────────────────────────────────

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

interface BusinessProfileRow {
  user_id: string;
  company_name: string;
  tagline: string | null;
  nif: string | null;
  rccm: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  stamp_url: string | null;
  signature_url: string | null;
  bank_details: BusinessProfile['bankDetails'];
  default_tax_rate: number;
  default_payment_terms_days: number;
  legal_footer: string | null;
}

interface ClientRow {
  id: string;
  user_id: string;
  name: string;
  client_type: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  nif_rccm: string | null;
  notes: string | null;
  created_at: string;
}

interface DocumentRow {
  id: string;
  user_id: string;
  number: string;
  type: DocumentType;
  status: string;
  date: string;
  due_date: string;
  client_id: string | null;
  client_info: InvoiceDocument['clientInfo'];
  items: InvoiceDocument['items'];
  currency: InvoiceDocument['currency'];
  tax_rate: number;
  notes: string | null;
  source_devis_number: string | null;
  source_devis_id: string | null;
  converted_facture_number: string | null;
  converted_facture_id: string | null;
  terms_and_conditions: string | null;
  amount_in_words: string | null;
  preview_options: InvoiceDocument['previewOptions'] | null;
  created_at: string;
  updated_at: string;
}

interface TrashRow {
  id: string;
  user_id: string;
  item_type: 'document' | 'client';
  document_data: InvoiceDocument | null;
  client_data: Client | null;
  deleted_at: string;
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapBusinessProfileFromRow(row: BusinessProfileRow | null): BusinessProfile {
  if (!row) return { ...EMPTY_BUSINESS_PROFILE };
  return {
    companyName: row.company_name || '',
    tagline: row.tagline || undefined,
    nif: row.nif || '',
    rccm: row.rccm || '',
    address: row.address || '',
    city: row.city || '',
    country: row.country || '',
    phone: row.phone || '',
    email: row.email || '',
    website: row.website || undefined,
    logoUrl: row.logo_url || undefined,
    stampUrl: row.stamp_url || undefined,
    signatureUrl: row.signature_url || undefined,
    bankDetails: row.bank_details || EMPTY_BUSINESS_PROFILE.bankDetails,
    defaultTaxRate: Number(row.default_tax_rate) || 18,
    defaultPaymentTermsDays: row.default_payment_terms_days || 15,
    legalFooter: row.legal_footer || undefined,
  };
}

function mapBusinessProfileToRow(userId: string, profile: BusinessProfile): BusinessProfileRow {
  return {
    user_id: userId,
    company_name: profile.companyName,
    tagline: profile.tagline || '',
    nif: profile.nif,
    rccm: profile.rccm,
    address: profile.address,
    city: profile.city,
    country: profile.country,
    phone: profile.phone,
    email: profile.email,
    website: profile.website || '',
    logo_url: profile.logoUrl || '',
    stamp_url: profile.stampUrl || '',
    signature_url: profile.signatureUrl || '',
    bank_details: profile.bankDetails,
    default_tax_rate: profile.defaultTaxRate,
    default_payment_terms_days: profile.defaultPaymentTermsDays,
    legal_footer: profile.legalFooter || '',
  };
}

function mapClientFromRow(row: ClientRow): Client {
  return {
    id: row.id,
    name: row.name,
    clientType: (row.client_type as Client['clientType']) || 'entreprise',
    companyName: row.company_name || undefined,
    email: row.email || '',
    phone: row.phone || '',
    address: row.address || '',
    city: row.city || undefined,
    country: row.country || undefined,
    nifRccm: row.nif_rccm || undefined,
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

function mapClientToRow(userId: string, client: Client): Omit<ClientRow, 'user_id'> & { user_id: string } {
  return {
    id: client.id,
    user_id: userId,
    name: client.name,
    client_type: client.clientType || 'entreprise',
    company_name: client.companyName || '',
    email: client.email,
    phone: client.phone,
    address: client.address,
    city: client.city || '',
    country: client.country || '',
    nif_rccm: client.nifRccm || '',
    notes: client.notes || '',
    created_at: client.createdAt,
  };
}

function mapDocumentFromRow(row: DocumentRow): InvoiceDocument {
  return {
    id: row.id,
    number: row.number,
    type: row.type,
    status: row.status,
    date: row.date,
    dueDate: row.due_date,
    clientId: row.client_id || '',
    clientInfo: row.client_info,
    items: row.items || [],
    currency: row.currency,
    taxRate: Number(row.tax_rate),
    notes: row.notes || undefined,
    sourceDevisNumber: row.source_devis_number || undefined,
    sourceDevisId: row.source_devis_id || undefined,
    convertedFactureNumber: row.converted_facture_number || undefined,
    convertedFactureId: row.converted_facture_id || undefined,
    termsAndConditions: row.terms_and_conditions || undefined,
    amountInWords: row.amount_in_words || undefined,
    previewOptions: row.preview_options || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDocumentToRow(userId: string, doc: InvoiceDocument): Record<string, unknown> {
  return {
    id: doc.id,
    user_id: userId,
    number: doc.number,
    type: doc.type,
    status: doc.status,
    date: doc.date,
    due_date: doc.dueDate,
    client_id: doc.clientId || null,
    client_info: doc.clientInfo,
    items: doc.items,
    currency: doc.currency,
    tax_rate: doc.taxRate,
    notes: doc.notes || '',
    source_devis_number: doc.sourceDevisNumber || null,
    source_devis_id: doc.sourceDevisId || null,
    converted_facture_number: doc.convertedFactureNumber || null,
    converted_facture_id: doc.convertedFactureId || null,
    terms_and_conditions: doc.termsAndConditions || '',
    amount_in_words: doc.amountInWords || '',
    preview_options: doc.previewOptions || {},
    created_at: doc.createdAt,
    updated_at: doc.updatedAt,
  };
}

function mapTrashFromRow(row: TrashRow): TrashItem {
  return {
    id: row.id,
    itemType: row.item_type,
    deletedAt: row.deleted_at,
    documentData: row.document_data || undefined,
    clientData: row.client_data || undefined,
  };
}

function mapUserFromRows(profile: ProfileRow, business: BusinessProfileRow | null): User {
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    businessProfile: mapBusinessProfileFromRow(business),
    createdAt: profile.created_at.split('T')[0],
  };
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string,
  name: string,
  companyName: string
): Promise<{ user: User | null; error: string | null }> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name, company_name: companyName, role: 'Fondateur / Dirigeant' } },
  });

  if (authError) return { user: null, error: authError.message };
  if (!authData.user) return { user: null, error: 'Inscription échouée.' };

  const userId = authData.user.id;
  const businessProfile: BusinessProfile = {
    ...EMPTY_BUSINESS_PROFILE,
    companyName: companyName.toUpperCase(),
    email,
  };

  // Le trigger handle_new_user crée déjà les lignes — on upsert pour éviter les doublons
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email,
    name,
    role: 'Fondateur / Dirigeant',
  });

  if (profileError) return { user: null, error: profileError.message };

  const { error: businessError } = await supabase
    .from('business_profiles')
    .upsert(mapBusinessProfileToRow(userId, businessProfile));

  if (businessError) return { user: null, error: businessError.message };

  const user = await fetchUserProfile(userId);
  return {
    user: user || {
      id: userId,
      email,
      name,
      role: 'Fondateur / Dirigeant',
      businessProfile,
      createdAt: new Date().toISOString().split('T')[0],
    },
    error: null,
  };
}

export async function signIn(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: 'Connexion échouée.' };

  const user = await fetchUserProfile(data.user.id);
  if (!user) return { user: null, error: 'Profil utilisateur introuvable.' };
  return { user, error: null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function fetchUserProfile(userId: string): Promise<User | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (profileError || !profile) return null;

  const { data: business } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return mapUserFromRows(profile as ProfileRow, business as BusinessProfileRow | null);
}

// ─── Data loading ────────────────────────────────────────────────────────────

export interface UserData {
  user: User;
  clients: Client[];
  documents: InvoiceDocument[];
  trashItems: TrashItem[];
  businessProfile: BusinessProfile;
}

export async function fetchAllUserData(userId: string): Promise<UserData | null> {
  const user = await fetchUserProfile(userId);
  if (!user) return null;

  const [clientsRes, documentsRes, trashRes] = await Promise.all([
    supabase.from('clients').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('documents').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('trash_items').select('*').eq('user_id', userId).order('deleted_at', { ascending: false }),
  ]);

  if (clientsRes.error) throw new Error(clientsRes.error.message);
  if (documentsRes.error) throw new Error(documentsRes.error.message);
  if (trashRes.error) throw new Error(trashRes.error.message);

  return {
    user,
    clients: (clientsRes.data as ClientRow[]).map(mapClientFromRow),
    documents: (documentsRes.data as DocumentRow[]).map(mapDocumentFromRow),
    trashItems: (trashRes.data as TrashRow[]).map(mapTrashFromRow),
    businessProfile: user.businessProfile,
  };
}

// ─── Clients CRUD ────────────────────────────────────────────────────────────

export async function upsertClient(userId: string, client: Client): Promise<Client> {
  const row = mapClientToRow(userId, client);
  const { data, error } = await supabase.from('clients').upsert(row).select().single();
  if (error) throw new Error(error.message);
  return mapClientFromRow(data as ClientRow);
}

export async function deleteClientFromDb(userId: string, clientId: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', clientId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// ─── Documents CRUD ──────────────────────────────────────────────────────────

export async function upsertDocument(userId: string, doc: InvoiceDocument): Promise<InvoiceDocument> {
  const row = mapDocumentToRow(userId, doc);
  const { data, error } = await supabase.from('documents').upsert(row).select().single();
  if (error) throw new Error(error.message);
  return mapDocumentFromRow(data as DocumentRow);
}

export async function upsertDocuments(userId: string, docs: InvoiceDocument[]): Promise<InvoiceDocument[]> {
  const rows = docs.map((d) => mapDocumentToRow(userId, d));
  const { data, error } = await supabase.from('documents').upsert(rows).select();
  if (error) throw new Error(error.message);
  return (data as DocumentRow[]).map(mapDocumentFromRow);
}

export async function deleteDocumentFromDb(userId: string, docId: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', docId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// ─── Business profile ────────────────────────────────────────────────────────

export async function saveBusinessProfile(userId: string, profile: BusinessProfile): Promise<BusinessProfile> {
  const row = mapBusinessProfileToRow(userId, profile);
  const { data, error } = await supabase.from('business_profiles').upsert(row).select().single();
  if (error) throw new Error(error.message);
  return mapBusinessProfileFromRow(data as BusinessProfileRow);
}

// ─── Trash ───────────────────────────────────────────────────────────────────

export async function insertTrashItem(userId: string, item: TrashItem): Promise<TrashItem> {
  const { data, error } = await supabase
    .from('trash_items')
    .insert({
      id: item.id,
      user_id: userId,
      item_type: item.itemType,
      document_data: item.documentData || null,
      client_data: item.clientData || null,
      deleted_at: item.deletedAt,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapTrashFromRow(data as TrashRow);
}

export async function deleteTrashItemFromDb(userId: string, trashId: string): Promise<void> {
  const { error } = await supabase.from('trash_items').delete().eq('id', trashId).eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function emptyTrashInDb(userId: string): Promise<void> {
  const { error } = await supabase.from('trash_items').delete().eq('user_id', userId);
  if (error) throw new Error(error.message);
}

// ─── Document numbering ──────────────────────────────────────────────────────

function parseSequenceNumber(numberStr: string, prefix: string, year: number): number | null {
  if (!numberStr) return null;
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`, 'i');
  const match = numberStr.trim().toUpperCase().match(pattern);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

export async function generateUniqueDocumentNumber(
  userId: string,
  type: DocumentType,
  existingDocuments: InvoiceDocument[] = [],
  year?: number
): Promise<string> {
  const currentYear = year || new Date().getFullYear();
  const prefix = type === 'devis' ? 'DEV' : 'FAC';
  const counterKey = `${prefix}_${currentYear}`;

  const { data: counterRow } = await supabase
    .from('document_counters')
    .select('last_sequence')
    .eq('user_id', userId)
    .eq('counter_key', counterKey)
    .maybeSingle();

  let maxSeq = counterRow?.last_sequence || 0;

  existingDocuments.forEach((doc) => {
    const seq = parseSequenceNumber(doc.number, prefix, currentYear);
    if (seq !== null && seq > maxSeq) maxSeq = seq;
  });

  let nextSeq = maxSeq + 1;
  let candidate = `${prefix}-${currentYear}-${String(nextSeq).padStart(5, '0')}`;

  const existingSet = new Set(existingDocuments.map((d) => d.number.trim().toUpperCase()));
  while (existingSet.has(candidate.toUpperCase())) {
    nextSeq++;
    candidate = `${prefix}-${currentYear}-${String(nextSeq).padStart(5, '0')}`;
  }

  const { error: counterError } = await supabase.from('document_counters').upsert({
    user_id: userId,
    counter_key: counterKey,
    last_sequence: nextSeq,
  });
  if (counterError) throw new Error(counterError.message);

  return candidate;
}

export function isDocumentNumberUnique(
  numberStr: string,
  currentDocId: string | undefined,
  existingDocuments: InvoiceDocument[]
): boolean {
  if (!numberStr?.trim()) return false;
  const target = numberStr.trim().toUpperCase();
  return !existingDocuments.some(
    (doc) => doc.id !== currentDocId && doc.number.trim().toUpperCase() === target
  );
}

export function newClientId(): string {
  return crypto.randomUUID();
}

export function newDocumentId(): string {
  return crypto.randomUUID();
}

export function newTrashId(): string {
  return crypto.randomUUID();
}

export function newItemId(): string {
  return crypto.randomUUID();
}
