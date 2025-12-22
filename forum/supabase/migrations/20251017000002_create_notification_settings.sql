-- User notification preferences
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Toggle each notification type
  comment_on_post_enabled boolean DEFAULT true,
  reply_to_comment_enabled boolean DEFAULT true,
  bookmark_summary_enabled boolean DEFAULT true,
  
  updated_at timestamptz DEFAULT timezone('utc'::text, now())
);

-- Create default settings for existing users
INSERT INTO notification_settings (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- Trigger to create default settings for new users
CREATE OR REPLACE FUNCTION create_default_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_notification_settings_on_signup
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_settings();
