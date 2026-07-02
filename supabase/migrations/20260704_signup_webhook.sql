-- Signup notification webhook: on new auth.users row, POST to the app's
-- /api/webhooks/signup endpoint (which emails the admin approve/reject links).
-- Uses pg_net (async HTTP) — available on Supabase hosted projects.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_signup_webhook()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://agentwork.fly.dev/api/webhooks/signup',
    body := jsonb_build_object(
      'type', 'INSERT',
      'record', jsonb_build_object(
        'id', NEW.id,
        'email', NEW.email,
        'created_at', NEW.created_at
      )
    ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block signups if the webhook call fails
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_webhook ON auth.users;
CREATE TRIGGER on_auth_user_created_webhook
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.notify_signup_webhook();
