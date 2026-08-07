CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    position_applied TEXT,
    vacancy_reference TEXT,
    source_of_advertisement TEXT,
    title TEXT,
    forenames TEXT,
    surname TEXT,
    address TEXT,
    postcode TEXT,
    telephone TEXT,
    mobile TEXT,
    personal_email TEXT,
    national_insurance TEXT,
    eligible_to_work_uk BOOLEAN,
    nmc_pin TEXT,
    rna TEXT,
    nmc_expiry_date DATE,
    right_to_work_check TEXT,
    enhanced_dbs TEXT,
    dbs_issue_date DATE,
    recent_employer_name_address TEXT,
    recent_employer_postcode TEXT,
    recent_employer_telephone TEXT,
    recent_employer_date_from DATE,
    recent_employer_date_to DATE,
    recent_employer_position TEXT,
    recent_employer_responsibilities TEXT,
    recent_employer_salary TEXT,
    recent_employer_notice_period TEXT,
    recent_employer_reason_for_leaving TEXT,
    prev_employer1_name_address TEXT,
    prev_employer1_postcode TEXT,
    prev_employer1_telephone TEXT,
    prev_employer1_date_from DATE,
    prev_employer1_date_to DATE,
    prev_employer1_position TEXT,
    prev_employer1_reason_for_leaving TEXT,
    prev_employer2_name_address TEXT,
    prev_employer2_postcode TEXT,
    prev_employer2_telephone TEXT,
    prev_employer2_date_from DATE,
    prev_employer2_date_to DATE,
    prev_employer2_position TEXT,
    prev_employer2_reason_for_leaving TEXT,
    referee1_name TEXT,
    referee1_position TEXT,
    referee1_organisation TEXT,
    referee1_relationship TEXT,
    referee1_telephone TEXT,
    referee1_email TEXT,
    referee2_name TEXT,
    referee2_position TEXT,
    referee2_organisation TEXT,
    referee2_relationship TEXT,
    referee2_telephone TEXT,
    referee2_email TEXT,
    references_agreed BOOLEAN,
    eo_vacancy_ref TEXT,
    eo_gender TEXT,
    eo_age_band TEXT,
    eo_disability BOOLEAN,
    eo_ethnic_origin TEXT,
    personal_statement TEXT,
    know_staff BOOLEAN,
    know_staff_details TEXT,
    unprotected_convictions BOOLEAN,
    unprotected_convictions_details TEXT,
    declaration_agreed BOOLEAN,
    declaration_signature TEXT,
    declaration_print_name TEXT,
    declaration_date DATE,
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
    WHERE users.id = auth.uid() AND (users.role = 'Admin' OR users.role = 'super-admin' OR users.role = 'Staff')
  )
);
