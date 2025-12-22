-- Create a function to check if an email exists in auth.users
-- This is a secure way to check email existence without exposing user data

CREATE OR REPLACE FUNCTION check_email_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_count INTEGER;
BEGIN
  -- Count how many users have this email in auth.users
  SELECT COUNT(*)
  INTO email_count
  FROM auth.users
  WHERE email = email_to_check;
  
  -- Return true if email exists, false otherwise
  RETURN email_count > 0;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION check_email_exists(TEXT) TO authenticated, anon;
