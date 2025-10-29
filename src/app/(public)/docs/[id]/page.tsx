"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BlockNoteViewer from "@/components/BlockNoteViewer";
import { formatRelativeDate } from "@/utils/formatRelativeDate";

type Doc = {
  id: string;
  title: string;
  content?: any | null;
  created_at: string;
  updated_at?: string | null;
  user_id?: string | null;
  category?: string | null;
};

type Author = {
  id: string | null;
  full_name: string | null;
  email: string | null;
};

type TocItem = {
  id: string;
  text: string;
  level: number; // 1..3
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s\_]+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-");
}

function extractHeadings(blocks: any[] | null | undefined): TocItem[] {
  if (!Array.isArray(blocks)) return [];
  const result: TocItem[] = [];
  const used = new Map<string, number>();

  const walk = (nodes: any[]) => {
    for (const node of nodes) {
      if (node?.type === "heading" && node?.props?.level) {
        const level = Number(node.props.level);
        if (level >= 1 && level <= 3) {
          const text =
            Array.isArray(node.content)
              ? node.content.map((c: any) => c?.text || "").join("")
              : "";
          let base = slugify(text || "section");
          const n = (used.get(base) || 0) + 1;
          used.set(base, n);
          const id = n > 1 ? `${base}-${n}` : base;
          result.push({ id, text: text || `Heading ${result.length + 1}`, level });
        }
      }
      if (Array.isArray(node?.children) && node.children.length) {
        walk(node.children);
      }
    }
  };
  walk(blocks);
  return result;
}

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
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0); // 0..1
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [barHeight, setBarHeight] = useState(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("docs")
          .select("*")
          .eq("id", id)
          .eq("is_public", true)
          .single();

        if (error || !data) {
          setErr("Dokumen tidak ditemukan atau tidak publik.");
          setDoc(null);
          return;
        }

        setDoc({
          ...data,
          content: tryParseJSON(data.content),
        });

        if (data.user_id) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("*")
            .eq("clerk_id", data.user_id)
            .limit(1)
            .single();

          if (!userError && userData) {
            setAuthor({
              ...userData,
            });
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const toc = useMemo<TocItem[]>(
    () => extractHeadings(doc?.content),
    [doc?.content]
  );
  
  // Pasang id ke h1..h3 yang dirender, sinkron dengan TOC (MutationObserver)
  useEffect(() => {
    if (loading) return;                // JANGAN jalan saat masih loading
    if (!contentRef.current || !toc.length) return;
    const container = contentRef.current;

    const applyIds = () => {
      const headings = Array.from(container.querySelectorAll("h1, h2, h3"));
      let i = 0;
      for (const el of headings) {
        if (!toc[i]) break;
        const wantId = toc[i].id;
        if (el.id !== wantId) el.id = wantId;
        i++;
      }
    };

    const raf = requestAnimationFrame(applyIds);
    const mo = new MutationObserver(() => applyIds());
    mo.observe(container, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
    };
  }, [toc, loading]); // tambahkan loading

  // Progress bar: hitung progres scroll relatif ke konten
  useEffect(() => {
    if (loading) return;                // tunggu sampai konten ter-mount
    const OFFSET = 96;
    let ticking = false;
    const calc = () => {
      const el = contentRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const topDoc = window.scrollY + rect.top;
      const start = topDoc - OFFSET;
      const end = topDoc + rect.height - window.innerHeight;
      const denom = Math.max(1, end - start);
      let p = (window.scrollY - start) / denom;
      if (end <= start) p = window.scrollY > start ? 1 : 0;
      setProgress(Math.max(0, Math.min(1, p)));
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        calc();
        ticking = false;
      });
    };
    calc();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [doc?.content, loading]); // tambahkan loading
  
  // Ukur tinggi area menu "On this page" agar progress bar mengikuti area ini saja
  useEffect(() => {
    if (loading) return;                // tunggu mount
    const el = menuRef.current;
    if (!el) return;
    const update = () => setBarHeight(el.clientHeight || 0);
    const raf = requestAnimationFrame(update);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } else {
      window.addEventListener("resize", update);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", update);
    };
  }, [toc.length, loading]); // tambahkan loading

  const handleTocClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const OFFSET = 96;
    const tryScroll = () => {
      const el = document.getElementById(id);
      if (!el) return false;
      const y = el.getBoundingClientRect().top + window.scrollY - OFFSET;
      window.scrollTo({ top: y, behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
      return true;
    };
    if (!tryScroll()) {
      // Jika id belum terpasang (DOM baru berubah), coba di frame berikutnya
      requestAnimationFrame(() => { tryScroll(); });
    }
  };

  const header = useMemo(() => {
    if (!doc) return null;

    const lastUpdated = doc.updated_at || doc.created_at;
    const displayAuthor = author?.full_name || author?.email || null;

    return (
      <div className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{doc.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-400">
            {displayAuthor && (
                <>
                    <span>By {displayAuthor}</span>
                    <span>•</span>
                </>
            )}
            <span>Last updated {formatRelativeDate(lastUpdated)}</span>
        </div>
      </div>
    );
  }, [doc, author]);

  // Skeleton saat loading
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 border-b border-gray-200 pb-6">
          <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <span className="text-gray-300">•</span>
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
          {/* Main content skeleton */}
          <div className="lg:col-span-9">
            <div className="space-y-4">
              <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-11/12 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-10/12 bg-gray-200 rounded animate-pulse" />
              <div className="h-64 w-full bg-gray-100 border border-gray-200 rounded animate-pulse" />
              <div className="h-4 w-9/12 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-8/12 bg-gray-200 rounded animate-pulse" />
              <div className="h-40 w-full bg-gray-100 border border-gray-200 rounded animate-pulse" />
            </div>
          </div>

          {/* On this page skeleton */}
          <aside className="lg:col-span-3">
            <div className="sticky top-24">
              <div className="h-4 w-32 bg-gray-200 rounded mb-3 animate-pulse" />
              <div className="flex items-start gap-3">
                {/* Progress bar skeleton */}
                <div aria-hidden="true">
                  <div className="relative w-0.5 bg-gray-200 rounded-full overflow-hidden h-48">
                    <div className="absolute top-0 left-0 w-0.5 bg-gray-300 rounded-full h-20 animate-pulse" />
                  </div>
                </div>
                {/* Menu skeleton */}
                <div className="flex-1 pr-2">
                  <div className="space-y-2">
                    <div className="h-3 w-40 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="h-3 w-44 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // Scroll-margin agar anchor tidak tertutup header
  return (
    <div className="max-w-7xl mx-auto">
      {header}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
        {/* Main content */}
        <div className="lg:col-span-9">
          <div ref={contentRef} className="prose prose-gray max-w-none">
            {doc?.content ? (
              <BlockNoteViewer content={doc.content} />
            ) : (
              <p>Belum ada konten.</p>
            )}
          </div>
        </div>

        {/* On this page */}
        <aside className="lg:col-span-3">
          <div className="sticky top-24">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">On this page</h3>
            <div className="flex items-start gap-3">
              {/* Progress bar vertikal mengikuti tinggi menu */}
              <div className="relative" aria-hidden="true">
                <div
                  className="w-0.5 bg-gray-200 rounded-full overflow-hidden"
                  style={{ height: barHeight ? `${barHeight}px` : undefined }}
                >
                  <div
                    className="absolute left-0 top-0 w-0.5 bg-gray-900 rounded-full"
                    style={{ height: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              </div>
              {/* Daftar TOC */}
              <div
                ref={menuRef}
                className="flex-1 max-h-[calc(100vh-6rem)] overflow-auto pr-2"
              >
                {toc.length ? (
                  <nav className="text-sm">
                    <ul className="space-y-1">
                      {toc.map((h) => (
                        <li key={h.id}>
                          <a
                            href={`#${h.id}`}
                            onClick={(e) => handleTocClick(e, h.id)}
                            className="block text-gray-600 hover:text-gray-900 transition-colors"
                            style={{ marginLeft: (h.level - 1) * 12 }}
                          >
                            {h.text}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                ) : (
                  <p className="text-sm text-gray-500">Tidak ada heading.</p>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Scroll-margin agar anchor tidak tertutup header */}
      <style jsx global>{`
        .prose h1, .prose h2, .prose h3 { scroll-margin-top: 96px; }
      `}</style>
    </div>
  );
}