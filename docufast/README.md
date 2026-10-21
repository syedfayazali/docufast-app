# DocuFast India — setup, payments & deployment guide

Your Base44 export, now running on its own backend:

| Part | Was (Base44) | Now |
|---|---|---|
| Database, login, file storage | Base44 | **Supabase** (free tier is enough to start) |
| Online payments | manual UPI QR + screenshot | **Cashfree** (UPI, cards, net banking, wallets) + the old QR kept as a fallback |
| Hosting | Base44 | **Vercel**, deployed from **GitHub** |

The pages are unchanged. `src/api/base44Client.js` keeps the same interface the pages already call
(`base44.entities.Service.list()`, `base44.auth.me()` …) but now talks to Supabase.
Payment endpoints live in `/api` as Vercel serverless functions.

```
src/            React app (pages, components)
src/api/        Supabase adapter (replaces the Base44 SDK)
api/            Serverless functions: create-order, verify-payment, cashfree-webhook
supabase/       schema.sql  ← run once in Supabase
legacy-base44/  your old entity definitions, kept only for reference
```

---

## 0. What you need (all free to start)

- Node.js 18+ (https://nodejs.org), Git, a GitHub account
- A Supabase account (https://supabase.com)
- A Cashfree account (https://www.cashfree.com) — Test mode works immediately; Live needs KYC
- A Vercel account (https://vercel.com) — sign in with GitHub

---

## 1. Create the Supabase backend  (~10 min)

1. Supabase → **New project**. Name `docufast`, pick region **Mumbai (ap-south-1)**, set a strong DB password (save it).
2. Wait for it to finish, then open **SQL Editor → New query**, paste the whole of `supabase/schema.sql`, press **Run**.
   It creates the tables, security rules, anti-tamper triggers, realtime and the two storage buckets. You should see "Success".
3. **Project Settings → API** and copy three values:
   - Project URL → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - `anon` public key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`  ⚠️ **secret** — never put it in a `VITE_` variable, never commit it.

### 1a. Login settings (Authentication)

Your Register page asks for a **6-digit code** emailed to the user, so:

1. **Authentication → Providers → Email**: keep *Enable*, turn **Confirm email = ON**.
2. **Authentication → Email Templates → Confirm signup**: replace the body with

   ```html
   <h2>Verify your email</h2>
   <p>Your DocuFast India code is:</p>
   <h1>{{ .Token }}</h1>
   <p>It expires in one hour.</p>
   ```
   (The important part is `{{ .Token }}` — without it users receive a link, not a code.)
3. **Authentication → Email Templates → Reset password** keeps its default link; it returns to `/reset-password`.
4. **Authentication → URL Configuration** (do this again after step 6, once you know your Vercel URL):
   - Site URL: `https://YOUR-SITE.vercel.app`
   - Redirect URLs: add `https://YOUR-SITE.vercel.app/**` and `http://localhost:5173/**` and `http://localhost:3000/**`
5. **Email sending limits:** Supabase's built-in email is capped at a few emails per hour — fine for testing, **not for real customers**.
   Before launch: **Project Settings → Authentication → SMTP Settings** and plug in a free SMTP such as Resend, Brevo or Gmail Workspace.

### 1b. "Continue with Google" (optional but your login page has the button)

1. https://console.cloud.google.com → create project → **APIs & Services → OAuth consent screen** (External) → fill app name/email.
2. **Credentials → Create credentials → OAuth client ID → Web application.**
   Authorised redirect URI: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
3. Copy Client ID + Secret into Supabase **Authentication → Providers → Google → Enable → Save**.

If you skip this, remove the Google buttons from `Login.jsx` and `Register.jsx`.

---

## 2. Run it on your computer

```bash
cd docufast
npm install
cp .env.example .env        # then fill in the values from step 1 (and step 3 for Cashfree)
npm run dev                 # opens http://localhost:5173  (login, services, applications, uploads)
```

To also test **payments** locally you need the `/api` functions running, which `npm run dev` does not do:

```bash
npm i -g vercel
vercel login
vercel link                       # after you've created the Vercel project in step 6
vercel env pull .env.local        # downloads your env vars
vercel dev                        # http://localhost:3000 — site + /api together
```
(Easier alternative: skip local payment testing and test on your Vercel preview URL.)

---

## 3. Cashfree (payment gateway)  (~10 min)

1. Create an account at https://www.cashfree.com → Payment Gateway. Use **Test** mode first.
2. Dashboard → **Developers → API Keys** → copy:
   - App ID → `CASHFREE_APP_ID`
   - Secret Key → `CASHFREE_SECRET_KEY` ⚠️ secret.
3. Set `CASHFREE_ENV=sandbox` while using Test keys, and `CASHFREE_ENV=production` with Live keys. **Keys and mode must match**, otherwise the Pay button shows "Payment gateway rejected our keys".
4. Dashboard → **Developers → Webhooks** → add:
   - URL: `https://YOUR-SITE.vercel.app/api/cashfree-webhook`
   - Event: **Payment Success** (webhook version 2023-08-01 or newer). The signature uses your Secret Key, so there is no separate webhook secret.
5. Optional: `SITE_URL=https://your-site.vercel.app` (used for the post-payment return link).

**How it works:**
1. Customer submits an application; the database creates a *Pending* payment with the price copied from the service.
2. On the Pay page they tap **Pay ₹X securely** → `/api/create-order` creates a Cashfree order for the amount stored in the database.
3. Cashfree Checkout opens → customer pays → `/api/verify-payment` asks Cashfree directly that this exact order is **PAID** for the right amount → payment becomes **Paid**, application moves to **Under Review**.
4. `/api/cashfree-webhook` does the same if the customer closes the browser right after paying.

**Going live:** complete Cashfree KYC/activation, put the **Live** App ID and Secret Key in Vercel, set `CASHFREE_ENV=production`, add the webhook again in the Live dashboard, redeploy. Cashfree reviews your website and business category before activation, so describe your service honestly (a private assistance service charging a service fee, not a government office) and keep Terms, Privacy, Refund and Contact pages live.

## 4. Become the admin & load your data

1. Open the site, **register** your own account (use the code from the email).
2. Supabase → SQL Editor → run:
   ```sql
   update public.profiles set role = 'admin' where email = 'hayylogic@gmail.com';
   ```
   Log out and in again → you'll land on the Admin Dashboard.
3. **Your services/categories/banners:** the schema deliberately ships empty (no made-up prices).
   - Fastest: in Admin → **Service Editor** add your categories and services.
   - Or import from Base44: export each entity as CSV from the Base44 dashboard, then Supabase → **Table Editor → services / categories / banners → Insert → Import data from CSV.** Column names are identical, so it maps automatically.
   - Old Base44 **users and applications can't be migrated with working logins** (passwords are not exportable) — customers re-register.
4. Application/payment history from Base44 can be imported the same way into `applications` / `payments` if you want the records, but their `created_by_id` won't match new accounts.

---

## 5. Images hosted on Base44 — copy them out

Four images still load from `media.base44.com`. If your Base44 app is ever deleted they will disappear. Download them and put them in `public/`, then update the URLs:

| File | What |
|---|---|
| `src/components/Logo.jsx` (3 URLs) | logos |
| `index.html`, `public/manifest.json` | favicon / app icon |
| `src/pages/Pay.jsx` → `QR_IMAGE` | your UPI QR |

Example: save the QR as `public/upi-qr.png` and set `const QR_IMAGE = "/upi-qr.png";`.
Banner images you upload from now on are stored in Supabase automatically.

---

## 6. GitHub → Vercel

**Push to GitHub**

```bash
cd docufast
git init
git add .
git commit -m "DocuFast India: Supabase + Cashfree"
git branch -M main
# create an EMPTY private repo on github.com first (no README), then:
git remote add origin https://github.com/YOUR-USER/docufast.git
git push -u origin main
```
`.env` is in `.gitignore`, so your secrets are not uploaded. Check on GitHub that no `.env` file appears.

**Deploy on Vercel**

1. vercel.com → **Add New → Project → Import** your GitHub repo.
2. Framework preset auto-detects **Vite** (build `npm run build`, output `dist`). Leave defaults.
3. **Environment Variables** — add all five server ones and both browser ones (Production, Preview and Development):

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
   | `SUPABASE_URL` | same project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
   | `CASHFREE_APP_ID` | your Cashfree App ID |
   | `CASHFREE_SECRET_KEY` | Cashfree secret key |
   | `CASHFREE_ENV` | `sandbox` (test keys) or `production` (live keys) |

4. **Deploy.** You get `https://something.vercel.app`.
5. Go back and finish: Supabase **URL Configuration** (step 1a-4) and the Cashfree **webhook** (step 3-4) with the real URL.
6. Custom domain: Vercel → Project → **Settings → Domains**, then update the Supabase Site URL/redirects and the Cashfree webhook to the new domain.

From now on every `git push` to `main` redeploys automatically. Changing an env var needs **Redeploy** for it to take effect.

---

## 7. Final test checklist (do all of these on the live URL)

- [ ] Register → 6-digit email code arrives → logged in
- [ ] Log out / log in with password; "Forgot password" email → new password works
- [ ] Continue with Google
- [ ] Open a service → Apply → upload a PDF/JPG → submit → success screen
- [ ] **Pay ₹X securely** → test UPI/card succeeds → page shows *Payment Verified*; application is *Under Review*
- [ ] Admin → Applications: you can see the uploaded documents (View) and change status; the customer sees the live status update
- [ ] Admin → Payments shows the payment as **Paid**; manual-UPI proof flow still works
- [ ] In Cashfree → Developers → Webhooks → recent deliveries show `200`
- [ ] As a normal (non-admin) user, opening `/admin-dashboard` redirects you away (and the database would refuse the data anyway)

---

## Security notes

- The browser only ever holds the Supabase **anon** key. All access is limited by Row Level Security: customers see only their own applications, payments and files; only admins write services/banners or change application status.
- Prices are copied from the `services` table by a database trigger on insert; payment status, amounts and gateway IDs can only be changed by an admin or by the server (service-role key). A customer can only attach a UTR/screenshot to their own pending payment.
- Never share or commit `SUPABASE_SERVICE_ROLE_KEY` or `CASHFREE_SECRET_KEY`. If one leaks, rotate it in its dashboard and update Vercel.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Blank page / console says *Missing VITE_SUPABASE_URL* | env vars not set (Vercel → Settings → Environment Variables), then Redeploy |
| Register email contains a link, not a code | edit the *Confirm signup* template to include `{{ .Token }}` (step 1a-2) |
| "Email rate limit exceeded" | set up custom SMTP (step 1a-5) |
| Google: `redirect_uri_mismatch` | the Google redirect URI must be exactly `https://<ref>.supabase.co/auth/v1/callback` |
| Refreshing a page gives 404 on Vercel | `vercel.json` must be in the repo root (it is) |
| Pay button: "Server is missing environment variable …" | add the Cashfree/Supabase server vars in Vercel and Redeploy |
| Pay works but status stays Pending | webhook not set or wrong secret — Cashfree → Developers → Webhooks → logs |
| Admin pages bounce to the customer dashboard | you haven't run the `update public.profiles … 'admin'` SQL yet, or need to log out/in after it |
| `Unknown or inactive service` on submit | the service isn't in the `services` table (or `active = false`) |

---

## 8. Legal pages, contact details & what to fill in (do this before you go live)

The site now has public **Terms & Conditions** (`/terms`), **Privacy Policy** (`/privacy`), **Refund & Cancellation Policy** (`/refund-policy`) and **Contact Us** (`/contact`), linked from the footer on every public page, plus a clear "independent private service, not a government website" notice on the home page, footer, login/sign-up, and a required agreement tick-box before submitting an application.

1. Open **`src/lib/businessInfo.js`** and replace every value that starts with `[`: legal name, address, support email, grievance contact, jurisdiction. Add GSTIN / registration number if you have them (leave `""` if not; the line then hides).
2. Read the pages and **edit anything that is not how you really work**, especially `src/pages/legal/Refund.jsx` (the refund rules are sensible defaults, not law). Have someone who knows Indian consumer/data law review all four before relying on them.
3. Run **`supabase/migration_002_support_requests.sql`** once in the Supabase SQL Editor. It creates the table the Contact/Help forms and the "Request account deletion" button write to. (Fresh installs already get it from `schema.sql`.)
4. Read new messages in Supabase → **Table Editor → support_requests**. Account-deletion requests start with "ACCOUNT DELETION REQUEST".

Also fixed in this pass: the Help "Contact Support" form used to discard messages (it now saves them), "Track Application" after applying and the Home tracking box now open the right application, and removed "demo / test flow" wording from the Services and Payments pages.

## 9. Saved addresses (run once)

In Supabase → SQL Editor run `supabase/migration_003_addresses.sql`. Customers can then save several addresses (Home / Work / Other), use "Use my current location" and pick one on every application. Manage them under **Profile → Saved Addresses**.

## 10. Application → payment flow (run `supabase/migration_004_application_flow.sql` once)

1. Customer fills **Details** (saved applicant + saved address) → **Documents** → **Review & Pay**.
2. Saving creates the application as **Draft** (shown to the customer as *Awaiting Payment*) with a pending payment. Admin lists hide drafts.
3. The customer is sent straight to the Pay page. When Cashfree confirms the payment (browser return check or webhook) the server moves the application to **Under Review**.
4. Unpaid drafts appear in *My Applications* with a **Complete payment** button. Starting the same service again removes the older untouched draft.
5. After payment: confirmation screen, **printable receipt** (`/receipt/<application id>`), and a timeline (created → payment → review → approved → completed).
6. Manual UPI (fallback): the customer submits UTR + screenshot; the admin verifies it under *Payments*, which moves the application to **Under Review**.

---

## Appointments (customer booking)

Customers book from **Home → Book an Appointment**, **Dashboard → Book Appointment**, or the button on a paid application that needs an appointment. They pick a date and a free time; they can cancel or reschedule from **Profile → My Appointments**.

**Setup (once):** Supabase → SQL Editor → run `supabase/migration_006_appointments.sql`. (Fresh installs already get it from `schema.sql`.)

**You control it** in the admin app → **Bookings**: working days, opening/closing time, lunch break, slot length, people per slot, how many days ahead, minimum notice, cancellation window, holidays, office address. The same page lists **Today / Upcoming / History** with *Done / No-show / Cancel* buttons and a note the customer sees.

The database itself refuses double-booking, closed days, holidays, lunch time and past times, so it cannot be bypassed from the browser. All times are India time.

### Appointment e-mails (confirmation, reschedule, cancel, completed)

1. Supabase → SQL Editor → run `supabase/migration_007_appointment_service_mail.sql` (after 006).
2. In Brevo → top-right menu → **SMTP & API → API Keys → Generate a new API key** (this is different from the SMTP password). Also check **Senders, Domains & Dedicated IPs → Senders** that the address you send from is verified.
3. Vercel → Settings → Environment Variables, add (Production + Preview), then **Redeploy**:

   | Name | Value |
   |---|---|
   | `BREVO_API_KEY` | `xkeysib-...` |
   | `MAIL_FROM` | `DocuFast India <your-verified-sender@gmail.com>` (must be a verified sender in Brevo) |
   | `MAIL_ADMIN_COPY` | optional – you get a copy of bookings/cancellations |
   | `MAIL_REPLY_TO` | optional – where customer replies go |
   | `SUPPORT_PHONE` | optional – printed in the e-mail |

Every e-mail shows reference, date & time, type, address, service and status; booking/reschedule e-mails include a calendar file. If these variables are missing, bookings still work – only the e-mails are skipped. Customers can also open any booking as a printable **receipt** (My Appointments → View receipt).
