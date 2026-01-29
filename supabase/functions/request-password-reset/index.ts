import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_SECONDS = 60;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check Rate Limit
    const now = Date.now();
    const lastRequest = rateLimitMap.get(normalizedEmail);
    if (lastRequest && now - lastRequest < RATE_LIMIT_SECONDS * 1000) {
      const remainingSeconds = Math.ceil((RATE_LIMIT_SECONDS * 1000 - (now - lastRequest)) / 1000);
      return new Response(
        JSON.stringify({ error: `Please wait ${remainingSeconds} seconds before requesting again` }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }
    rateLimitMap.set(normalizedEmail, now);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) {
      console.error("Error listing users:", userError);
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email will be sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const userExists = users.users.some((u: any) => u.email?.toLowerCase() === normalizedEmail);

    if (!userExists) {
      console.log("User not found, but returning success for security");
      return new Response(
        JSON.stringify({ success: true, message: "If an account exists, a reset email will be sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const rawToken = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const encoder = new TextEncoder();
    const data = encoder.encode(rawToken);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("email", normalizedEmail)
      .is("used_at", null);

    const { error: insertError } = await supabase.from("password_reset_tokens").insert({
      email: normalizedEmail,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Error storing token:", insertError);
      throw new Error("Failed to create reset token");
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const resetUrl = `https://shinonakel.com/reset-password?token=${rawToken}`;

    const { error: emailError } = await resend.emails.send({
      from: "Shino Nakel <info@shinonakel.com>",
      to: [normalizedEmail],
      subject: "إعادة تعيين كلمة المرور - شنو ناكل",
      html: `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            .btn-reset:hover {
              background: linear-gradient(135deg, #D93644 0%, #C22E3C 100%) !important;
            }
          </style>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); direction: rtl; text-align: right;">
            <div style="background: linear-gradient(135deg, #EB4B59 0%, #D93644 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">شنو ناكل؟</h1>
            </div>
            <div style="padding: 30px; text-align: right;">
              <h2 style="color: #1a1a1a; margin-top: 0;">إعادة تعيين كلمة المرور</h2>
              <p style="color: #666666; line-height: 1.6;">
                لقد طلبت إعادة تعيين كلمة المرور لحسابك. اضغط على الزر أدناه لإنشاء كلمة مرور جديدة.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" class="btn-reset" style="display: inline-block; background: linear-gradient(135deg, #EB4B59 0%, #D93644 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  إعادة تعيين كلمة المرور
                </a>
              </div>
              <p style="color: #999999; font-size: 14px; line-height: 1.6;">
                هذا الرابط صالح لمدة ساعة واحدة فقط. إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذا البريد.
              </p>
              <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;">
              <p style="color: #cccccc; font-size: 12px; text-align: right;">
                &copy; ${new Date().getFullYear()} Shino Nakel. جميع الحقوق محفوظة.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailError) {
      console.error("Error sending email:", emailError);
      throw new Error("Failed to send reset email");
    }

    console.log(`Password reset email sent to ${normalizedEmail}`);

    return new Response(
      JSON.stringify({ success: true, message: "If an account exists, a reset email will be sent" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("Error in request-password-reset:", error);
    return new Response(JSON.stringify({ error: error.message || "An error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});