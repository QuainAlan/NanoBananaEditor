/*
  # Credits System Migration

  1. New Tables
    - `user_credits`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `credits_balance` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Functions
    - `deduct_user_credits` - Safely deduct credits from user balance
    - `add_user_credits` - Add credits to user balance (for purchases)

  3. Security
    - Enable RLS on `user_credits` table
    - Add policies for authenticated users to read/update their own credits
*/

-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_balance integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own credits"
  ON user_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
  ON user_credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits"
  ON user_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to safely deduct credits
CREATE OR REPLACE FUNCTION deduct_user_credits(user_uuid uuid, credits_to_deduct integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance integer;
BEGIN
  -- Get current balance
  SELECT credits_balance INTO current_balance
  FROM user_credits
  WHERE user_id = user_uuid;
  
  -- If no record exists, create one with 0 balance
  IF current_balance IS NULL THEN
    INSERT INTO user_credits (user_id, credits_balance)
    VALUES (user_uuid, 0);
    current_balance := 0;
  END IF;
  
  -- Check if user has enough credits
  IF current_balance < credits_to_deduct THEN
    RETURN false;
  END IF;
  
  -- Deduct credits
  UPDATE user_credits
  SET 
    credits_balance = credits_balance - credits_to_deduct,
    updated_at = now()
  WHERE user_id = user_uuid;
  
  RETURN true;
END;
$$;

-- Function to add credits (for purchases)
CREATE OR REPLACE FUNCTION add_user_credits(user_uuid uuid, credits_to_add integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update credits balance
  INSERT INTO user_credits (user_id, credits_balance, created_at, updated_at)
  VALUES (user_uuid, credits_to_add, now(), now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    credits_balance = user_credits.credits_balance + credits_to_add,
    updated_at = now();
  
  RETURN true;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_balance ON user_credits(credits_balance);