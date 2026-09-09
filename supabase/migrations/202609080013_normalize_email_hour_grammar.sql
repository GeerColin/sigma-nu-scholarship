create or replace function public.normalize_email_hour_grammar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.final_body := regexp_replace(
    new.final_body,
    E'\\m1 hours\\M',
    '1 hour',
    'g'
  );
  return new;
end;
$$;

drop trigger if exists email_messages_normalize_hour_grammar
on public.email_messages;

create trigger email_messages_normalize_hour_grammar
before insert or update of final_body on public.email_messages
for each row execute function public.normalize_email_hour_grammar();
