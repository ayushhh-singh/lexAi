-- Atomic credit deduction to prevent TOCTOU race conditions
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_cost INT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET ai_credits = GREATEST(0, ai_credits - p_cost),
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
