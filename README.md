# AFTERWORK by Heineken — Event Registration Microsite

A single-page event-invitation and registration microsite for **AFTERWORK by Heineken**.
Guests move through a 5-page poster-style flow (invitation → registration form →
interest selection → terms → personalized success page), and their details are saved to an
**Azure Synapse** dedicated SQL pool via a **Vercel serverless function**.

> The event pictured in the current code: *29th May 2026, 6:00–9:00 PM, 4th Floor Parking Area,
> Junction Square — "Denim & Drive"*, in collaboration with YANGONATION and The Collector's Garage.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Plain HTML + CSS + vanilla JavaScript (no framework, no build step) |
| Image capture | [html2canvas](https://html2canvas.hertzen.com/) (loaded from CDN) for "share to story" |
| API | Vercel serverless function (Node.js) at `api/submit.js` |
| Database | Azure Synapse Dedicated SQL Pool via [`mssql`](https://www.npmjs.com/package/mssql) |
| Auth to DB | Azure AD service principal (app registration) |
| Hosting | Vercel (static site + serverless API) |

There is no bundler or transpiler — the site is served as static files and the `api/` folder
is deployed automatically as serverless functions by Vercel.

---

## Project structure

```
afterwork_garage/
├── index.html          # All 5 pages of the flow, in one document
├── css/
│   └── styles.css       # Poster/glassmorphism styling, page transitions
├── js/
│   ├── config.js        # window.APP_CONFIG — the per-event title (edit per event!)
│   └── app.js           # All client logic: navigation, validation, state, submit, share
├── api/
│   └── submit.js        # POST /api/submit — validates and inserts a registration
├── db/
│   └── setup.sql        # Synapse table + login/user/grant setup
├── assets/              # Background images (landing, body, afterwork)
├── .env.example         # Required environment variables (copy to .env.local)
├── package.json         # Declares the single runtime dependency: mssql
└── .gitignore
```

---

## The guest flow (5 pages)

All five "pages" live in `index.html` as `<section class="page">` blocks. `js/app.js` toggles the
`.active` class to show one at a time — it is a client-side wizard, not multiple URLs.

1. **Landing invitation** — event details and a *Register Now* button.
2. **Registration form** — Name, Mail, Phone, Date of Birth (Day/Month/Year selects), Organization,
   and an optional **Plus One** (with the same fields). Validated client-side:
   - required fields,
   - email format,
   - phone format (digits/`+`/`-`/spaces, ≥ 7 digits),
   - **18+ age check** for both attendee and plus one,
   - plus one's phone must differ from the attendee's.
3. **Interest selection & agreement** — pick one interest (*Business connections & chat* or
   *Fresh connections & chill*). The Terms checkbox stays **locked** until the guest opens page 4.
4. **Terms & Conditions** — just the T&C text and a *Back* button. Opening this page unlocks the
   agreement checkbox on page 3; the guest still has to tick it themselves after returning.
   (The T&C text is currently Burmese placeholder copy to be replaced by the marketing team.)
5. **Personalized success page** — "You're officially on the A-list!" with a *Share to your story*
   button that renders the live poster to a PNG (via html2canvas) and uses the Web Share API,
   falling back to a "screenshot this" modal.

Form progress is persisted in `localStorage` under the key `afterworkFormData` (terms agreement is
intentionally **not** restored — guests must re-view the T&C each visit).

---

## API — `POST /api/submit`

Accepts a JSON body and inserts one row into `afterwork.EventRegistrations`.

**Required fields:** `eventName`, `name`, `email`, `phoneNumber`, `dateOfBirth`, `organization`,
`bringPlusOne`, `interest`, plus `termsAgreed` must be truthy.
When `bringPlusOne === 'Yes'`, the five `plusOne*` fields are also required.

**Server-side rules (mirroring the client):**
- Email format validation for attendee and plus one.
- 18+ age validation for attendee and plus one.
- Plus one's phone must differ from the attendee's.
- **Duplicate guard:** rejects (HTTP 409) if either phone number already registered for the same
  `eventName`.
- `submitted_at` is stored as **Yangon local time** (UTC+6:30), computed by offsetting the epoch so
  the driver's UTC getters read Yangon wall-clock time.

**Responses:** `200 { success: true }` · `400` missing/invalid field · `405` non-POST ·
`409` duplicate · `500` DB failure.

The `eventName` is **not** a server secret — it comes from the client, sourced from
`window.APP_CONFIG.eventTitle` in `js/config.js`.

---

## Configuration

### Per-event title
Edit **one value** in [`js/config.js`](js/config.js) for each event/deployment:

```js
window.APP_CONFIG = { eventTitle: 'AFTERWORK October' };
```

It drives the browser tab title and is saved into `event_name` on every registration.

### Environment variables
Copy `.env.example` → `.env.local` (git-ignored) and fill in:

```
SYNAPSE_SERVER=your-workspace.sql.azuresynapse.net
SYNAPSE_DATABASE=your-dedicated-pool-name
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-app-registration-client-id
AZURE_CLIENT_SECRET=your-app-registration-client-secret
```

These authenticate the serverless function to Synapse using an Azure AD service principal.

---

## Database setup

Run [`db/setup.sql`](db/setup.sql) in Synapse Studio (as an Azure AD admin). It:

1. Creates the `afterwork.EventRegistrations` table (ROUND_ROBIN / HEAP).
2. Creates a login for the app registration in the `master` database *(commented — uncomment and
   fill in your app registration's display name)*.
3. Creates a mapped user in the pool DB and grants it `INSERT` on the table *(commented)*.

If you already have this table deployed without the `mail`/`plus_one_mail` columns, use the
`ALTER TABLE` migration at the bottom of `db/setup.sql` instead of re-running the `CREATE TABLE`.

---

## Running & deploying

This project targets **Vercel**, which serves the static files and turns `api/submit.js` into a
serverless endpoint.

```bash
npm install          # installs mssql
vercel dev           # local dev with the serverless API
vercel                # deploy a preview
vercel --prod         # deploy to production
```

Set the five environment variables in the Vercel project settings (or `.env.local` for `vercel dev`).

> **Note:** Opening `index.html` directly via `file://` will render the UI but the `POST /api/submit`
> call will fail — the serverless function only exists when served by Vercel (`vercel dev` or a
> deployment).

---

## Notes & TODOs (from the code)

- The **Terms & Conditions** text on page 4 is Burmese placeholder copy — replace with the final
  version supplied by the marketing team.
- Collaborator logos (YANGONATION, The Collector's Garage) are text placeholders (`.placeholder-logo`).
- The share flow deliberately shares an **image only, never a link**, since the invitation is private.
