import React from "react";
import { Link } from "react-router-dom";
import LegalLayout, { Section, List } from "@/components/LegalLayout";
import { businessInfo as b } from "@/lib/businessInfo";

/*
 * NOTE FOR THE OWNER: the rules below are sensible defaults, not law.
 * Edit them so they match what you really do, and keep them consistent
 * with how you treat customers.
 */
export default function Refund() {
  return (
    <LegalLayout
      title="Refund & Cancellation Policy"
      intro="When you can cancel an application, and what is refunded."
    >
      <Section title="1. What you pay for">
        <List items={[
          "Government fee: the amount prescribed by the concerned authority, collected through us and passed on to it.",
          "Service charge: our fee for assisting with your application.",
          "Other charges, if any, are shown before you pay.",
        ]} />
      </Section>

      <Section title="2. Cancelling an application">
        <List items={[
          "You can ask to cancel at any time from the Contact page or by phone/email, quoting your application number.",
          "Before our team has started processing (status \"Submitted\"): cancellation is free and we refund the full amount you paid.",
          "After processing has started (status \"Under Review\" or later): the service charge is not refundable because the work has begun. The government fee is refunded only if it has not yet been paid to the authority, or if the authority itself returns it to us (we then pass it on to you in full).",
          "Once an application is \"Approved\" or \"Completed\", fees are not refundable.",
        ]} />
      </Section>

      <Section title="3. Cases where you are refunded">
        <List items={[
          "You paid twice for the same application, or an amount more than shown: we refund the extra amount.",
          "Your payment was received but we could not accept the application, for example the service is unavailable: full refund.",
          "We made an error that caused the application to fail: we refund our service charge, and the government fee where it can be recovered.",
          "The authority rejects the application because of a mistake on our side.",
        ]} />
      </Section>

      <Section title="4. Cases where fees are not refunded">
        <List items={[
          "The authority rejects the application because of incorrect, false, missing or ineligible information or documents you provided.",
          "You stop responding to our requests for information (\"Action Required\") within a reasonable time.",
          "Delays or outcomes that are decided by the government authority.",
        ]} />
      </Section>

      <Section title="5. How refunds are made">
        <List items={[
          `Approved refunds are returned to the same UPI ID or account you paid from, within ${b.refundWorkingDays} working days of approval.`,
          "Bank or UPI processing can add a short delay on their side.",
          "If your payment was debited but shows as pending or failed in your account, contact us with the UTR/reference. We will verify it and either confirm the payment or refund it.",
        ]} />
      </Section>

      <Section title="6. How to request a refund or cancellation">
        <p>
          Use the <Link to="/contact" className="font-semibold text-navy underline">Contact page</Link>, or call{" "}
          {b.phone} / email {b.email}, with your application number and the payment reference. Support hours:{" "}
          {b.supportHours}.
        </p>
      </Section>
    </LegalLayout>
  );
}
