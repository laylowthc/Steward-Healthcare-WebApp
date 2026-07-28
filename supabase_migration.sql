CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    full_name TEXT,
    address TEXT,
    dob DATE,
    nationality TEXT,
    gender TEXT,
    ni_number TEXT,
    right_to_work_status TEXT,
    emergency_name TEXT,
    emergency_relation TEXT,
    emergency_phone TEXT,
    employment_history JSONB,
    qualifications JSONB,
    mandatory_training JSONB,
    skills JSONB,
    references JSONB,
    status TEXT DEFAULT 'Submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own application"
ON applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own application"
ON applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own application"
ON applications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
ON applications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid() AND (users.role = 'Admin' OR users.role = 'super-admin')
  )
);
