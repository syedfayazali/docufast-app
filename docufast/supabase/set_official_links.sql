-- Official source links for the current services (run once in Supabase -> SQL Editor).
-- Open each link once in your browser to confirm it works before submitting to Google.
update public.services set official_url = case id
  when '6a99a3625cee4eafc7da75d2' then 'https://ts.meeseva.telangana.gov.in/'
  when '6a99a3625cee4eafc7da75d3' then 'https://ts.meeseva.telangana.gov.in/'
  when '6a99a3625cee4eafc7da75d4' then 'https://ts.meeseva.telangana.gov.in/'
  when '6a99a3625cee4eafc7da75d5' then 'https://ts.meeseva.telangana.gov.in/'
  when '6aa2413589963d05902a81ed' then 'https://incometaxindia.gov.in/tax-services/apply-for-pan'
  when '6aa24842a2d44750d840d3b9' then 'https://myaadhaar.uidai.gov.in/genricPVC'
  when '6aa3c6f623febc151e5fa9a4' then 'https://voters.eci.gov.in/'
  when '6aa3c7d5c884ea881185326d' then 'https://parivahan.gov.in/'
  when '6aa2427bb3d3ad0d64849324' then 'https://epds.telangana.gov.in/'
  when '6a99a3625cee4eafc7da75d6' then 'https://www.passportindia.gov.in/'
  when '6a99a3625cee4eafc7da75d7' then 'https://www.passportindia.gov.in/'
  when '6a99a3625cee4eafc7da75d8' then 'https://www.passportindia.gov.in/'
  when '6a99a3625cee4eafc7da75d9' then 'https://www.passportindia.gov.in/'
  when '6a99a3625cee4eafc7da75da' then 'https://www.passportindia.gov.in/'
  when '6a99a3625cee4eafc7da75db' then 'https://registration.telangana.gov.in/'
  when '6a99a3625cee4eafc7da75dc' then 'https://registration.telangana.gov.in/'
  when '6a99a3625cee4eafc7da75dd' then 'https://registration.telangana.gov.in/'
  when '6a99a3625cee4eafc7da75de' then 'https://registration.telangana.gov.in/'
  when '6a99a3625cee4eafc7da75df' then 'https://registration.telangana.gov.in/'
  when '6a99a3625cee4eafc7da75e0' then 'https://registration.telangana.gov.in/'
  else official_url end
where id in (
  '6a99a3625cee4eafc7da75d2','6a99a3625cee4eafc7da75d3','6a99a3625cee4eafc7da75d4','6a99a3625cee4eafc7da75d5',
  '6aa2413589963d05902a81ed','6aa24842a2d44750d840d3b9','6aa3c6f623febc151e5fa9a4','6aa3c7d5c884ea881185326d','6aa2427bb3d3ad0d64849324',
  '6a99a3625cee4eafc7da75d6','6a99a3625cee4eafc7da75d7','6a99a3625cee4eafc7da75d8','6a99a3625cee4eafc7da75d9','6a99a3625cee4eafc7da75da',
  '6a99a3625cee4eafc7da75db','6a99a3625cee4eafc7da75dc','6a99a3625cee4eafc7da75dd','6a99a3625cee4eafc7da75de','6a99a3625cee4eafc7da75df','6a99a3625cee4eafc7da75e0');
