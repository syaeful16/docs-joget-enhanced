import { NextResponse } from "next/server";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    console.log("first line inside try");
      const DEBUG = (process.env.DEBUG_UPLOAD || "").toLowerCase() === "1" || (process.env.NODE_ENV === "development" && process.env.DEBUG_UPLOAD !== "0");
      const reqId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const mask = (v?: string | null, keep: number = 4) => (v ? `${v.slice(0, keep)}...(${v.length})` : undefined);
      const log = (...args: any[]) => { if (DEBUG) console.log("[upload]", reqId, ...args); };
      log("first line inside try");

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const docId = String(form.get("docId") ?? "misc");
    if (!file || file.size === 0) {
      log("No file received or size zero", { docId });
      return NextResponse.json({ error: "NO_FILE", reqId }, { status: 400 });
    }
    // Batasi ukuran file 2MB
    const MAX = 2 * 1024 * 1024;
    if (file.size > MAX) {
      log("File too large", { size: file.size, max: MAX, name: file.name });
      return NextResponse.json({ error: "FILE_TOO_LARGE", reqId, size: file.size, max: MAX }, { status: 413 });
    }
    // Bucket and path
    const bucket = process.env.NEXT_SUPABASE_S3_BUCKET || "changelog";
    const orig = file.name || "attachment";
    const ext = path.extname(orig);
    const base = path
      .basename(orig, ext)
      .toLowerCase()
      .replace(/[^a-z0-9\-_. ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50) || "file";
    const filename = `${base}-${Date.now()}${ext}`;
    const objectPath = `${docId}/${filename}`;
    log("Incoming file", { name: orig, size: file.size, type: (file as any)?.type, bucket, objectPath, docId });

    // Prefer S3-compatible upload if env provided; else fallback to Supabase Storage via admin client
    const s3Endpoint = process.env.NEXT_SUPABASE_S3_ENDPOINT;
    const s3AccessKeyId = process.env.NEXT_SUPABASE_S3_ACCESS_KEY_ID;
    const s3SecretAccessKey = process.env.NEXT_SUPABASE_S3_SECRET_ACCESS_KEY;
    const s3Region = process.env.NEXT_SUPABASE_S3_REGION || "us-east-2";
    log("Env check", {
      s3Endpoint: !!s3Endpoint,
      s3AccessKeyId: mask(s3AccessKeyId),
      s3SecretAccessKey: s3SecretAccessKey ? `len(${s3SecretAccessKey.length})` : undefined,
      s3Region,
      bucket,
      nextPublicUrl: mask(process.env.NEXT_PUBLIC_SUPABASE_URL || "", 10)
    });

    if (s3Endpoint && s3AccessKeyId && s3SecretAccessKey) {
      try {
        const s3 = new S3Client({
          region: s3Region,
          endpoint: s3Endpoint,
          forcePathStyle: true,
          credentials: {
            accessKeyId: s3AccessKeyId,
            secretAccessKey: s3SecretAccessKey,
          },
        });
        const bytes = await file.arrayBuffer();
        const body = Buffer.from(bytes);
        log("Uploading via S3", { endpoint: s3Endpoint, region: s3Region, bucket, key: objectPath, size: body.length });
        const res = await s3.send(new PutObjectCommand({
          Bucket: bucket,
          Key: objectPath,
          Body: body,
          ContentType: (file as any).type || undefined,
          CacheControl: "public, max-age=3600",
        }));
        log("S3 upload OK", { etag: (res as any)?.ETag, $metadata: (res as any)?.$metadata });
      } catch (err: any) {
        log("S3 upload failed", { name: err?.name, message: err?.message, code: err?.code, $metadata: err?.$metadata });
        return NextResponse.json({ error: "S3_UPLOAD_FAILED", reqId, detail: DEBUG ? { name: err?.name, message: err?.message, code: err?.code } : undefined }, { status: 500 });
      }
    } else {
      // Supabase admin client (service role) upload - loaded lazily to avoid requiring service key in S3-only setups
      try {
        const { getSupabaseAdminClient } = await import("@/lib/supabaseServerClient");
        const sb = getSupabaseAdminClient();
        log("Uploading via Supabase Storage (admin)", { bucket, objectPath });
        const bytes = await file.arrayBuffer();
        const body = new Uint8Array(bytes);
        const { error: upErr } = await sb.storage
          .from(bucket)
          .upload(objectPath, body, {
            cacheControl: "3600",
            upsert: false,
            contentType: (file as any).type || undefined,
          });
        if (upErr) {
          log("Supabase upload failed", { message: upErr?.message, name: upErr?.name, stack: DEBUG ? upErr?.stack : undefined });
          return NextResponse.json({ error: "UPLOAD_FAILED", reqId, detail: DEBUG ? upErr?.message : undefined }, { status: 500 });
        }
      } catch (err: any) {
        log("Supabase admin client error", { message: err?.message });
        return NextResponse.json({ error: "SERVER_MISCONFIGURED", reqId, detail: DEBUG ? err?.message : undefined }, { status: 500 });
      }
    }

    // Construct public URL (requires bucket to be public)
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicUrl = baseUrl
      ? `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
      : undefined;
    log("Done", { publicUrl, bucket, objectPath });

    return NextResponse.json({
      url: publicUrl,
      name: orig,
      storedName: filename,
      path: objectPath,
      bucket,
      reqId,
    });
  } catch (e: unknown) {
    const DEBUG = (process.env.DEBUG_UPLOAD || "").toLowerCase() === "1" || (process.env.NODE_ENV === "development" && process.env.DEBUG_UPLOAD !== "0");
    const reqId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    console.error("[upload]", reqId, "Unhandled error", e);
    const message = typeof e === "object" && e !== null && "toString" in (e as any) ? String(e) : (e as any)?.message || String(e);
    return NextResponse.json({ error: "UPLOAD_FAILED", reqId, detail: DEBUG ? message : undefined }, { status: 500 });
  }
}