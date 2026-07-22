CREATE TABLE IF NOT EXISTS public.ai_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  provider text NOT NULL DEFAULT 'gemini',
  gemini_api_key text,
  gemini_model text NOT NULL DEFAULT 'gemini-2.5-flash',
  lovable_api_key text,
  lovable_model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  moderation_enabled boolean NOT NULL DEFAULT true,
  user_prompt_limit integer NOT NULL DEFAULT 20,
  admin_prompt_limit integer NOT NULL DEFAULT 50,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

GRANT SELECT, INSERT, UPDATE ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI settings"
  ON public.ai_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage AI settings"
  ON public.ai_settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.ai_settings (id, enabled)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;