"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function DashboardClient({ userEmail }: { userEmail: string }) {
    const supabase = createClient();

    useEffect(() => {
        console.log("Dashboard yuklandi");
    }, []);

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold">Xush kelibsiz, {userEmail}!</h1>
            <button
                onClick={() => supabase.auth.signOut().then(() => window.location.href = "/login")}
                className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg"
            >
                Chiqish
            </button>
        </div>
    );
}