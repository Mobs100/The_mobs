import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const required = (form: FormData, key: string) => {
  const value = String(form.get(key) ?? '').trim();
  if (!value) throw new Error(`Missing required field: ${key}`);
  return value;
};

const safeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ success: false, error: 'Supabase server configuration is incomplete.' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let createdUserId: string | null = null;
  const uploadedPaths: string[] = [];

  try {
    const form = await req.formData();
    const username = required(form, 'username').toLowerCase();
    const password = required(form, 'password');
    const fullName = required(form, 'fullName');
    const phone = required(form, 'phone');
    const email = required(form, 'email').toLowerCase();
    const city = required(form, 'city');
    const nationalAddress = required(form, 'nationalAddress');
    const idNumber = required(form, 'idNumber');
    const vehicleType = required(form, 'vehicleType');
    const vehicleMake = required(form, 'vehicleMake');
    const vehicleModel = required(form, 'vehicleModel');
    const vehicleYear = required(form, 'vehicleYear');
    const plate = required(form, 'plate');

    if (!/^[a-z0-9._-]{3,24}$/.test(username)) throw new Error('Invalid username.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');
    if (!/^05\d{8}$/.test(phone)) throw new Error('Invalid Saudi mobile number.');

    const identity = form.get('identity');
    const vehicle = form.get('vehicle');
    if (!(identity instanceof File) || !(vehicle instanceof File)) {
      throw new Error('Identity image and vehicle image are required.');
    }

    const { data: existingUsername } = await admin
      .from('driver_profiles')
      .select('id')
      .ilike('username', username)
      .limit(1);
    if (existingUsername?.length) throw new Error('This username is already registered.');

    const { data: existingPhone } = await admin
      .from('driver_profiles')
      .select('id')
      .eq('phone', phone)
      .limit(1);
    if (existingPhone?.length) throw new Error('This phone number is already registered.');

    const { data: existingEmail } = await admin
      .from('driver_profiles')
      .select('id')
      .ilike('email', email)
      .limit(1);
    if (existingEmail?.length) throw new Error('This email is already registered.');

    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (userError) throw userError;
    createdUserId = userData.user.id;

    const upload = async (file: File, folder: string) => {
      const path = `${createdUserId}/${folder}-${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await admin.storage.from('driver-documents').upload(path, file, {
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });
      if (error) throw error;
      uploadedPaths.push(path);
      return path;
    };

    const idDocumentPath = await upload(identity, 'identity');
    const vehicleImagePath = await upload(vehicle, 'vehicle');
    const licenseFile = form.get('license');
    const registrationFile = form.get('registration');
    const licenseDocumentPath = licenseFile instanceof File ? await upload(licenseFile, 'license') : null;
    const vehicleRegistrationPath = registrationFile instanceof File ? await upload(registrationFile, 'registration') : null;

    const { error: profileError } = await admin.from('driver_profiles').insert({
      user_id: createdUserId,
      username,
      full_name: fullName,
      phone,
      email,
      city,
      date_of_birth: String(form.get('dateOfBirth') ?? '').trim() || null,
      nationality: String(form.get('nationality') ?? '').trim() || null,
      national_address: nationalAddress,
      id_number: idNumber,
      vehicle_type: vehicleType,
      vehicle_make: vehicleMake,
      vehicle_model: vehicleModel,
      vehicle_year: Number(vehicleYear) || null,
      plate_number: plate,
      id_document_path: idDocumentPath,
      vehicle_image_path: vehicleImagePath,
      license_document_path: licenseDocumentPath,
      vehicle_registration_path: vehicleRegistrationPath,
      status: 'pending',
      availability_status: 'offline',
    });

    if (profileError) throw profileError;

    return json({ success: true, message: 'Application submitted. Your account is pending Admin approval.' });
  } catch (error) {
    for (const path of uploadedPaths) {
      await admin.storage.from('driver-documents').remove([path]).catch(() => {});
    }
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId).catch(() => {});

    const message = error instanceof Error ? error.message : 'Unable to submit application.';
    return json({ success: false, error: message }, 400);
  }
});
