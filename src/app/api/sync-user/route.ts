import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            console.error("Unauthorized: No userId found");
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await currentUser();

        if (!user) {
            console.error("User not found in Clerk");
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Cek apakah user sudah ada di Supabase
        const { data: existingUser, error: selectError } = await supabase
            .from("users")
            .select("*")
            .eq("clerk_id", user.id)
            .maybeSingle();

        if (selectError) {
            console.error("Select error:", selectError);
            return NextResponse.json({ error: selectError.message }, { status: 500 });
        }

        if (!existingUser) {
            console.log("Inserting new user:", user.id);
            const { error: insertError } = await supabase.from("users").insert([
                {
                clerk_id: user.id,
                email: user.primaryEmailAddress?.emailAddress,
                full_name: user.fullName,
                },
            ]);

            if (insertError) {
                console.error("Insert error:", insertError);
                return NextResponse.json({ error: insertError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Unexpected error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
