import React from "react";
import { Link } from "react-router-dom";
import LegalLayout, { Section, List } from "@/components/LegalLayout";
import { businessInfo as b } from "@/lib/businessInfo";

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro={`How ${b.brandName} collects, uses and protects your personal information.`}
    >
      <Section title="1. Who is responsible for your data">
        <p>
          {b.legalName}, operating as {b.brandName} ("we"), {b.address}. Contact: {b.email}, {b.phone}.
        </p>
      </Section>

      <Section title="2. What we collect">
        <List items={[
          "Account details: your email address, and your name if you sign in with Google.",
          "Application details you enter: full name, parent/spouse name, date of birth, gender, mobile number, email, address, city, district, state and PIN code.",
          "Documents you upload for an application (for example ID proof, address proof, photograph).",
          "Payment details: the amount, the UPI transaction reference (UTR) and the payment screenshot you submit. We do not receive or store your card numbers or UPI PIN.",
          "Saved delivery addresses. If you tap \"Use my location\", your device location (approximate or precise, as you allow) is read once to fill in the address. It is used only for that, and you can refuse the permission and type the address instead.",
          "Appointment bookings: your name, mobile number, chosen date and time, and the service you need help with.",
          "Messages you send us through the contact or support form.",
          "Basic technical data needed to run the site, such as a login session stored in your browser.",
        ]} />
      </Section>

      <Section title="3. Why we use it">
        <List items={[
          "To create and manage your account and sign you in.",
          "To prepare, submit and track your application with the concerned government authority.",
          "To verify your payment and keep records of it.",
          "To contact you about your application and answer your requests.",
          "To prevent fraud and misuse, and to meet legal and accounting obligations.",
        ]} />
        <p>We use your information with your consent and as needed to provide the service you asked for.</p>
      </Section>

      <Section title="4. Who we share it with">
        <p>We do not sell your personal information. We share it only:</p>
        <List items={[
          "With the government department or authority that processes your application, to the extent needed for it.",
          "With service providers who help us run the site, under their own security terms: Supabase (database, login and file storage), Vercel (website hosting), Cashfree (online payment processing), Brevo and our email delivery provider (sign-in, appointment and application update emails) and Google (if you choose Sign in with Google).",
          "Where required by law, court order or a lawful request from authorities.",
        ]} />
        <p>
          Our database and file storage are hosted in India where possible; our hosting providers may process
          limited data in other countries.
        </p>
      </Section>

      <Section title="5. How we protect it">
        <p>
          Documents and payment screenshots are kept in private storage that only you and authorised staff can
          open, using short-lived secure links. Access to records is limited by account and role, and traffic to the
          site is encrypted (HTTPS). No system is perfectly secure, but we work to protect your information.
        </p>
      </Section>

      <Section title="6. How long we keep it">
        <p>
          We keep application and payment records for as long as needed to provide the service, resolve disputes
          and meet legal, tax and accounting requirements. After that we delete or anonymise them. You can ask us
          to delete your account and data at any time (see below), subject to records we must legally retain.
        </p>
      </Section>

      <Section title="7. Your choices and rights">
        <p>You may ask us to:</p>
        <List items={[
          "Show you the personal information we hold about you.",
          "Correct information that is wrong or incomplete.",
          "Delete your account and personal information.",
          "Stop using your information where you withdraw consent (this may mean we cannot continue your application).",
        ]} />
        <p>
          Use the <Link to="/contact" className="font-semibold text-navy underline">Contact page</Link>, or use
          "Request account deletion" on your Profile page. We aim to respond within 30 days.
        </p>
      </Section>

      <Section title="8. Children">
        <p>
          The service is meant for adults. Applications for a child must be made by a parent or legal guardian,
          who is responsible for the information given.
        </p>
      </Section>

      <Section title="9. Browser storage">
        <p>
          We store a login session in your browser so you stay signed in. We do not use advertising or
          cross-site tracking cookies.
        </p>
      </Section>

      <Section title="10. Complaints">
        <p>
          If you have a concern about your data, contact our grievance contact: {b.grievanceOfficer}, {b.email},{" "}
          {b.phone}. We will acknowledge and work to resolve your complaint promptly.
        </p>
      </Section>

      <Section title="11. Changes">
        <p>
          We may update this policy. The latest version and its "last updated" date are always on this page.
        </p>
      </Section>
    </LegalLayout>
  );
}
