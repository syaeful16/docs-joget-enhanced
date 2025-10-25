"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BlockNoteEditor from "@/components/BlockNoteEditor";
import Link from "next/link";

export default function DocEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [content, setContent] = useState<any>(undefined);
  const [title, setTitle] = useState<string>("Untitled Document");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load document
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    (async () => {
      const { data, error } = await supabase
        .from("docs")
        .select("content, title")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Failed to load document:", error);
        return;
      }

      if (!isMounted) return;

      const value = data?.content;
      try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        setContent(parsed);
        setTitle(data?.title || "Untitled Document");
      } catch (e) {
        console.error("Failed to parse content JSON:", e);
        setContent(undefined);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Debounced save when content changes
  const saveContent = async (newContent: any) => {
    if (!id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("docs")
        .update({ 
          content: JSON.stringify(newContent),
          title: title
        })
        .eq("id", id);

      if (error) {
        console.error("Failed to save content:", error);
      } else {
        setLastSaved(new Date());
      }
    } finally {
      setIsSaving(false);
    }
  };

  function handleChange(newContent: any) {
    setContent(newContent);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveContent(newContent);
    }, 1000);
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    
    // Debounced save for title
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (id) {
        supabase
          .from("docs")
          .update({ title: newTitle })
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              console.error("Failed to save title:", error);
            }
          });
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen">
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
          <div className="flex items-center justify-between mb-4">
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
            <div className="flex items-center space-x-4 text-sm text-gray-500">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Document</span>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="bg-white">
          <BlockNoteEditor key={id as string} initialContent={content} onChange={handleChange} />
        </div>
      </div>
    </div>
  );
}
