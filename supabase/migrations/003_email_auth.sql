-- Switch users table to support email-based auth
-- phone is now optional, email becomes the login identifier

alter table public.users
  alter column phone drop not null,
  alter column phone set default null;

alter table public.users
  add column if not exists email text unique;

-- Update existing users to avoid null constraint issues
update public.users set phone = null where phone = '';
