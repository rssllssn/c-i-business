begin;

-- Remove the NOT NULL constraint from item_description on sales
alter table public.sales
  alter column item_description drop not null;

-- The RLS insert policy doesn't explicitly check description, so no change needed there

notify pgrst, 'reload schema';

commit;
