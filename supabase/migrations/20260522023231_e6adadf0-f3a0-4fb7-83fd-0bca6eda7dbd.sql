
-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Revoke EXECUTE on SECURITY DEFINER / trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Restrict bucket listing to owner only (replace broad read policy)
DROP POLICY IF EXISTS "Videos: public read" ON storage.objects;
CREATE POLICY "Videos: owner read" ON storage.objects FOR SELECT
  USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);
