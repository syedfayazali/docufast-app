import React from "react";
import { Link } from "react-router-dom";
import LegalLayout, { Section, List } from "@/components/LegalLayout";
import { businessInfo as b } from "@/lib/businessInfo";

export default function Terms() {
  return (
    <LegalLayout
      title="Terms & Conditions"
      intro={`Please read these terms before using ${b.brandName}. By creating an account or submitting an application you agree to them.`}
    >
      <Section title="1. Who we are">
        <p>
          {b.brandName} is operated by {b.legalName} ("we", "us"). We are an independent, privately run
          assistance service that helps customers prepare, submit and track applications for government and
          document-related services.
        </p>
        <p>
          <strong className="text-foreground">We are not a government department</strong> and are not
          affiliated with, authorised by or endorsed by any government authority. This is not an official
          government website.
        </p>
      </Section>

      <Section title="2. What we do, and what we do not do">
        <List items={[
          "We guide you through the application, check that your details and documents are complete, and submit or assist with submission to the concerned authority.",
          "We show you the status of your application in your account.",
          "We do not issue any government document ourselves, and we do not control whether, or when, a government authority approves an application.",
          "We do not guarantee approval, specific results or processing times. Timelines shown are estimates set by the relevant authority and can change.",
        ]} />
      </Section>

      <Section title="3. Your account and eligibility">
        <List items={[
          "You must be 18 or older, or apply through a parent or legal guardian.",
          "Give accurate details and keep your login secure. You are responsible for activity on your account.",
          "We may suspend or close accounts that give false information or misuse the service.",
        ]} />
      </Section>

      <Section title="4. Fees and payment">
        <List items={[
          "Before you pay, the service page and your application show the government fee, our service charge and any other charges separately, with the total.",
          "The government fee is the amount prescribed by the concerned authority. It may change; if it changes after you applied we will tell you before proceeding.",
          "Our service charge is the fee for our assistance. It is separate from the government fee.",
          "Prices include or exclude taxes as shown on the payment page. Applicable taxes, if any, are added as required by law.",
          "You can pay by UPI. For UPI payments made directly to us, we verify the transaction (UTR/reference and screenshot) before marking the payment as received. Verification usually takes a few hours during working hours.",
          "Your application moves to review only after your payment is verified.",
        ]} />
      </Section>

      <Section title="5. Your responsibilities">
        <List items={[
          "Provide correct information and genuine, legible documents. Forged, altered or someone else's documents are not allowed.",
          "Respond promptly if we ask for more information (status \"Action Required\").",
          "You are responsible for the consequences of incorrect or incomplete information you provide, including rejection by the authority.",
          "We may refuse or cancel an application that appears fraudulent, ineligible or unlawful. Refunds in that case are handled under our Refund & Cancellation Policy.",
        ]} />
      </Section>

      <Section title="6. Cancellation and refunds">
        <p>
          Please read our <Link to="/refund-policy" className="font-semibold text-navy underline">Refund &amp; Cancellation Policy</Link>,
          which forms part of these terms.
        </p>
      </Section>

      <Section title="7. Your data">
        <p>
          How we collect and use personal information, including documents you upload, is explained in our{" "}
          <Link to="/privacy" className="font-semibold text-navy underline">Privacy Policy</Link>.
        </p>
      </Section>

      <Section title="8. Acceptable use">
        <List items={[
          "Do not use the service for anything unlawful, or to submit false or misleading information.",
          "Do not attempt to access other users' data, disrupt the service, or bypass its security.",
        ]} />
      </Section>

      <Section title="9. Limitation of liability">
        <p>
          We take reasonable care in providing the service, but we are not responsible for decisions, delays or
          errors of government authorities, for failures of third-party systems (including government portals,
          banks and UPI networks), or for losses caused by information you provided incorrectly. To the extent
          permitted by law, our total liability for any claim relating to an application is limited to the
          service charge you paid us for that application. Nothing in these terms limits any right you have under
          the Consumer Protection Act, 2019 or other applicable law.
        </p>
      </Section>

      <Section title="10. Changes">
        <p>
          We may update these terms or our services. The latest version is always on this page with its
          "last updated" date. If you keep using the service after a change, you accept the updated terms.
        </p>
      </Section>

      <Section title="11. Governing law and disputes">
        <p>
          These terms are governed by the laws of India. Subject to your rights under consumer law, the courts
          at {b.jurisdiction} have jurisdiction. Please contact us first at the details on our{" "}
          <Link to="/contact" className="font-semibold text-navy underline">Contact page</Link> so we can try to
          resolve your concern.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>{b.legalName}, {b.address}. Phone {b.phone}. Email {b.email}.</p>
      </Section>
    </LegalLayout>
  );
}
