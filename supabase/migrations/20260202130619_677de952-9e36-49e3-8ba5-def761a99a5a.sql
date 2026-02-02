-- Allow admins and moderators to delete any rating
CREATE POLICY "Admins and moderators can delete any rating" 
ON public.restaurant_ratings 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);