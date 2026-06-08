# Sporthouse Hub — Platformoverzicht & Overdracht

**Versie:** mei 2026 · **Opgesteld door:** Deryan Spiessens

---

## Wat is het platform?

Sporthouse Hub is een intern webplatform exclusief voor Sporthouse-medewerkers. Het centraliseert tools zoals vergaderingsopnames met AI-samenvatting, content- en projectkalenders, bestandsbeheer, wachtwoordbeheer, een copy generator, Pré-assist, teamplanning en website analytics. Toegang is uitsluitend op uitnodiging.

---

## Maandelijkse kosten

| Service | Waarvoor | Kost |
|---|---|---|
| **Vercel** | Hosting van het platform | **$20/maand** (Pro — verplicht voor zakelijk gebruik) |
| **Supabase** | Database, login, bestandsopslag | **$25/maand** (Pro — met dagelijkse back-ups) |
| **Anthropic API** | AI-functies (Expert AI, Copy Generator, vergaderingen) | **€15–50/maand** (pay-per-use, afhankelijk van gebruik) |
| **Google Cloud** | Analytics-koppeling | **Gratis** |
| **Domeinnaam** | bv. hub.sporthousegroup.com | **€0** (subdomein van bestaand domein) |

> **Geschatte totaalkost: €55–95/maand** (ca. €660–1.140/jaar)
>
> De Anthropic API heeft geen minimum — er wordt enkel betaald wat gebruikt wordt. Een uitgavenlimiet kan ingesteld worden via console.anthropic.com.

---

## Eenmalige acties bij overdracht

| Actie | Wie | Status |
|---|---|---|
| GitHub repo overzetten naar Sporthouse-account | Deryan + Alexander | Te doen |
| Supabase project overdragen | Deryan | Te doen |
| Vercel project overdragen | Deryan | Te doen |
| Alle API-sleutels instellen in Vercel (env vars) | Alexander | Te doen |
| Anthropic-account op bedrijfse-mail zetten | Sporthouse | Te doen |
| Google Analytics OAuth vernieuwen op nieuw account | Alexander | Te doen (na overdracht) |

---

## Overdracht naar Alexander

**Wat Alexander nodig heeft:**
- Toegang tot GitHub (repo), Vercel (hosting) en Supabase (database)
- De environment variables (geheime sleutels) — worden persoonlijk overhandigd, nooit via e-mail
- Een uitnodiging als admin-gebruiker op het platform zelf

**Technische kennis vereist:**
Basiskennis van webomgevingen is voldoende voor dagelijks beheer (gebruikers toevoegen, permissies beheren). Voor codewijzigingen is kennis van Next.js/React een plus, maar niet vereist voor normale werking.

**Wat Deryan voorziet:**
- Overdrachtsgesprek met uitleg van alle onderdelen
- Documentatie van de omgeving en sleutels
- Beschikbaarheid per bericht voor vragen na de stage

**Platform werkt autonoom** — er is geen dagelijks onderhoud vereist. API-sleutels verlopen niet automatisch (behalve de Google Analytics token, die Alexander éénmalig herinstelt via een script in de codebase).

---

## Beveiliging

- Toegang uitsluitend via uitnodiging (e-mailadres moet expliciet goedgekeurd worden)
- Alle data staat in een Europese Supabase-omgeving (Frankfurt)
- Geen gevoelige data van klanten opgeslagen buiten Supabase
- Geheime sleutels staan enkel in de serveromgeving, nooit in de code
