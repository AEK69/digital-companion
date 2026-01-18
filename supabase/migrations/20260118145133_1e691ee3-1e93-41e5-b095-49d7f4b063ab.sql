-- Update RLS for staff to view products and create sales
-- Staff can now SELECT products (already exists but making sure)
-- Staff can create sales and sale_items

-- Allow all authenticated users to view sales they created or if they're admin/finance
DROP POLICY IF EXISTS "Staff can create sales" ON public.sales;
DROP POLICY IF EXISTS "Admin and finance can view sales" ON public.sales;

-- Staff can view their own sales
CREATE POLICY "Staff can view own sales"
ON public.sales FOR SELECT
USING (
  employee_id IN (
    SELECT id FROM employees WHERE user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'finance')
  )
);

-- All authenticated users can create sales
CREATE POLICY "Authenticated users can create sales"
ON public.sales FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid())
);

-- Staff can view sale items for their own sales
DROP POLICY IF EXISTS "Admin and finance can view sale items" ON public.sale_items;

CREATE POLICY "Staff can view sale items"
ON public.sale_items FOR SELECT
USING (
  sale_id IN (
    SELECT id FROM sales WHERE employee_id IN (
      SELECT id FROM employees WHERE user_id = auth.uid()
    )
  )
  OR EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('admin', 'finance')
  )
);

-- All authenticated users can create sale items
DROP POLICY IF EXISTS "Staff can create sale items" ON public.sale_items;

CREATE POLICY "Authenticated users can create sale items"
ON public.sale_items FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid())
);