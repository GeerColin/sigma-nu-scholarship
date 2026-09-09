-- Correct the already-deployed batch function without duplicating its full body.
-- PostgreSQL's numeric template uses 9 for optional digits; # rounds instead.
do $$
declare
  function_definition text;
begin
  select pg_get_functiondef('public.prepare_email_batch(uuid,text)'::regprocedure)
  into function_definition;

  if position('FM999990.##' in function_definition) > 0 then
    function_definition := replace(
      function_definition,
      'trim(to_char(',
      'rtrim(to_char('
    );
    function_definition := replace(
      function_definition,
      ', ''FM999990.##''))',
      ', ''FM999990.99''), ''.'')'
    );
  end if;

  execute function_definition;
end;
$$;
