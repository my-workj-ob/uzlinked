import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && session) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", session.user.id)
          .single();

        if (!profile) {
          await supabase.from("profiles").insert([
            {
              id: session.user.id,
              nickname: session.user.user_metadata.full_name || "Yangi foydalanuvchi"
            }
          ]);
        }

        return NextResponse.redirect(new URL("/dashboard", request.url));
      } catch (error) {
        console.error('Error creating profile:', error);
        return NextResponse.redirect(new URL("/login?error=profile_creation_failed", request.url));
      }
    } else {
      console.error('Authentication error:', error);
      return NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
