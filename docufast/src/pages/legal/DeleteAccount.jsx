import React from "react";
import { Link } from "react-router-dom";
import LegalLayout, { Section, List } from "@/components/LegalLayout";
import { businessInfo as b } from "@/lib/businessInfo";

// Public page (no login needed). Its web address is given to Google Play as the "account deletion" URL.
export default function DeleteAccount() {
  return (
    <LegalLayout title="Delete your account" intro={`How to delete your ${b.brandName} account and data.`} showUpdated={false}>
      <Section title="Option 1: inside the app">
        <List items={[
          "Log in to your account.",
          "Open Profile (bottom bar).",
          "Tap \"Request Account Deletion\" and confirm.",
        ]} />
      </Section>

      <Section title="Option 2: without logging in">
        <p>
          Email <a className="font-semibold text-navy underline" href={`mailto:${b.email}?subject=Account%20deletion%20request`}>{b.email}</a> from
          the email address you registered with, or call <a className="font-semibold text-navy underline" href={`tel:${b.phone}`}>{b.phone}</a> ({b.supportHours}).
          You can also use the <Link to="/contact" className="font-semibold text-navy underline">Contact page</Link>.
          Write "Delete my account" and the mobile number used in your applications.
        </p>
      </Section>

      <Section title="What happens next">
        <List items={[
          "We verify that the request comes from you, then delete your account within 30 days.",
          "These are deleted: your login, profile and photo, saved addresses, appointments, and the documents you uploaded.",
          "These may be kept for the period the law requires (for example tax and accounting): payment and invoice records, and records of applications already filed with a government authority. They are kept only for that purpose.",
          "Applications that have already been submitted to a government authority are not affected by deleting your account.",
        ]} />
      </Section>
    </LegalLayout>
  );
}
