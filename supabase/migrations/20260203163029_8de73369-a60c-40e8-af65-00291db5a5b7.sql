-- Drop existing permissive policies
DROP POLICY IF EXISTS "Staff can view all reservations" ON public.table_reservations;
DROP POLICY IF EXISTS "Staff can create reservations" ON public.table_reservations;
DROP POLICY IF EXISTS "Staff can update reservations" ON public.table_reservations;
DROP POLICY IF EXISTS "Staff can delete reservations" ON public.table_reservations;

-- Create more restrictive policies requiring authenticated users with roles
CREATE POLICY "Authenticated users can view reservations" 
ON public.table_reservations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid()
));

CREATE POLICY "Authenticated users can create reservations" 
ON public.table_reservations 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid()
));

CREATE POLICY "Admin and finance can update reservations" 
ON public.table_reservations 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND role IN ('admin', 'finance')
));

CREATE POLICY "Admin can delete reservations" 
ON public.table_reservations 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND role = 'admin'
));