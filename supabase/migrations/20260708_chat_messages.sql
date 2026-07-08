-- Chat thread persistence for the team dashboard chat.
-- Every user/assistant message in a box chat (live agent or preview mode) is
-- stored per (account, box) so threads survive reloads and devices.

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  box_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_idx
  ON public.chat_messages (user_id, box_id, created_at);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users only ever see and write their own threads.
DROP POLICY IF EXISTS chat_messages_select_own ON public.chat_messages;
CREATE POLICY chat_messages_select_own ON public.chat_messages
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS chat_messages_insert_own ON public.chat_messages;
CREATE POLICY chat_messages_insert_own ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS chat_messages_delete_own ON public.chat_messages;
CREATE POLICY chat_messages_delete_own ON public.chat_messages
  FOR DELETE USING (auth.uid() = user_id);
