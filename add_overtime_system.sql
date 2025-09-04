-- Add overtime system to existing database
-- This will add overtime tracking without breaking existing data

-- 1. Add overtime columns to attendance_records table
ALTER TABLE attendance_records 
ADD COLUMN overtime_hours NUMERIC(4,2) DEFAULT 0 CHECK (overtime_hours >= 0);

-- Add comment for clarity
COMMENT ON COLUMN attendance_records.overtime_hours IS 'Extra hours worked beyond normal working day (e.g. 2.5 for 2.5 hours overtime)';

-- 2. Create view for payroll calculations with overtime
CREATE OR REPLACE VIEW employee_payroll_view AS
SELECT 
    e.id as employee_id,
    e.full_name,
    e.daily_wage,
    e.daily_wage / 8 as hourly_wage, -- Assuming 8 hours per day
    EXTRACT(YEAR FROM ar.work_date) as year,
    EXTRACT(MONTH FROM ar.work_date) as month,
    
    -- Attendance counts
    COUNT(CASE WHEN ar.status = 'Tam Gün' THEN 1 END) as full_days,
    COUNT(CASE WHEN ar.status = 'Yarım Gün' THEN 1 END) as half_days,
    COUNT(CASE WHEN ar.status = 'Gelmedi' THEN 1 END) as absent_days,
    
    -- Total working days calculation
    COUNT(CASE WHEN ar.status = 'Tam Gün' THEN 1 END) + 
    COUNT(CASE WHEN ar.status = 'Yarım Gün' THEN 1 END) * 0.5 as total_working_days,
    
    -- Overtime calculations
    COALESCE(SUM(ar.overtime_hours), 0) as total_overtime_hours,
    COALESCE(SUM(ar.overtime_hours), 0) * (e.daily_wage / 8) * 1.5 as overtime_payment, -- 1.5x hourly rate
    
    -- Base salary calculation
    (COUNT(CASE WHEN ar.status = 'Tam Gün' THEN 1 END) + 
     COUNT(CASE WHEN ar.status = 'Yarım Gün' THEN 1 END) * 0.5) * e.daily_wage as base_salary,
    
    -- Total gross salary (base + overtime)
    (COUNT(CASE WHEN ar.status = 'Tam Gün' THEN 1 END) + 
     COUNT(CASE WHEN ar.status = 'Yarım Gün' THEN 1 END) * 0.5) * e.daily_wage +
    COALESCE(SUM(ar.overtime_hours), 0) * (e.daily_wage / 8) * 1.5 as gross_salary
    
FROM employees e
LEFT JOIN attendance_records ar ON e.id = ar.employee_id
WHERE e.is_active = true
GROUP BY 
    e.id, e.full_name, e.daily_wage, 
    EXTRACT(YEAR FROM ar.work_date), 
    EXTRACT(MONTH FROM ar.work_date);

-- 3. Create function to calculate overtime rates
CREATE OR REPLACE FUNCTION calculate_overtime_payment(
    employee_id UUID,
    month_num INTEGER,
    year_num INTEGER
) RETURNS TABLE (
    total_overtime_hours NUMERIC,
    overtime_rate NUMERIC,
    overtime_payment NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(ar.overtime_hours), 0) as total_overtime_hours,
        e.daily_wage / 8 * 1.5 as overtime_rate, -- 1.5x hourly rate
        COALESCE(SUM(ar.overtime_hours), 0) * (e.daily_wage / 8 * 1.5) as overtime_payment
    FROM employees e
    LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
        AND EXTRACT(MONTH FROM ar.work_date) = month_num
        AND EXTRACT(YEAR FROM ar.work_date) = year_num
    WHERE e.id = employee_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Update existing attendance records to have 0 overtime (for consistency)
UPDATE attendance_records SET overtime_hours = 0 WHERE overtime_hours IS NULL;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attendance_overtime ON attendance_records(overtime_hours) WHERE overtime_hours > 0;
CREATE INDEX IF NOT EXISTS idx_attendance_date_month ON attendance_records(EXTRACT(YEAR FROM work_date), EXTRACT(MONTH FROM work_date));

-- 6. Add RPC function for frontend to get overtime summary
CREATE OR REPLACE FUNCTION get_employee_overtime_summary(
    employee_uuid UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    work_date DATE,
    overtime_hours NUMERIC,
    overtime_payment NUMERIC,
    project_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ar.work_date,
        ar.overtime_hours,
        ar.overtime_hours * (e.daily_wage / 8 * 1.5) as overtime_payment,
        p.project_name
    FROM attendance_records ar
    JOIN employees e ON ar.employee_id = e.id
    LEFT JOIN projects p ON ar.project_id = p.id
    WHERE ar.employee_id = employee_uuid
        AND ar.overtime_hours > 0
        AND (start_date IS NULL OR ar.work_date >= start_date)
        AND (end_date IS NULL OR ar.work_date <= end_date)
    ORDER BY ar.work_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Display success message
SELECT 'Overtime system successfully added to database!' as message;