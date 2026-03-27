-- Switch users table to support email-based auth
-- phone is now optional, email becomes the login identifier

-- Make phone optional
alter table public.users
  alter column phone drop not null,
  alter column phone set default null;

-- Ensure email column is unique
-- If it exists from 001, add constraint. If not, add column.
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='users' and column_name='email') then
    if not exists (select 1 from pg_constraint where conname='users_email_key') then
      alter table public.users add constraint users_email_key unique (email);
    end if;
  else
    alter table public.users add column if not exists email text unique;
  end if;
end $$;

-- Update existing users to avoid null constraint issues
update public.users set phone = null where phone = '';
