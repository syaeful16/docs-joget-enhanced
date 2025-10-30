"use client";

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { usePathname } from 'next/navigation'

interface Section {
    id: string;
    label: string;
    items: Item[];
}

interface Item {
    id: string;        // gunakan slug untuk item dari DB, id manual untuk item manual
    title: string;
    href?: string;     // href penuh untuk Link
    slug?: string;     // opsional (untuk item dari DB)
}

// Sidebar will be generated from public docs grouped by category

interface SidebarDocsProps {
    sidebarOpen: boolean;
    activeSection: string;
    setActiveSection: (id: string) => void;
    setSidebarOpen:(status: boolean) => void;
} 

type PublicDoc = { id: string; slug: string; title: string; category: string | null };

const SidebarDocs = ({ sidebarOpen, activeSection, setActiveSection, setSidebarOpen }: SidebarDocsProps) => {
    const [docs, setDocs] = useState<PublicDoc[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const pathname = usePathname();

    // Manual sections (combine with DB-driven docs)
    const MANUAL_MENUS: Section[] = [
        {
            id: "get-started",
            label: "Get Started",
            items: [
                { id: "dropdown-search", title: "Dropdown Search" },
                { id: "form-grid3", title: "Form Grid" },
                { id: "form-grid4", title: "Form Grid" },
                { id: "form-grid5", title: "Form Grid" },
                { id: "form-grid6", title: "Form Grid" },
            ],
        },
    ];

    const currentDocId = useMemo(() => {
        if (!pathname) return null;
        // Extract the segment right after "/docs"
        const clean = pathname.split('#')[0].split('?')[0];
        const parts = clean.split('/').filter(Boolean);
        const idx = parts.indexOf('docs');
        if (idx >= 0 && parts[idx + 1]) return parts[idx + 1]; // ini adalah slug
        return null;
    }, [pathname]);

    // Sync external active state with URL when navigating directly
    useEffect(() => {
        if (currentDocId && currentDocId !== activeSection) {
            setActiveSection(currentDocId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDocId]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data, error } = await supabase
                  .from("docs")
                  .select("id, slug, title, category")
                  .eq("is_public", true)
                  .order("category", { ascending: true })
                  .order("title", { ascending: true });
                if (!mounted) return;
                if (!error && data) setDocs(data as PublicDoc[]);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

        const grouped = useMemo<Section[]>(() => {
            const groups = new Map<string, Item[]>();
            for (const d of docs) {
                const cat = d.category || 'Uncategorized';
                if (!groups.has(cat)) groups.set(cat, []);
                const key = d.slug || d.id; // gunakan slug jika ada, fallback ke id
                groups.get(cat)!.push({
                        id: key,
                        title: d.title || 'Untitled',
                        href: `/docs/${key}`,
                });
            }
            return Array.from(groups.entries()).map(([label, items]) => ({ id: label, label, items }));
        }, [docs]);

    return (
        <aside
            className={`fixed lg:sticky top-14 left-0 h-[calc(100vh-3.5rem)] w-64 overflow-y-auto transition-transform duration-300 z-40 ${
                sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }`}
        >
            <div className="py-10 px-5 space-y-5">
                {/* Manual sections */}
                {MANUAL_MENUS.map((menu) => (
                    <div key={menu.id} className="space-y-1">
                        <div className="pb-2 px-3 text-xs font-normal text-gray-400 tracking-wide">
                            {menu.label}
                        </div>
                        {menu.items.map((item) => (
                            item.href ? (
                                <Link
                                    key={item.id}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`block px-3 py-1.5 text-sm rounded-md transition-colors truncate ${
                                        activeSection === item.id
                                            ? "bg-gray-100 text-black font-medium"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-black"
                                    }`}
                                >
                                    {item.title}
                                </Link>
                            ) : (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveSection(item.id);
                                        setSidebarOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors truncate ${
                                        activeSection === item.id
                                            ? "bg-gray-100 text-black font-medium"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-black"
                                    }`}
                                >
                                    {item.title}
                                </button>
                            )
                        ))}
                    </div>
                ))}

                {/* Dynamic sections from database */}
                {loading && (
                    <div className="space-y-2 px-3 text-sm text-gray-400">
                        Loading...
                    </div>
                )}
                {!loading && grouped.length === 0 && (
                    <div className="space-y-2 px-3 text-sm text-gray-400">
                        No public documents yet.
                    </div>
                )}
                {grouped.map((menu) => (
                  <div key={menu.id} className='space-y-1'>
                    <div className="pb-2 px-3 text-xs font-normal text-gray-400 tracking-wide">
                      {menu.label}
                    </div>
                    {menu?.items?.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href!}
                        onClick={() => {
                          setActiveSection(item.id); // id = UUID
                          setSidebarOpen(false);
                        }}
                        aria-current={currentDocId === item.id ? 'page' : undefined}
                        className={`block px-3 py-1.5 text-sm rounded-md transition-colors truncate ${
                          activeSection === item.id || currentDocId === item.id
                            ? "bg-gray-100 text-black font-medium"
                            : "text-gray-600 hover:bg-gray-50 hover:text-black"
                        }`}
                      >
                        {item.title}
                      </Link>
                    ))}
                  </div>
                ))}
            </div>
        </aside>
    )
}

export default SidebarDocs