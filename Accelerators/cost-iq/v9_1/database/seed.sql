insert into ciq_assessment(release_id,status,client_name,owner_subject,answers,metadata)
values ('9.1.0','DRAFT','Synthetic Pilot','pilot-user','{}'::jsonb,'{"seed":true,"calibrationEligible":false}'::jsonb)
on conflict do nothing;
