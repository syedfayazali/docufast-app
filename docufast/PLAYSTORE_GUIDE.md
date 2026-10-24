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
| **Impersonation / misrepresentation** | Apps about government services get extra scrutiny; reviewers reject anything that looks official | App name has no "Govt/Official"; every page says private service provider; first line of store description says the same. Keep it. |
| **User data / privacy policy** | Policy URL required, must match what the app does | `https://YOUR-SITE/privacy` (updated) |
| **Account deletion** | Needs in-app path **and** a web URL | In-app: Profile → Request Account Deletion. Web: `https://YOUR-SITE/delete-account` |
| **Permissions** | Location is requested only when the customer taps "Use my location" | Declare in Data safety (below). A TWA uses the browser's permission prompt. |
| **Payments** | Selling real-world services through Razorpay is allowed, Google Play Billing is only for digital goods | Nothing to change. Do not sell digital items (coins, premium features) outside Play Billing. |
| **Minimum functionality / broken links** | Site must load fast and not crash | Test on a real phone first; see checklist in section 7. |
| **Sensitive data** | ID documents are uploaded | Mention in Data safety; encrypted in transit and at rest (Supabase) |

## 4. Store listing text (copy / paste)

**App name (max 30):** `DocuFast India`

**Short description (max 80):**
`Get expert help with document applications. Private service, not government.`

**Full description (max 4000):**
```
DocuFast India is a private assistance service that helps you prepare and submit applications for government and document services.

IMPORTANT: DocuFast India is an independent private company. We are NOT a government department, we do not represent any government body, and our app is not an official government app. We charge a transparent service fee for our assistance. Government fees, where they apply, are shown separately.

WHAT YOU CAN DO
• Browse services and see clear pricing (government fee + our service fee)
• Apply in three simple steps: details, documents, review and pay
• Save multiple addresses and fill them in one tap
• Pay securely online (UPI, cards, net banking)
• Track your application with a live timeline
• Get updates and reference numbers from our team, right in the app
• Book an appointment: visit our office or get a phone call, at a time that suits you
• Download your payment receipt
• Carry your DocuFast membership card

YOUR DATA
Your documents are stored securely and used only for your application. You can request deletion of your account at any time from Profile.

CONTACT
Support: Mon–Sat, 10:00 AM – 9:00 PM IST. Phone / WhatsApp: 8374968022. Email: docufast.india@gmail.com
Privacy policy and terms are available inside the app.
```

**Category:** Business (alternative: Productivity)
**Tags:** documents, services, applications
**Contact email:** your support email · **Phone:** 8374968022 · **Website:** your Vercel/own domain

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
