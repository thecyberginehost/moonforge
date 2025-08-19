-- Function to update existing tokens with new program ID
CREATE OR REPLACE FUNCTION public.update_existing_tokens_program_id(
  new_program_id text,
  old_program_id text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  updated_count integer;
BEGIN
  -- Update bonding_curve_address for tokens that still have the placeholder
  UPDATE public.tokens 
  SET 
    bonding_curve_address = REPLACE(bonding_curve_address, old_program_id, new_program_id),
    updated_at = now()
  WHERE bonding_curve_address LIKE '%' || old_program_id || '%';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$function$;