import React from "react";
import { Phone, Mail, MapPin, Clock, UserCheck } from "lucide-react";
import LegalLayout from "@/components/LegalLayout";
import SupportForm from "@/components/SupportForm";
import { businessInfo as b } from "@/lib/businessInfo";

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-navy/5 text-navy">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function Contact() {
  return (
    <LegalLayout title="Contact Us" intro="Questions, payment problems, refund or cancellation requests: reach us here." showUpdated={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Row icon={MapPin} label="Business">
          {b.brandName}<br />{b.legalName}<br />{b.address}
        </Row>
        <Row icon={Phone} label="Phone / WhatsApp">
          <a href={`tel:${b.phone}`} className="underline">{b.phone}</a>
        </Row>
        <Row icon={Mail} label="Email">
          <a href={`mailto:${b.email}`} className="underline">{b.email}</a>
        </Row>
        <Row icon={Clock} label="Support hours">{b.supportHours}</Row>
        <Row icon={UserCheck} label="Grievance contact">{b.grievanceOfficer}</Row>
        {b.gstin ? <Row icon={MapPin} label="GSTIN">{b.gstin}</Row> : null}
        {b.registrationNo ? <Row icon={MapPin} label="Registration no.">{b.registrationNo}</Row> : null}
      </div>
      <div>
        <h2 className="mb-3 font-heading text-base font-bold text-navy">Send us a message</h2>
        <SupportForm />
      </div>
    </LegalLayout>
  );
}
