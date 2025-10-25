import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
    "/",               // halaman landing
    "/sign-in(.*)",    // halaman login
    "/sign-up(.*)",    // halaman register
    "/docs(.*)",       // dokumentasi publik - TAMBAHKAN INI
    "/api/webhook(.*)" // kalau kamu pakai webhook
]);

export default clerkMiddleware(async (auth, req) => {
    // ✅ Jangan proteksi route publik
    if (isPublicRoute(req)) return;

    // 🚧 Proteksi semua route lainnya
    await auth.protect();
});

export const config = {
    matcher: [
        // Jalankan middleware untuk semua route kecuali file statis
        "/((?!_next|[^?]*\\.(?:html?|css|js|json|jpe?g|png|svg|ico|woff2?|ttf)).*)",
    ],
};
