/*
  # Time Tracker Database Schema

  1. New Tables
    - `companies`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `color` (text, required)
      - `user_id` (uuid, required, references auth.users)
      - `created_at` (timestamp with timezone)

    - `time_entries`
      - `id` (uuid, primary key)
      - `company_id` (uuid, required, references companies)
      - `start_time` (timestamp with timezone, required)
      - `end_time` (timestamp with timezone, required)
      - `duration` (integer, required) - in minutes
      - `is_manual` (boolean, required)
      - `date` (date, required)
      - `user_id` (uuid, required, references auth.users)
      - `created_at` (timestamp with timezone)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Companies table
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Time entries table
CREATE TABLE time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  duration integer NOT NULL, -- in minutes
  is_manual boolean NOT NULL DEFAULT false,
  date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Policies for companies table
CREATE POLICY "Users can view their own companies"
  ON companies
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own companies"
  ON companies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own companies"
  ON companies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own companies"
  ON companies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for time_entries table
CREATE POLICY "Users can view their own time entries"
  ON time_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own time entries"
  ON time_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time entries"
  ON time_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time entries"
  ON time_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_companies_user_id ON companies(user_id);
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_company_id ON time_entries(company_id);
CREATE INDEX idx_time_entries_date ON time_entries(date);