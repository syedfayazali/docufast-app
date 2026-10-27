# DocuFast India – Google Play Store guide

Your app is a website, so it goes to Play as a **Trusted Web Activity (TWA)**: a thin Android shell that opens your site full-screen with no browser bar. Every website update (Vercel) shows in the app immediately; you only upload a new Android build when the app shell itself changes.

---

## 1. What I already prepared in the code

| Item | Status |
|---|---|
| App icons (192, 512, maskable) as real files in the repo | Done (`public/icons/`) |
| Web app manifest with id, scope, maskable icon, shortcuts | Done |
| Service worker + offline page | Done (`public/sw.js`) |
| Public **Delete account** page (Google asks for this URL) | Done: `/delete-account`, also linked in the footer |
| In-app account deletion request | Already in Profile |
| Privacy Policy mentions location, appointments, Razorpay, Brevo | Done |
| Terms, Refund, Contact pages, "not a government website" disclaimer | Already there |
| Digital Asset Links file for the verified (no address bar) app | Template: `public/.well-known/assetlinks.json` – **you fill 2 fingerprints** (step 5) |
| Store graphics: 512 icon + 1024×500 feature graphic | `store-assets/` |

## 2. Things only you can do / check before submitting

1. **Business details**: open `src/lib/businessInfo.js`; no value should start with `[`. Phone/e-mail/address must match what you enter in Play Console.
2. **Phone screenshots**: at least 2 (Play wants 2–8), real screens, 16:9 or 9:16, min 320 px. Suggested: Home, Services list, Apply (documents step), Pay screen, Application timeline with an update, Book appointment, Membership card, Orders. Take them on your phone from the live site. Do not show real customers' personal data.
3. **A test login for Google's reviewers** (see section 6, "App access"). Create a normal account, verify it, give it a password, and make sure it has at least one sample application.
4. Never use the national emblem, Ashoka Chakra, tricolour as a logo, or wording like "official". Your app does not, keep it that way.

## 3. Policy risks and how this app handles them

| Play policy | Risk for this app | What to do |
|---|---|---|
| **Impersonation / misrepresentation** | Apps about government services get extra scrutiny; reviewers reject anything that looks official | App name is "DocuFast" (no Govt/Official/India). Every service page links to the official source and says we are a private service. We collect only our own service charge; the official fee is paid by the customer to the department. Keep it this way. |
| **User data / privacy policy** | Policy URL required, must match what the app does | `https://YOUR-SITE/privacy` (updated) |
| **Account deletion** | Needs in-app path **and** a web URL | In-app: Profile → Request Account Deletion. Web: `https://YOUR-SITE/delete-account` |
| **Permissions** | Location is requested only when the customer taps "Use my location" | Declare in Data safety (below). A TWA uses the browser's permission prompt. |
| **Payments** | Selling real-world services through Razorpay is allowed, Google Play Billing is only for digital goods | Nothing to change. Do not sell digital items (coins, premium features) outside Play Billing. |
| **Minimum functionality / broken links** | Site must load fast and not crash | Test on a real phone first; see checklist in section 7. |
| **Sensitive data** | ID documents are uploaded | Mention in Data safety; encrypted in transit and at rest (Supabase) |

## 4. Store listing text (copy / paste)

Google rejected the first app (Misleading Claims: government information without official source links, and fees around government services). This version is a **new app** with a **new package name** (`in.docufast.help`) and a new name, and the content was changed first. Create it as a **new app** in Play Console; do not reuse the old one.

**App name (max 30):** `DocuFast`

**Short description (max 80):**
`Document checking, form help and appointments. Private service, not government.`

**Full description (max 4000):** (Google requires the official source links and a clear disclaimer in the description itself)
```
DISCLAIMER: DocuFast is a private company. It is NOT a government app, does not represent any government entity, and is not affiliated with, endorsed by or authorised by any government body. We do not issue official documents and we cannot approve applications. Every decision is made by the government department.

OFFICIAL GOVERNMENT SOURCES
All government information and services mentioned in this app come from these official websites. You can use them directly, without DocuFast, at any time:
• Passport services: https://www.passportindia.gov.in
• Property registration and deeds (Telangana): https://registration.telangana.gov.in
• Birth, income, residence and family certificates (Telangana Mee Seva): https://ts.meeseva.telangana.gov.in
• PAN card: https://incometaxindia.gov.in/tax-services/apply-for-pan
• Aadhaar PVC card: https://myaadhaar.uidai.gov.in/genricPVC
• Voter ID: https://voters.eci.gov.in
• Driving licence: https://parivahan.gov.in
• Ration card (Telangana): https://epds.telangana.gov.in

WHAT DOCUFAST DOES
DocuFast is a private document-help service in Mahabubnagar, Telangana, run by DocuFast India.
• Checks that your documents are complete and correct
• Helps you fill in the application and choose the right options
• Guides you through submitting it on the official website or at the office
• Books an appointment: visit our office or get a phone call
• Shows your progress and any reference numbers we share with you

WHAT YOU PAY
You pay DocuFast only our own service charge, shown before you pay. Any official fee is set by the department and you pay it directly to the department. We do not collect it.

YOUR DATA
Your documents are stored securely and used only for your request. You can request deletion of your account at any time from Profile.

CONTACT
Support: Mon-Sat, 10:00 AM - 9:00 PM IST. Phone / WhatsApp: 8374968022. Email: docufast.india@gmail.com
Privacy policy and terms are available inside the app.
```

**Category:** Business (alternative: Productivity)
**Tags:** documents, appointments, applications
**Contact email:** your support email · **Phone:** 8374968022 · **Website:** `https://docufast-app.vercel.app`

**Before you submit**
1. Run `supabase/migration_010_official_links.sql` once in the Supabase SQL Editor.
2. In Admin → Services, open **every** service and fill in **Official source link** (the real government page for that service, `https://…gov.in`). Set **Official fee (info only)** to the real official fee, if any. Check the Service Charge covers only your own work.
3. Open the website as a customer and check each service page shows the official-source box.
4. **Government apps declaration:** answer that the app is NOT developed by or for a government. In the description of what you do, say: "Private document-help service. Not affiliated with any government."

## 5. Build the Android app (no third-party site)

The project is in the `android/` folder. Follow **`android/BUILD-AAB.md`**: you install Android Studio (Google), set your site address in one line, and create the `.aab` and your signing key on your own computer. Then:

1. Create the developer account at https://play.google.com/console ($25 one-time) and finish identity verification (can take a few days).
2. **Create app** → name DocuFast India → App → Free → accept declarations.
3. Upload the `.aab` (see section 8 for which release track) and accept **Play App Signing**.
4. **Verify the app (removes the browser bar):** Play Console → *Test and release → App integrity → App signing* → copy the SHA-256 of the app signing key; also your upload key's SHA-256. Put both into `public/.well-known/assetlinks.json`, push to GitHub, wait for Vercel, and open `https://YOUR-SITE/.well-known/assetlinks.json` to confirm.

## 6. Play Console forms (answers)

**App access:** "All or some functionality is restricted" → give the reviewer login: email + password of your test account, plus a note: "Login with email and password. Sign-in with Google is optional."

**Ads:** No.

**Content rating (questionnaire):** Category *Utility/Productivity/Other*. Violence, sexual content, drugs, gambling: all No. User-generated content: No (customers only send their own application). Shares location with others: No. Digital purchases: No. Expected rating: Everyone / 3+.

**Target audience:** 18 and over only (not directed at children).

**News app:** No. **COVID tracing:** No. **Government app declaration:** answer **No – this app is not developed by or on behalf of a government**. If the form asks how it relates to government services, say: "Private assistance service; not affiliated with any government."

**Financial features:** If asked: "Payments are made for our own service fees via a licensed payment gateway (Razorpay); we are not a bank, lender or investment app."

**Data safety** – "Does your app collect or share user data?" Yes. Encrypted in transit: **Yes**. Users can request deletion: **Yes**, URL `https://YOUR-SITE/delete-account`.

| Data type | Collected | Shared | Purpose | Required? |
|---|---|---|---|---|
| Name | Yes | No | App functionality, account | Yes |
| Email address | Yes | No | App functionality, account, communications | Yes |
| Phone number | Yes | No | App functionality, communications | Yes |
| Address | Yes | No* | App functionality | Yes |
| Approximate/precise location | Yes (only when tapped) | No | App functionality (fill in address) | **Optional** |
| Photos / Files and docs | Yes (uploaded documents, profile photo) | No* | App functionality | Yes |
| Other personal info (date of birth, gender, parents' names) | Yes | No* | App functionality | Yes |
| Payment info (UPI reference, amount) | Yes | No | App functionality | Yes |
| Messages (support form) | Yes | No | Support | Optional |
| App activity (applications, appointments) | Yes | No | App functionality | Yes |
| Device or other IDs (notification address for phone alerts) | Yes, only if the customer turns alerts on | No | App functionality (notifications) | **Optional** |

\* We pass application data to the government authority that processes it, as the customer requests. Google calls sharing with a service provider acting on your behalf (Supabase, Vercel, Razorpay, Brevo) "not shared". If unsure, tick "Yes, shared with the government authority for application processing" for the personal-info rows. That is the more cautious answer.

**Privacy policy URL:** `https://YOUR-SITE/privacy`

## 7. Test before you submit (checklist)

- [ ] Install the `.aab` build through *Internal testing* on your phone (Play Console → Testing → Internal testing → add yourself as a tester).
- [ ] Opens with no address bar (verification worked), icon looks right.
- [ ] Register / log in with e-mail code and with Google.
- [ ] Apply with a document upload (camera and gallery), pay with test UPI, see Paid and Under Review.
- [ ] "Use my location" asks permission and fills the address.
- [ ] Book, reschedule, cancel an appointment, e-mails arrive.
- [ ] Profile photo upload works; Request Account Deletion works.
- [ ] Turn on airplane mode: the offline screen appears, not a blank page.
- [ ] Back button goes back inside the app and does not close it on every page.

## 8. Release tracks and timing

1. **Internal testing**: no review, instant, up to 100 testers. Use for the checklist above.
2. **If your developer account is a personal account created after 13 Nov 2023:** Google requires a **closed test with at least 12 testers who stay opted in for 14 continuous days** before you can apply for **production**. [Google's rule](https://support.google.com/googleplay/android-developer/answer/14151465). Start recruiting 12+ friends/family with Gmail accounts now (add their emails in *Closed testing → Testers*). **Organization accounts** (registered business with a D-U-N-S number) skip this rule, but need business verification.
3. Then *Production → Create release → Roll out*. First review usually takes a few days (up to a week or more for new accounts).
4. After approval, future website changes need **no** new upload. Upload a new version only if the app name, icon, package settings or Android target changes (PWABuilder will show a reminder, usually once a year).

## 9. Common rejection reasons and the fix

| Message | Fix |
|---|---|
| "Misleading claims / impersonation" | Keep the "not a government app" line in description and app. Remove anything that looks official. |
| "Privacy policy missing / doesn't match data" | Use `/privacy`; keep it in sync with Data safety. |
| "Account deletion option required" | Give `/delete-account` URL in Data safety → Data deletion. |
| "App crashes / blank screen on start" | Test on a real phone; check Vercel is Ready; reviewer account works. |
| "Reviewer could not log in" | Put working credentials in App access; do not require OTP-by-email for that account. |
| "Metadata: screenshots don't show the app" | Use real screenshots, no device frames with fake text. |
