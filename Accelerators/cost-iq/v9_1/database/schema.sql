-- Cost IQ v9.1 PostgreSQL reference schema
create extension if not exists pgcrypto;

create table if not exists ciq_assessment (
  assessment_id uuid primary key default gen_random_uuid(),
  release_id varchar(32) not null,
  status varchar(32) not null default 'DRAFT',
  client_name varchar(255),
  owner_subject varchar(255) not null,
  version integer not null default 1,
  answers jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  opportunities jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ciq_evidence (
  evidence_id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references ciq_assessment(assessment_id) on delete cascade,
  evidence_type varchar(64) not null,
  object_name varchar(512) not null,
  storage_key varchar(1024),
  sha256 varchar(64),
  classification varchar(32) not null default 'INTERNAL',
  uploaded_by varchar(255) not null,
  created_at timestamptz not null default now()
);

create table if not exists ciq_audit_event (
  event_id bigserial primary key,
  assessment_id uuid references ciq_assessment(assessment_id) on delete set null,
  subject varchar(255) not null,
  action varchar(128) not null,
  object_type varchar(64),
  object_id varchar(255),
  correlation_id varchar(255),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ciq_assessment_owner on ciq_assessment(owner_subject);
create index if not exists idx_ciq_evidence_assessment on ciq_evidence(assessment_id);
create index if not exists idx_ciq_audit_assessment on ciq_audit_event(assessment_id);
