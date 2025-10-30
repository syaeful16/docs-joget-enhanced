import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const DEBUG =
    (process.env.DEBUG_UPLOAD || "").toLowerCase() === "1" ||
    (process.env.NODE_ENV === "development" && process.env.DEBUG_UPLOAD !== "0");
  const reqId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const log = (...args: any[]) => {
    if (DEBUG) console.log("[upload_image]", reqId, ...args);
  };

  try {
    const data = await request.formData();
    const file: File | null = (data.get("file") as unknown) as File;
    const folder = (data.get("folder") as string) || "images"; // optional folder prefix

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded", reqId }, { status: 400 });
    }

    // Validate file type (allow common images)
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes((file as any).type)) {
      return NextResponse.json(
        {
          success: false,
          error: "File type not allowed. Only JPEG, PNG, GIF, WebP, and SVG are allowed.",
          reqId,
        },
        { status: 415 }
      );
    }

    // Validate file size (max 2MB by default)
    const MAX = 2 * 1024 * 1024;
    if (file.size > MAX) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 2MB.", size: file.size, max: MAX, reqId },
        { status: 413 }
      );
    }

    // Prepare object path
    const orig = (file as any).name || "image";
    const ext = path.extname(orig) || "";
    const base = path
      .basename(orig, ext)
      .toLowerCase()
      .replace(/[^a-z0-9\-_. ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50) || "img";
    const filename = `${base}-${Date.now()}${ext || ""}`;
    const bucket = process.env.NEXT_SUPABASE_S3_BUCKET_UPLOADS || process.env.NEXT_SUPABASE_S3_BUCKET || "uploads";
    const objectPath = `${folder}/${filename}`;
    log("Incoming file", { name: orig, size: file.size, type: (file as any).type, bucket, objectPath });

    // Prefer S3-compatible upload if env provided; else fallback to Supabase Storage via admin client
    const s3Endpoint = process.env.NEXT_SUPABASE_S3_ENDPOINT;
    const s3AccessKeyId = process.env.NEXT_SUPABASE_S3_ACCESS_KEY_ID;
    const s3SecretAccessKey = process.env.NEXT_SUPABASE_S3_SECRET_ACCESS_KEY;
    const s3Region = process.env.NEXT_SUPABASE_S3_REGION || "us-east-2";
    log("Env check", {
      s3Endpoint: !!s3Endpoint,
      s3AccessKeyId: s3AccessKeyId ? `${s3AccessKeyId.slice(0, 4)}...(${s3AccessKeyId.length})` : undefined,
      s3SecretAccessKey: s3SecretAccessKey ? `len(${s3SecretAccessKey.length})` : undefined,
      s3Region,
      bucket,
      nextPublicUrl: (process.env.NEXT_PUBLIC_SUPABASE_URL || "").slice(0, 24) + "...",
    });

    if (s3Endpoint && s3AccessKeyId && s3SecretAccessKey) {
      try {
        const s3 = new S3Client({
          region: s3Region,
          endpoint: s3Endpoint,
          forcePathStyle: true,
          credentials: { accessKeyId: s3AccessKeyId, secretAccessKey: s3SecretAccessKey },
        });
        const bytes = await file.arrayBuffer();
        const body = Buffer.from(bytes);
        log("Uploading via S3", { endpoint: s3Endpoint, region: s3Region, bucket, key: objectPath, size: body.length });
        const res = await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectPath,
            Body: body,
            ContentType: (file as any).type || undefined,
            CacheControl: "public, max-age=3600",
          })
        );
        log("S3 upload OK", { etag: (res as any)?.ETag });
      } catch (err: any) {
        log("S3 upload failed", { name: err?.name, message: err?.message, code: err?.code });
        return NextResponse.json({ success: false, error: "S3_UPLOAD_FAILED", reqId }, { status: 500 });
      }
    } else {
      try {
        const { getSupabaseAdminClient } = await import("@/lib/supabaseServerClient");
        const sb = getSupabaseAdminClient();
        const bytes = await file.arrayBuffer();
        const body = new Uint8Array(bytes);
        log("Uploading via Supabase Storage (admin)", { bucket, objectPath });
        const { error: upErr } = await sb.storage
          .from(bucket)
          .upload(objectPath, body, {
            cacheControl: "3600",
            upsert: false,
            contentType: (file as any).type || undefined,
          });
        if (upErr) {
          log("Supabase upload failed", { message: upErr?.message });
          return NextResponse.json({ success: false, error: "UPLOAD_FAILED", reqId }, { status: 500 });
        }
      } catch (err: any) {
        log("Supabase admin client error", { message: err?.message });
        return NextResponse.json({ success: false, error: "SERVER_MISCONFIGURED", reqId }, { status: 500 });
      }
    }

    // Construct public URL (requires public bucket)
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publicUrl = baseUrl
      ? `${baseUrl}/storage/v1/object/public/${bucket}/${objectPath}`
      : undefined;
    log("Done", { publicUrl, bucket, objectPath });

    return NextResponse.json({ success: true, url: publicUrl, filename });
  } catch (error) {
    console.error("[upload_image]", reqId, "Unhandled error", error);
    return NextResponse.json({ success: false, error: "Failed to upload file", reqId }, { status: 500 });
  }
}