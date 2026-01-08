import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 🔐 Get logged-in user from JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: authHeader } }
    }
  );

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // ✅ Check admin
  const { data: admin } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!admin?.is_admin) {
    return new Response("Forbidden", { status: 403 });
  }

  // 📄 Fetch pending KYC
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, id_type, id_front_url, id_back_url")
    .eq("kyc_status", "pending");

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" }
  });
});
