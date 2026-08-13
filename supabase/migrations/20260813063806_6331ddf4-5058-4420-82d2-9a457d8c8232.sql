-- Attendances: remove blanket read access, scope to own records + admin/finance
DROP POLICY IF EXISTS "Authenticated users can view attendances" ON public.attendances;

CREATE POLICY "Staff view own attendances, admin/finance view all"
ON public.attendances
FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.employees e WHERE e.id = attendances.employee_id AND e.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'finance')
);

-- Sales: restrict policies to authenticated role only (no anon evaluation)
DROP POLICY IF EXISTS "Staff can view own sales" ON public.sales;
CREATE POLICY "Staff can view own sales"
ON public.sales
FOR SELECT
TO authenticated
USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'finance')
);

DROP POLICY IF EXISTS "Authenticated users can create sales" ON public.sales;
CREATE POLICY "Authenticated users can create sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin can manage all sales" ON public.sales;
CREATE POLICY "Admin can manage all sales"
ON public.sales
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));