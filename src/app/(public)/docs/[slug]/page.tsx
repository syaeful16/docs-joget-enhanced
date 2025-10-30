"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BlockNoteViewer from "@/components/BlockNoteViewer";
import { formatRelativeDate } from "@/utils/formatRelativeDate";
import { History } from "lucide-react";

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
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  console.log("Viewing public document with slug:", slug);

  const [doc, setDoc] = useState<Doc | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0); // 0..1
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [barHeight, setBarHeight] = useState(0);

  // Change Log state (public view - read-only)
  type DocChangelog = {
    id: string;
    created_at: string;
    doc_id: string;
    version: string;
    description: string;
    file_url: string | null;
    file_name: string | null;
  };
  const [clSheetOpen, setClSheetOpen] = useState(false);
  const [clSheetVisible, setClSheetVisible] = useState(false);
  const [changelogs, setChangelogs] = useState<DocChangelog[]>([]);
  const [loadingCL, setLoadingCL] = useState(false);
  const [errorCL, setErrorCL] = useState<string | null>(null);

  const openClSheet = () => {
    setClSheetOpen(true);
    requestAnimationFrame(() => setClSheetVisible(true));
  };
  const closeClSheet = () => {
    setClSheetVisible(false);
    setTimeout(() => setClSheetOpen(false), 200);
  };

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("docs")
          .select("*")
          .eq("slug", slug)
          .eq("is_public", true)
          .single();

        if (error || !data) {
          setErr("Dokumen tidak ditemukan atau tidak publik.");
          setDoc(null);
          setAuthor(null);
          return;
        }

        setDoc({
          id: data.id,
          title: data.title,
          content: tryParseJSON(data.content),
          created_at: data.created_at,
          updated_at: data.updated_at ?? null,
          user_id: data.user_id ?? null,
          category: data.category ?? null,
        });

        if (data.user_id) {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("id, full_name, email")
            .eq("clerk_id", data.user_id)
            .limit(1)
            .single();
          if (!userError && userData) setAuthor(userData);
        }

        // Load Change Logs after doc is set
        if (data.id) {
          setLoadingCL(true);
          setErrorCL(null);
          const { data: clData, error: clError } = await supabase
            .from("doc_changelogs")
            .select("id, created_at, doc_id, version, description, file_url, file_name")
            .eq("doc_id", data.id)
            .order("created_at", { ascending: false });
          if (clError) setErrorCL("Gagal memuat change log");
          else setChangelogs((clData as DocChangelog[]) || []);
          setLoadingCL(false);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

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
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{doc.title}</h1>
          <button
            type="button"
            onClick={openClSheet}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900"
            title="Change Log"
          >
            <History className="w-4 h-4" />
            Change Log
          </button>
        </div>
    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-400">
            {displayAuthor && (
                <>
                    <span>By {displayAuthor}</span>
                    <span>•</span>
                </>
            )}
      <span>Last updated {formatDateStable(lastUpdated)}</span>
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

      {/* Change Log Sheet (right-side drawer) */}
      {clSheetOpen && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${clSheetVisible ? "opacity-100" : "opacity-0"}`}
            onClick={() => closeClSheet()}
          />
          {/* Drawer */}
          <div className={`absolute inset-y-0 right-0 w-full sm:max-w-xl bg-white border-l border-gray-200 shadow-xl transform transition-transform duration-200 ${clSheetVisible ? "translate-x-0" : "translate-x-full"} will-change-transform flex flex-col`}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Change Log</h3>
              <button
                onClick={() => closeClSheet()}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50 transition"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Body */}
            <div className={`flex-1 overflow-auto p-5 transition-opacity duration-200 ${clSheetVisible ? "opacity-100" : "opacity-0"}`}>
              {loadingCL ? (
                <div className="text-sm text-gray-500">Loading change logs...</div>
              ) : changelogs.length === 0 ? (
                <div className="h-full min-h-[40vh] flex flex-col items-center justify-center text-center text-gray-400">
                  No change logs yet
                </div>
              ) : (
                <ol className="relative pl-8 sm:pl-10 space-y-4 sm:space-y-5 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-0 before:bottom-0 before:w-px before:bg-gray-200">
                  {changelogs.map((cl) => (
                    <li key={cl.id} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute left-0 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gray-400 group-hover:bg-gray-600 transition-colors" />
                      </span>
                      <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] sm:text-xs font-medium text-gray-800">Version {cl.version}</span>
                              <span className="text-[11px] sm:text-xs text-gray-500">{formatDateStable(cl.created_at)}</span>
                            </div>
                            <div
                              className="mt-2 prose prose-sm rte-content max-w-none text-gray-700 prose-p:my-1 prose-ul:my-1 prose-ol:my-1"
                              dangerouslySetInnerHTML={{ __html: sanitizeHTML(cl.description) }}
                            />
                            {cl.file_url && (
                              <div className="mt-2">
                                <a
                                  href={cl.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] sm:text-xs text-gray-700 hover:bg-gray-100"
                                >
                                  {/* Paperclip icon inline to avoid new import here */}
                                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.5 5.5l5 5a5 5 0 1 1-7.07 7.07l-7-7a3.5 3.5 0 0 1 4.95-4.95l7 7a2 2 0 1 1-2.83 2.83l-6.36-6.36"/></svg>
                                  {cl.file_name || "Attachment"}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {errorCL && <p className="text-sm text-red-600 mt-2">{errorCL}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Scroll-margin agar anchor tidak tertutup header */}
      <style jsx global>{`
        .prose h1, .prose h2, .prose h3 { scroll-margin-top: 96px; }
      `}</style>
    </div>
  );
}

// Simple HTML sanitizer for rendered changelog descriptions
function sanitizeHTML(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || "", "text/html");
    const allowedTags = new Set(["A","P","BR","STRONG","B","EM","I","U","UL","OL","LI","CODE","PRE","H1","H2","H3","BLOCKQUOTE","DIV","SPAN"]);
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null);
    const toRemove: Element[] = [];
    while (walker.nextNode()) {
      const el = walker.currentNode as Element;
      if (!allowedTags.has(el.tagName)) {
        toRemove.push(el);
        continue;
      }
      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (el.tagName === "A" && name === "href") {
          const v = attr.value;
          if (!/^(https?:|mailto:|#)/i.test(v)) el.removeAttribute(attr.name);
        } else {
          el.removeAttribute(attr.name);
        }
      }
    }
    toRemove.forEach((el) => el.replaceWith(...Array.from(el.childNodes)));
    return doc.body.innerHTML;
  } catch {
    return "";
  }
}

// Hydration-safe date formatting (UTC) to avoid server/client mismatch
function formatDateStable(iso: string): string {
  try {
    return (
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "UTC",
      }).format(new Date(iso)) + " UTC"
    );
  } catch {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  }
}