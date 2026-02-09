-- Create credit_sales table for tracking credit/debt payments
CREATE TABLE public.credit_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  due_date DATE,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_sales ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admin and finance can view credit sales"
ON public.credit_sales
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('admin', 'finance')
));

CREATE POLICY "Admin and finance can manage credit sales"
ON public.credit_sales
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('admin', 'finance')
));

CREATE POLICY "Staff can view credit sales"
ON public.credit_sales
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
));

CREATE POLICY "Staff can create credit sales"
ON public.credit_sales
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_credit_sales_updated_at
BEFORE UPDATE ON public.credit_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create credit_payments table for tracking payments on credit sales
CREATE TABLE public.credit_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credit_sale_id UUID NOT NULL REFERENCES public.credit_sales(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credit_payments ENABLE ROW LEVEL SECURITY;

-- Create policies for credit_payments
CREATE POLICY "Admin and finance can view credit payments"
ON public.credit_payments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('admin', 'finance')
));

CREATE POLICY "Admin and finance can manage credit payments"
ON public.credit_payments
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role IN ('admin', 'finance')
));

CREATE POLICY "Staff can view credit payments"
ON public.credit_payments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
));