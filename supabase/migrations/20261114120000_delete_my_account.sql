-- Lets a signed-in student permanently delete their own account and all their data.
-- Idempotent. Run once in the Supabase SQL Editor.
--
-- Most tables reference auth.users ON DELETE CASCADE, so removing the auth user removes their data.
-- The few tables without that foreign key are cleaned explicitly first. Uploaded files in Storage
-- are removed by the app before this function is called.
CREATE OR REPLACE FUNCTION public.delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  DELETE FROM public.university_archives WHERE user_id = uid;
  DELETE FROM public.catalog_reports WHERE user_id = uid;
  DELETE FROM public.app_admins WHERE user_id = uid;

  DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_account() TO authenticated;
