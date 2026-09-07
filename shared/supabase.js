import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://pcundfmldniuemtbjnop.supabase.co';
const supabaseKey = 'sb_publishable_hQy6k4JCxvq6UVf7Lzf_ow_a45kiq_O';

const supabase = createClient(
  supabaseUrl,
  supabaseKey
);

// Make the same client available to the existing app modules.
// The Customer, Admin and Delivery apps read window.MOBS_SUPABASE.
window.MOBS_SUPABASE = supabase;

export { supabase };
