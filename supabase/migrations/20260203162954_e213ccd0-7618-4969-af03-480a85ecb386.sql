-- Create table for table reservations
CREATE TABLE public.table_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date DATE NOT NULL,
  time TIME NOT NULL,
  guests INTEGER NOT NULL DEFAULT 2,
  table_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.table_reservations ENABLE ROW LEVEL SECURITY;

-- Create policies for access
CREATE POLICY "Staff can view all reservations" 
ON public.table_reservations 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can create reservations" 
ON public.table_reservations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Staff can update reservations" 
ON public.table_reservations 
FOR UPDATE 
USING (true);

CREATE POLICY "Staff can delete reservations" 
ON public.table_reservations 
FOR DELETE 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_table_reservations_updated_at
BEFORE UPDATE ON public.table_reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();