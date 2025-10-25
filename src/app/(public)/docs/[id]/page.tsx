"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BlockNoteViewer from "@/components/BlockNoteViewer";
import { log } from "console";

type Doc = {
  id: string;
  title: string;
  content: any;
  created_at: string;
  category?: string | null;
};

function tryParseJSON(value: any) {
  if (!value) return null;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function PublicDocPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string | undefined;

  console.log(id);
  

  const [doc, setDoc] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("docs")
          .select("id,title,content,created_at,category")
          .eq("id", id)
          .eq("is_public", true)
          .single();

        if (error || !data) {
          setErr("Dokumen tidak ditemukan atau tidak publik.");
          setDoc(null);
          return;
        }

        console.log(data);

        setDoc({
          ...data,
          content: tryParseJSON(data.content),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const header = useMemo(() => {
    if (!doc) return null;
    return (
      <div className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{doc.title}</h1>
      </div>
    );
  }, [doc]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    );
  }

  if (err || !doc) {
    return (
      <div className="prose max-w-none">
        <h1>Not found</h1>
        <p>{err || "Dokumen tidak ditemukan."}</p>
      </div>
    );
  }

  return (
    <div className="prose prose-gray max-w-none">
      {header}
      {doc.content ? (
        <div>
          {/* BlockNote Viewer will render headings; TOC akan mengambil h2/h3 dari hasil render */}
          <BlockNoteViewer content={doc.content} />
        </div>
      ) : (
        <p>Belum ada konten.</p>
      )}
    </div>
  );
}