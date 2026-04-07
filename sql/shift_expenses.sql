-- Run this in Supabase SQL Editor (Dashboard → SQL → New query).
-- Daily / shift-linked expenses (supplies, small purchases, etc.)

create table if not exists public.shift_expenses (
  id bigint generated always as identity primary key,
  shift_id bigint not null references public.shifts (id) on delete cascade,
  amount numeric(12, 2) not null check (amount >= 0),
  description text not null default '',
  expense_date date not null default (timezone ('utc', now()))::date,
  created_at timestamptz not null default now()
);

create index if not exists shift_expenses_shift_id_idx on public.shift_expenses (shift_id);

comment on table public.shift_expenses is 'Operating expenses recorded against a specific shift.';
