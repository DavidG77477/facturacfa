# Schéma base de données FacturaCFA

## Tables créées

| Table | Description | Données app |
|-------|-------------|-------------|
| `profiles` | Utilisateur (nom, email, rôle) | `User` |
| `business_profiles` | Profil entreprise + logo/cachet/signature + banque | `BusinessProfile` |
| `clients` | Carnet clients | `Client` |
| `documents` | Devis & factures (lignes + options PDF en JSONB) | `InvoiceDocument` |
| `trash_items` | Corbeille (restauration) | `TrashItem` |
| `document_counters` | Numérotation FAC/DEV séquentielle | `documentNumber.ts` |

## Appliquer le schéma

### Option 1 — MCP Cursor (recommandé)

1. Redémarrez Cursor
2. **Settings → Tools & MCP** → connectez **supabase**
3. Demandez à l'agent : *« Applique la migration 001_initial_schema.sql »*

### Option 2 — SQL Editor Supabase

1. Ouvrez [SQL Editor](https://supabase.com/dashboard/project/xbzafnhvwbyduigyypgo/sql/new)
2. Copiez le contenu de [`migrations/001_initial_schema.sql`](./migrations/001_initial_schema.sql)
3. Cliquez **Run**

### Option 3 — Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref xbzafnhvwbyduigyypgo
npx supabase db push
```

## Storage (fichiers)

| Bucket | Contenu | Accès |
|--------|---------|-------|
| `business-assets` | Logo, cachet, signature (`{user_id}/logo.png`, …) | Public en lecture, écriture réservée au propriétaire |

Les URL publiques sont enregistrées dans `business_profiles.logo_url`, `stamp_url`, `signature_url`.

## Sécurité

- RLS activé sur toutes les tables
- Chaque utilisateur ne voit que ses propres données (`auth.uid() = user_id`)
- Trigger `handle_new_user` crée automatiquement profil + entreprise à l'inscription
- Storage : upload/update/delete uniquement dans le dossier `auth.uid()`
