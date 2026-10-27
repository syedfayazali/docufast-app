-- Run once in Supabase -> SQL Editor. Old fee values are backed up in docs/service-fees-backup-2026-10-28.md
-- 1) Removes the unverified "official fee" numbers (some were outdated, e.g. passport fees changed on 1 July 2026).
-- 2) Corrects three official links.
-- 3) Adds a "not an official government-issued card" line to the PVC card services.
update public.services set
  government_fee = 0,
  official_url = case
    when official_url like 'https://ts.meeseva.telangana.gov.in%' then 'https://ts.meeseva.telangana.gov.in/meeseva/home.htm'
    when official_url like 'https://epds.telangana.gov.in%' then 'https://civilsupplies.telangana.gov.in/'
    when official_url like 'https://myaadhaar.uidai.gov.in%' then 'https://uidai.gov.in/'
    else official_url end,
  description = case
    when category = 'PVC cards' and coalesce(description,'') not like '%not an official%'
      then coalesce(description,'') || E'\n\nDocuFast is a private service. This is not an official government-issued card or document. Official cards are issued only by the concerned government authority; see the official source link on this page.'
    else description end;
