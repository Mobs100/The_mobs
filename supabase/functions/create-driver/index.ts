import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const USERNAME_RE = /^[a-zA-Z0-9._-]{3,24}$/;
const PHONE_RE = /^05\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

function getFile(form: FormData, key: string, required = false): File | null {
  const value = form.get(key);
  if (!(value instanceof File) || value.size === 0) {
    if (required) throw new Error(`Missing required file: ${key}`);
    return null;
  }
  if (value.size > MAX_FILE_SIZE) throw new Error(`${key} is too large. Maximum file size is 10 MB.`);
  return value;
}

async function uploadFile(admin: ReturnType<typeof createClient>, userId: string, file: File, folder: string) {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const path = `${userId}/${folder}-${crypto.randomUUID()}.${ext}`;
  const { error } = await admin.storage.from("driver-documents").upload(path, file, {
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw error;
  return path;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ success: false, error: "Server configuration is incomplete." }, 500);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let userId: string | null = null;
  const uploadedPaths: string[] = [];

  try {
    const form = await req.formData();
    const username = text(form, "username").toLowerCase();
    const password = String(form.get("password") ?? "");
    const fullName = text(form, "fullName");
    const phone = text(form, "phone");
    const email = text(form, "email").toLowerCase();
    const city = text(form, "city");
    const dateOfBirth = text(form, "dateOfBirth") || null;
    const nationality = text(form, "nationality") || null;
    const nationalAddress = text(form, "nationalAddress");
    const idNumber = text(form, "idNumber");
    const vehicleType = text(form, "vehicleType");
    const vehicleMake = text(form, "vehicleMake");
    const vehicleModel = text(form, "vehicleModel");
    const vehicleYearRaw = text(form, "vehicleYear");
    const plate = text(form, "plate");

    if (!USERNAME_RE.test(username)) throw new Error("Username must be 3–24 characters: letters, numbers, dot, dash or underscore.");
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    if (!fullName || !PHONE_RE.test(phone) || !EMAIL_RE.test(email) || !city || !nationalAddress || !idNumber || !vehicleType || !vehicleMake || !vehicleModel || !vehicleYearRaw || !plate) {
      throw new Error("Complete all required personal and vehicle fields.");
    }

    const vehicleYear = Number(vehicleYearRaw);
    if (!Number.isInteger(vehicleYear) || vehicleYear < 1900 || vehicleYear > new Date().getFullYear() + 1) throw new Error("Enter a valid vehicle year.");

    const identity = getFile(form, "identity", true)!;
    const vehicle = getFile(form, "vehicle", true)!;
    const license = getFile(form, "license");
    const registration = getFile(form, "registration");

    const { data: existing, error: existingError } = await admin
      .from("driver_profiles").select("id").eq("username", username).maybeSingle();
    if (existingError) throw existingError;
    if (existing) throw new Error("That username is already taken.");

    const authEmail = `${username}@drivers.themobs.internal`;
    const { data: created, error: authError } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, driver: true, contact_email: email },
    });
    if (authError) throw authError;
    if (!created?.user?.id) throw new Error("Unable to create the driver account.");
    userId = created.user.id;

    const identityPath = await uploadFile(admin, userId, identity, "identity"); uploadedPaths.push(identityPath);
    const vehiclePath = await uploadFile(admin, userId, vehicle, "vehicle"); uploadedPaths.push(vehiclePath);
    const licensePath = license ? await uploadFile(admin, userId, license, "license") : null; if (licensePath) uploadedPaths.push(licensePath);
    const registrationPath = registration ? await uploadFile(admin, userId, registration, "registration") : null; if (registrationPath) uploadedPaths.push(registrationPath);

    const { error: profileError } = await admin.from("driver_profiles").insert({
      user_id: userId, username, full_name: fullName, phone, email, city,
      date_of_birth: dateOfBirth, nationality, national_address: nationalAddress,
      id_number: idNumber, vehicle_type: vehicleType, vehicle_make: vehicleMake,
      vehicle_model: vehicleModel, vehicle_year: vehicleYear, plate_number: plate,
      id_document_path: identityPath, vehicle_image_path: vehiclePath,
      license_document_path: licensePath, vehicle_registration_path: registrationPath,
      status: "pending", availability_status: "offline",
    });
    if (profileError) throw profileError;

    return json({ success: true, message: "Application submitted. Your account is pending Admin approval." });
  } catch (error) {
    console.error("create-driver error:", error);
    if (userId) {
      for (const path of uploadedPaths) {
        try { await admin.storage.from("driver-documents").remove([path]); } catch {}
      }
      try { await admin.auth.admin.deleteUser(userId); } catch {}
    }
    const message = error instanceof Error ? error.message : String(error || "Unable to submit application.");
    return json({ success: false, error: message }, 400);
  }
});
