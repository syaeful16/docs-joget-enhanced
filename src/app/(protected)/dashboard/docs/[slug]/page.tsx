"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BlockNoteEditor from "@/components/BlockNoteEditor";
import Link from "next/link";
import { Settings, Globe, Lock, History, Bold, Italic, Underline, List, ListOrdered, Upload, Pencil, Paperclip } from "lucide-react";

// Hydration-safe date formatting (UTC)
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

// Tipe untuk change log
type DocChangelog = {
  id: string;
  created_at: string;
  doc_id: string;
  version: string;
  description: string;
  file_url: string | null;
  file_name: string | null;
};

export default function DocEditorPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  console.log("Editing document with slug:", slug);

  const [docId, setDocId] = useState<string | null>(null);
  const [content, setContent] = useState<any>(undefined);
  const [title, setTitle] = useState<string>("Untitled Document");
  const [category, setCategory] = useState<string>("Form Element");
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isEditingCategoryInline, setIsEditingCategoryInline] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Settings popover
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsBtnRef = useRef<HTMLButtonElement | null>(null);
  const settingsPopoverRef = useRef<HTMLDivElement | null>(null);

  // State untuk Change Log (fix error: clVersion, clDesc, clFile, dll)
  const [changelogs, setChangelogs] = useState<DocChangelog[]>([]);
  const [loadingCL, setLoadingCL] = useState<boolean>(false);
  const [savingCL, setSavingCL] = useState<boolean>(false);
  const [clVersion, setClVersion] = useState<string>("");
  const [clFile, setClFile] = useState<File | null>(null);
  const [errorCL, setErrorCL] = useState<string | null>(null);
  // Switch description to HTML-based rich text
  const [clDescHTML, setClDescHTML] = useState<string>("");

  // Edit Change Log state
  const [editCL, setEditCL] = useState<DocChangelog | null>(null);
  const [editVersion, setEditVersion] = useState<string>("");
  const [editDescHTML, setEditDescHTML] = useState<string>("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editRemoveAttachment, setEditRemoveAttachment] = useState<boolean>(false);
  const [savingEditCL, setSavingEditCL] = useState<boolean>(false);
  const [errorEditCL, setErrorEditCL] = useState<string | null>(null);

  // Change Log sheet (right-side drawer)
  const [clSheetOpen, setClSheetOpen] = useState(false);
  const [clSheetMode, setClSheetMode] = useState<"list" | "create" | "edit">("list");
  const [clSheetVisible, setClSheetVisible] = useState(false); // for smooth enter/exit animation

  const openClSheet = (mode: "list" | "create" | "edit" = "list") => {
    setClSheetMode(mode);
    setClSheetOpen(true);
    // next frame to allow CSS transition
    requestAnimationFrame(() => setClSheetVisible(true));
  };
  const closeClSheet = () => {
    setClSheetVisible(false);
    setTimeout(() => setClSheetOpen(false), 200); // match transition duration
  };

  const CATEGORIES = [
    "Form Element",
    "Permission",
    "Validator",
    "Plugin",
    "App",
    "Helper",
    "Tutorial",
    "Other",
  ];

  // Load document by slug only
  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("docs")
        .select("id, content, title, category, is_public, slug")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        console.error("Failed to load document by slug:", error);
        return;
      }
      if (!isMounted) return;

      setDocId(data.id);
      try {
        const parsed = typeof data.content === "string" ? JSON.parse(data.content) : data.content;
        setContent(parsed);
      } catch {
        setContent(undefined);
      }
      setTitle(data.title || "Untitled Document");
      setCategory(data.category || "Form Element");
      setIsPublic(!!data.is_public);
    })();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // (Opsional) Load daftar change log saat docId siap
  useEffect(() => {
    if (!docId) return;
    let mounted = true;
    (async () => {
      setLoadingCL(true);
      try {
        const { data, error } = await supabase
          .from("doc_changelogs")
          .select("id, created_at, doc_id, version, description, file_url, file_name")
          .eq("doc_id", docId)
          .order("created_at", { ascending: false });
        if (!mounted) return;
        if (!error && data) setChangelogs(data as DocChangelog[]);
      } finally {
        if (mounted) setLoadingCL(false);
      }
    })();
    return () => { mounted = false; };
  }, [docId]);

  // Save content by id
  const saveContent = async (newContent: any) => {
    if (!docId) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("docs")
        .update({
          content: JSON.stringify(newContent),
          title,
          category,
        })
        .eq("id", docId);
      if (error) console.error("Failed to save content:", error);
      else setLastSaved(new Date());
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (newContent: any) => {
    setContent(newContent);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveContent(newContent);
    }, 1000);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (docId) {
        supabase.from("docs").update({ title: newTitle }).eq("id", docId).then(({ error }) => {
          if (error) console.error("Failed to save title:", error);
        });
      }
    }, 1000);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    setCategory(newCategory);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (docId) {
        supabase.from("docs").update({ category: newCategory }).eq("id", docId).then(({ error }) => {
          if (error) console.error("Failed to save category:", error);
        });
      }
    }, 800);
  };

  const handleVisibilityChange = async (nextPublic: boolean) => {
    if (!docId) return;
    setIsPublic(nextPublic);
    const { error } = await supabase.from("docs").update({ is_public: nextPublic }).eq("id", docId);
    if (error) console.error("Failed to update visibility:", error);
  };

  // Close popover on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        settingsOpen &&
        settingsPopoverRef.current &&
        !settingsPopoverRef.current.contains(target) &&
        settingsBtnRef.current &&
        !settingsBtnRef.current.contains(target)
      ) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [settingsOpen]);

  // Create changelog
  const handleCreateChangelog = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Creating changelog for docId:", docId);
    if (!docId) return;
    const plain = htmlToPlainText(clDescHTML).trim();
    if (!clVersion.trim() || !plain) {
      setErrorCL("Version dan description wajib diisi.");
      return;
    }
    setErrorCL(null);
    setSavingCL(true);
    try {
      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (clFile) {
        console.log("Uploading changelog file:", clFile.name);
        const fd = new FormData();
        fd.append("file", clFile);
        fd.append("docId", docId);

        const resp = await fetch("/api/changelog/upload", {
          method: "POST",
          body: fd,
        });

        if (!resp.ok) {
          const j = await resp.json().catch(() => ({}));
          console.error("Upload failed:", j);
          setErrorCL("Gagal upload file.");
          setSavingCL(false);
          return;
        }
        const j = await resp.json();
        fileUrl = j.url as string;
        fileName = (j.name as string) || clFile.name;
      }

      const { data, error } = await supabase
        .from("doc_changelogs")
        .insert({
          doc_id: docId,
          version: clVersion.trim(),
          description: clDescHTML, // store HTML
          file_url: fileUrl,
          file_name: fileName,
        })
        .select("id, created_at, doc_id, version, description, file_url, file_name")
        .single();

      if (error) {
        console.error(error);
        setErrorCL("Gagal menyimpan change log.");
        return;
      }

      setChangelogs((prev) => [data as DocChangelog, ...prev]);
      setClVersion("");
      setClDescHTML("");
      setClFile(null);
      setClSheetMode("list");
    } finally {
      setSavingCL(false);
    }
  };

  // Simple HTML sanitizer (allow a, p, br, strong/b, em/i, u, ul/ol/li, code, pre, h1-h3, blockquote)
  function sanitizeHTML(html: string): string {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html || "", "text/html");
      const allowedTags = new Set(["A","P","BR","STRONG","B","EM","I","U","UL","OL","LI","CODE","PRE","H1","H2","H3","BLOCKQUOTE","DIV","SPAN"]);
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null);
      const toRemove: Element[] = [];
      // remove disallowed tags and dangerous attributes
      while (walker.nextNode()) {
        const el = walker.currentNode as Element;
        if (!allowedTags.has(el.tagName)) {
          toRemove.push(el);
          continue;
        }
        // Remove all attributes except href on A
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          if (el.tagName === "A" && name === "href") {
            // allow only http(s), mailto, and #
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

  function htmlToPlainText(html: string): string {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  }

  // Rich text editor handlers
  const editableRef = useRef<HTMLDivElement | null>(null);
  const editableRangeRef = useRef<Range | null>(null);
  const applyFormat = (cmd: string, value?: string) => {
    if (editableRef.current) {
      // keep focus and restore last selection to avoid losing range on toolbar click
      editableRef.current.focus();
      const sel = document.getSelection();
      if (editableRangeRef.current && sel) {
        sel.removeAllRanges();
        sel.addRange(editableRangeRef.current);
      }
      document.execCommand(cmd, false, value);
      setClDescHTML(editableRef.current.innerHTML);
    }
  };
  const onEditableInput = () => {
    if (editableRef.current) {
      // normalize empty content to truly empty so placeholder appears
      const text = editableRef.current.innerText.replace(/\u200B/g, "").trim();
      if (!text) editableRef.current.innerHTML = "";
      setClDescHTML(editableRef.current.innerHTML);
    }
  };
  const onEditablePaste: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const html = e.clipboardData?.getData("text/html");
    if (html) {
      const sanitized = sanitizeHTML(html);
      document.execCommand("insertHTML", false, sanitized);
    } else {
      const text = e.clipboardData?.getData("text/plain") ?? "";
      document.execCommand("insertText", false, text);
    }
    if (editableRef.current) setClDescHTML(editableRef.current.innerHTML);
  };
  useEffect(() => {
    const handleSel = () => {
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (editableRef.current && editableRef.current.contains(range.commonAncestorContainer)) {
        editableRangeRef.current = range;
      }
    };
    document.addEventListener("selectionchange", handleSel);
    return () => document.removeEventListener("selectionchange", handleSel);
  }, []);

  // Keep DOM in sync without React re-rendering contenteditable (prevents caret jump)
  useEffect(() => {
    if (clSheetMode !== "create") return;
    if (editableRef.current && editableRef.current.innerHTML !== clDescHTML) {
      editableRef.current.innerHTML = clDescHTML;
    }
  }, [clSheetMode, clDescHTML]);
  // Edit modal editor handlers
  const editEditableRef = useRef<HTMLDivElement | null>(null);
  const editEditableRangeRef = useRef<Range | null>(null);
  const applyFormatEdit = (cmd: string, value?: string) => {
    if (editEditableRef.current) {
      editEditableRef.current.focus();
      const sel = document.getSelection();
      if (editEditableRangeRef.current && sel) {
        sel.removeAllRanges();
        sel.addRange(editEditableRangeRef.current);
      }
      document.execCommand(cmd, false, value);
      setEditDescHTML(editEditableRef.current.innerHTML);
    }
  };
  const onEditableEditInput = () => {
    if (editEditableRef.current) {
      const text = editEditableRef.current.innerText.replace(/\u200B/g, "").trim();
      if (!text) editEditableRef.current.innerHTML = "";
      setEditDescHTML(editEditableRef.current.innerHTML);
    }
  };
  const onEditableEditPaste: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const html = e.clipboardData?.getData("text/html");
    if (html) {
      const sanitized = sanitizeHTML(html);
      document.execCommand("insertHTML", false, sanitized);
    } else {
      const text = e.clipboardData?.getData("text/plain") ?? "";
      document.execCommand("insertText", false, text);
    }
    if (editEditableRef.current) setEditDescHTML(editEditableRef.current.innerHTML);
  };
  useEffect(() => {
    const handleSel = () => {
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (editEditableRef.current && editEditableRef.current.contains(range.commonAncestorContainer)) {
        editEditableRangeRef.current = range;
      }
    };
    document.addEventListener("selectionchange", handleSel);
    return () => document.removeEventListener("selectionchange", handleSel);
  }, []);

  // Sync edit editor DOM when switching into edit mode or value changes
  useEffect(() => {
    if (clSheetMode !== "edit") return;
    if (editEditableRef.current && editEditableRef.current.innerHTML !== editDescHTML) {
      editEditableRef.current.innerHTML = editDescHTML;
    }
  }, [clSheetMode, editDescHTML]);
  const onDropFile: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    if (f) setClFile(f);
  };
  const onDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
  };

  return (
    <div className="min-h-screen py-22">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex mb-6" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                </svg>
                <Link href="/dashboard/docs" className="ml-1 text-sm font-medium text-gray-700 hover:text-gray-900 md:ml-2">
                  Documents
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Edit</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 relative">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                className="text-2xl font-bold text-gray-900 bg-transparent border-none outline-none focus:ring-0 p-0 w-full"
                placeholder="Untitled Document"
              />
            </div>
            {/* Save Status */}
            <div className="flex items-center gap-3 text-sm text-gray-500">
              {isSaving ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  <span>Saving...</span>
                </div>
              ) : lastSaved ? (
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                </div>
              ) : (
                <span>All changes saved</span>
              )}

              {/* Change Log button */}
              <button
                type="button"
                onClick={() => openClSheet("list")}
                className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900"
                title="Change Log"
              >
                <History className="w-4 h-4" />
                Change Log
              </button>

              {/* Settings button */}
              <div className="relative">
                <button
                  ref={settingsBtnRef}
                  type="button"
                  onClick={() => setSettingsOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={settingsOpen}
                  className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>

                {(
                  <div
                    ref={settingsPopoverRef}
                    className={`absolute z-50 right-0 mt-2 w-72 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg transition-all duration-150 ${settingsOpen ? "opacity-100 scale-100" : "pointer-events-none opacity-0 scale-95"}`}
                    role="menu"
                    aria-orientation="vertical"
                  >
                    <div className="p-3">
                      <div className="mb-3">
                        <div className="text-xs font-semibold text-gray-500 mb-2">Visibility</div>
                        <div className="flex items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            {isPublic ? (
                              <>
                                <Globe className="w-4 h-4 text-green-600" />
                                <span className="text-green-700">Public</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-700">Private</span>
                              </>
                            )}
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isPublic}
                            onClick={() => handleVisibilityChange(!isPublic)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 ${isPublic ? "bg-green-500" : "bg-gray-300"}`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${isPublic ? "translate-x-5" : "translate-x-1"}`}
                            />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-2">Category</label>
                        <select
                          value={category}
                          onChange={(e) => {
                            handleCategoryChange(e);
                          }}
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Document Info */}
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Last edited recently</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
              </svg>
              {isEditingCategoryInline ? (
                <select
                  value={category}
                  onChange={(e) => {
                    handleCategoryChange(e);
                    setIsEditingCategoryInline(false);
                  }}
                  onBlur={() => setIsEditingCategoryInline(false)}
                  autoFocus
                  className="h-7 px-2 text-xs border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingCategoryInline(true)}
                  className="text-gray-700 hover:underline decoration-dotted underline-offset-2"
                  title="Click to change category"
                >
                  {category}
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Document</span>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="bg-white">
          <BlockNoteEditor key={(docId ?? slug) as string} initialContent={content} onChange={handleChange} />
        </div>

        {/* Change Log Sheet (right-side drawer) */}
        {clSheetOpen && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${clSheetVisible ? "opacity-100" : "opacity-0"}`}
              onClick={() => {
                if (!savingCL && !savingEditCL) closeClSheet();
              }}
            />
            {/* Drawer */}
            <div className={`absolute inset-y-0 right-0 w-full sm:max-w-xl bg-white border-l border-gray-200 shadow-xl transform transition-transform duration-200 ${clSheetVisible ? "translate-x-0" : "translate-x-full"} will-change-transform flex flex-col`}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex flex-col gap-2">
                    <h3 className="text-base font-semibold text-gray-900">
                        {clSheetMode === "list" ? "Change Log" : clSheetMode === "create" ? "Create Change Log" : "Edit Change Log"}
                    </h3>
                    <p className="text-sm text-gray-400">This is used to view all the changes you have made, whether to plugins, libraries, or other components.</p>
                </div>
                <div className="flex items-center gap-2">
                  {clSheetMode === "list" && (
                    <button
                      type="button"
                      onClick={() => setClSheetMode("create")}
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Create
                    </button>
                  )}
                  <button
                    onClick={() => { if (!savingCL && !savingEditCL) closeClSheet(); }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50 transition"
                    aria-label="Close"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Body */}
              <div className={`flex-1 overflow-auto p-5 transition-opacity duration-200 ${clSheetVisible ? "opacity-100" : "opacity-0"}`}>
                {clSheetMode === "list" && (
                  <div>
                    {loadingCL ? (
                      <div className="text-sm text-gray-500">Loading change logs...</div>
                    ) : changelogs.length === 0 ? (
                      <div className="h-full min-h-[40vh] flex flex-col items-center justify-center text-center">
                        <div className="text-gray-400 mb-2">No change logs yet</div>
                        <button
                          type="button"
                          onClick={() => setClSheetMode("create")}
                          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Create Change Log
                        </button>
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
                                        <Paperclip className="w-3.5 h-3.5" />
                                        {cl.file_name || "Attachment"}
                                      </a>
                                    </div>
                                  )}
                                </div>
                                <div className="shrink-0">
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] sm:text-xs text-gray-700 hover:bg-gray-50"
                                    onClick={() => {
                                      setEditCL(cl);
                                      setEditVersion(cl.version);
                                      setEditDescHTML(cl.description || "");
                                      setEditFile(null);
                                      setEditRemoveAttachment(false);
                                      setErrorEditCL(null);
                                      setClSheetMode("edit");
                                    }}
                                    title="Edit change log"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit
                                  </button>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {clSheetMode === "create" && (
                  <form onSubmit={handleCreateChangelog} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                      <input
                        type="text"
                        value={clVersion}
                        onChange={(e) => setClVersion(e.target.value)}
                        placeholder="e.g. 1.0.1 or v2.3"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      {/* Write-only rich text editor */}
                      <div>
                        {/* Toolbar */}
                        <div className="flex items-center gap-1 p-1 border border-gray-200 rounded-t-md bg-gray-50">
                          <button onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation();}} type="button" title="Bold" onClick={() => applyFormat("bold")} className="p-1.5 rounded hover:bg-gray-100 text-gray-700"><Bold className="w-4 h-4"/></button>
                          <button onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation();}} type="button" title="Italic" onClick={() => applyFormat("italic")} className="p-1.5 rounded hover:bg-gray-100 text-gray-700"><Italic className="w-4 h-4"/></button>
                          <button onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation();}} type="button" title="Underline" onClick={() => applyFormat("underline")} className="p-1.5 rounded hover:bg-gray-100 text-gray-700"><Underline className="w-4 h-4"/></button>
                          <span className="mx-1 w-px h-5 bg-gray-200"/>
                          <button onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation();}} type="button" title="Bulleted list" onClick={() => applyFormat("insertUnorderedList")} className="p-1.5 rounded hover:bg-gray-100 text-gray-700"><List className="w-4 h-4"/></button>
                          <button onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation();}} type="button" title="Numbered list" onClick={() => applyFormat("insertOrderedList")} className="p-1.5 rounded hover:bg-gray-100 text-gray-700"><ListOrdered className="w-4 h-4"/></button>
                        </div>
                        {/* Editable */}
                        <div
                          ref={editableRef}
                          onInput={onEditableInput}
                          onPaste={onEditablePaste}
                          className="rte-content min-h-40 max-h-[40vh] overflow-auto border-x border-b border-gray-200 rounded-b-md px-3 py-2 text-sm focus:outline-none"
                          contentEditable
                          suppressContentEditableWarning
                          data-placeholder="Describe the changes..."
                        />
                        <style jsx>{`
                          [contenteditable][data-placeholder]:empty:before {
                            content: attr(data-placeholder);
                            color: #9ca3af; /* gray-400 */
                          }
                          /* Ensure list markers are visible inside the editor */
                          .rte-content ul {
                            list-style: disc;
                            list-style-position: outside;
                            padding-left: 1.25rem; /* pl-5 */
                            margin: 0.25rem 0; /* my-1 */
                          }
                          .rte-content ol {
                            list-style: decimal;
                            list-style-position: outside;
                            padding-left: 1.25rem; /* pl-5 */
                            margin: 0.25rem 0; /* my-1 */
                          }
                          .rte-content li {
                            margin: 0.125rem 0; /* my-0.5 */
                          }
                        `}</style>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Attachment (optional)</label>
                      <div
                        onDrop={onDropFile}
                        onDragOver={onDragOver}
                        className="border border-dashed border-gray-300 rounded-md p-4 text-center text-sm text-gray-600 hover:border-gray-400 transition-colors cursor-pointer"
                        onClick={() => {
                          const inp = document.createElement("input");
                          inp.type = "file";
                          inp.onchange = (ev: any) => {
                            const file = ev?.target?.files?.[0];
                            if (file) setClFile(file);
                          };
                          inp.click();
                        }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Upload className="w-4 h-4"/>
                          <span>Drag & drop file here, or click to browse</span>
                        </div>
                        {clFile && (
                          <div className="mt-2 text-gray-700">Selected: <span className="font-medium">{clFile.name}</span></div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">File disimpan ke Supabase Storage.</p>
                    </div>
                    {errorCL && <p className="text-sm text-red-600">{errorCL}</p>}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={() => setClSheetMode("list")}
                        disabled={savingCL}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingCL || !docId}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-60"
                      >
                        {savingCL ? (
                          <>
                            <span className="inline-block h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>Add Change Log</>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {clSheetMode === "edit" && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!editCL) return;
                      const plain = htmlToPlainText(editDescHTML).trim();
                      if (!editVersion.trim() || !plain) {
                        setErrorEditCL("Version dan description wajib diisi.");
                        return;
                      }
                      setErrorEditCL(null);
                      setSavingEditCL(true);
                      try {
                        let fileUrl: string | undefined = undefined;
                        let fileName: string | undefined = undefined;

                        if (editRemoveAttachment) {
                          fileUrl = null as unknown as undefined;
                          fileName = null as unknown as undefined;
                        } else if (editFile) {
                          const fd = new FormData();
                          fd.append("file", editFile);
                          fd.append("docId", editCL.doc_id);
                          const resp = await fetch("/api/changelog/upload", { method: "POST", body: fd });
                          if (!resp.ok) {
                            const j = await resp.json().catch(() => ({}));
                            console.error("Upload failed:", j);
                            setErrorEditCL("Gagal upload file.");
                            setSavingEditCL(false);
                            return;
                          }
                          const j = await resp.json();
                          fileUrl = j.url as string;
                          fileName = (j.name as string) || editFile.name;
                        }

                        const payload: Record<string, any> = {
                          version: editVersion.trim(),
                          description: editDescHTML,
                        };
                        if (editRemoveAttachment) {
                          payload.file_url = null;
                          payload.file_name = null;
                        } else if (typeof fileUrl !== "undefined") {
                          payload.file_url = fileUrl;
                          payload.file_name = fileName ?? null;
                        }

                        const { data, error } = await supabase
                          .from("doc_changelogs")
                          .update(payload)
                          .eq("id", editCL.id)
                          .select("id, created_at, doc_id, version, description, file_url, file_name")
                          .single();

                        if (error) {
                          console.error(error);
                          setErrorEditCL("Gagal mengupdate change log.");
                          return;
                        }

                        setChangelogs((prev) => prev.map((c) => (c.id === editCL.id ? (data as DocChangelog) : c)));
                        setEditFile(null);
                        setEditRemoveAttachment(false);
                        setEditCL(null);
                        setClSheetMode("list");
                      } finally {
                        setSavingEditCL(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                      <input
                        type="text"
                        value={editVersion}
                        onChange={(e) => setEditVersion(e.target.value)}
                        placeholder="e.g. 1.0.1 or v2.3"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                      {/* Write-only rich text editor */}
                      <div>
                        {/* Toolbar */}
                        <div className="flex items-center gap-1 p-1 border border-gray-200 rounded-t-md bg-gray-50">
                          <button onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation();}} type="button" title="Bold" onClick={() => applyFormatEdit("bold")} className="p-1.5 rounded hover:bg-gray-100 text-gray-700"><Bold className="w-4 h-4"/></button>
                          <button onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation();}} type="button" title="Italic" onClick={() => applyFormatEdit("italic")} className="p-1.5 rounded hover:bg-gray-100 text-gray-700"><Italic className="w-4 h-4"/></button>
                          <button onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation();}} type="button" title="Underline" onClick={() => applyFormatEdit("underline")} className="p-1.5 rounded hover:bg-gray-100 text-gray-700"><Underline className="w-4 h-4"/></button>
                          <span className="mx-1 w-px h-5 bg-gray-200"/>
                          <button onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation();}} type="button" title="Bulleted list" onClick={() => applyFormatEdit("insertUnorderedList")} className="p-1.5 rounded hover:bg-gray-100 text-gray-700"><List className="w-4 h-4"/></button>
                          <button onMouseDown={(e)=>{e.preventDefault(); e.stopPropagation();}} type="button" title="Numbered list" onClick={() => applyFormatEdit("insertOrderedList")} className="p-1.5 rounded hover:bg-gray-100 text-gray-700"><ListOrdered className="w-4 h-4"/></button>
                        </div>
                        {/* Editable */}
                        <div
                          ref={editEditableRef}
                          onInput={onEditableEditInput}
                          onPaste={onEditableEditPaste}
                          className="rte-content min-h-40 max-h-[40vh] overflow-auto border-x border-b border-gray-200 rounded-b-md px-3 py-2 text-sm focus:outline-none"
                          contentEditable
                          suppressContentEditableWarning
                          data-placeholder="Describe the changes..."
                        />
                        <style jsx>{`
                          [contenteditable][data-placeholder]:empty:before {
                            content: attr(data-placeholder);
                            color: #9ca3af; /* gray-400 */
                          }
                          /* Ensure list markers are visible inside the editor (edit mode) */
                          .rte-content ul {
                            list-style: disc;
                            list-style-position: outside;
                            padding-left: 1.25rem; /* pl-5 */
                            margin: 0.25rem 0; /* my-1 */
                          }
                          .rte-content ol {
                            list-style: decimal;
                            list-style-position: outside;
                            padding-left: 1.25rem; /* pl-5 */
                            margin: 0.25rem 0; /* my-1 */
                          }
                          .rte-content li {
                            margin: 0.125rem 0; /* my-0.5 */
                          }
                        `}</style>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Attachment</label>
                      {editCL?.file_url && !editRemoveAttachment && (
                        <div className="mb-2 text-sm text-gray-700">
                          Current: <a href={editCL.file_url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-gray-900">{editCL.file_name || "Attachment"}</a>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300"
                            checked={editRemoveAttachment}
                            onChange={(e) => { setEditRemoveAttachment(e.target.checked); if (e.target.checked) setEditFile(null); }}
                          />
                          Remove current attachment
                        </label>
                      </div>
                      <div
                        onDrop={(e) => { e.preventDefault(); if (editRemoveAttachment) return; const f = e.dataTransfer?.files?.[0]; if (f) setEditFile(f); }}
                        onDragOver={(e) => e.preventDefault()}
                        className={`border border-dashed rounded-md p-4 text-center text-sm transition-colors cursor-pointer ${editRemoveAttachment ? "border-gray-200 text-gray-300" : "border-gray-300 text-gray-600 hover:border-gray-400"}`}
                        onClick={() => {
                          if (editRemoveAttachment) return;
                          const inp = document.createElement("input");
                          inp.type = "file";
                          inp.onchange = (ev: any) => {
                            const file = ev?.target?.files?.[0];
                            if (file) setEditFile(file);
                          };
                          inp.click();
                        }}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <Upload className="w-4 h-4"/>
                          <span>{editRemoveAttachment ? "Attachment disabled" : "Drag & drop file here, or click to replace"}</span>
                        </div>
                        {editFile && (
                          <div className="mt-2 text-gray-700">Selected: <span className="font-medium">{editFile.name}</span></div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">File disimpan ke Supabase Storage.</p>
                    </div>
                    {errorEditCL && <p className="text-sm text-red-600">{errorEditCL}</p>}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                        onClick={() => setClSheetMode("list")}
                        disabled={savingEditCL}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingEditCL || !editCL}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-60"
                      >
                        {savingEditCL ? (
                          <>
                            <span className="inline-block h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>Save Changes</>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Change Log Modal removed; replaced by right-side sheet below */}

      </div>
    </div>
  );
}
