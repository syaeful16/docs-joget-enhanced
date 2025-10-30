"use client";

import { usePathname, useRouter } from "next/navigation";
import { Github, Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import SidebarDocs from "@/components/SidebarDocs";
import { supabase } from "@/lib/supabaseClient";

type PublicDoc = { id: string; title: string; category: string | null };

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    const [activeSection, setActiveSection] = useState<string>("spinner");
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

    // Command palette state
    const [cmdOpen, setCmdOpen] = useState(false);
    const [cmdQuery, setCmdQuery] = useState("");
    const [cmdHighlight, setCmdHighlight] = useState(0);
    const cmdInputRef = useRef<HTMLInputElement | null>(null);
    const [docs, setDocs] = useState<PublicDoc[]>([]);
    const [loadingDocs, setLoadingDocs] = useState<boolean>(false);

    // Fetch public docs once for search
    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoadingDocs(true);
            try {
                const { data, error } = await supabase
                    .from("docs")
                    .select("id, title, category")
                    .eq("is_public", true)
                    .order("title", { ascending: true });
                if (error) {
                    console.error("Failed to fetch public docs (cmd palette):", error);
                }
                if (mounted) setDocs(data || []);
            } catch (e) {
                console.error("Unexpected error fetching public docs (cmd):", e);
            } finally {
                if (mounted) setLoadingDocs(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const results = useMemo(() => {
        const q = cmdQuery.trim().toLowerCase();
        const list = q ? docs.filter(d => (d.title || '').toLowerCase().includes(q) || (d.category || '').toLowerCase().includes(q)) : docs;
        return list.slice(0, 30);
    }, [cmdQuery, docs]);

    // Open palette on Cmd/Ctrl + K, close on Esc
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                setCmdOpen(true);
                setCmdQuery("");
                setCmdHighlight(0);
                requestAnimationFrame(() => cmdInputRef.current?.focus());
            } else if (e.key === 'Escape') {
                setCmdOpen(false);
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    // Close palette after navigation
    useEffect(() => {
        setCmdOpen(false);
    }, [pathname]);

    return (
        <div className="min-h-screen px-32 mx-auto bg-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-sm">
                <div className="flex h-14 items-center px-4 lg:px-6">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="mr-4 lg:hidden"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <div className="flex items-center gap-2 mr-6">
                        <div className="w-6 h-6 bg-black rounded-md flex items-center justify-center">
                            <div className="w-3 h-3 border-2 border-white transform rotate-45"></div>
                        </div>
                        <span className="font-semibold">shadcn/ui</span>
                    </div>

                    <nav className="hidden md:flex items-center gap-6 text-sm">
                        {["Docs", "Components", "Blocks", "Charts", "Themes", "Colors"].map(
                            (item) => (
                                <a
                                    key={item}
                                    href="#"
                                    className="text-gray-600 hover:text-black"
                                >
                                    {item}
                                </a>
                            )
                        )}
                    </nav>

                    <div className="ml-auto flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setCmdOpen(true);
                                setCmdQuery("");
                                setCmdHighlight(0);
                                requestAnimationFrame(() => cmdInputRef.current?.focus());
                            }}
                            className="hidden lg:flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md bg-gray-50 w-auto text-left"
                        >
                            <Search size={16} className="text-gray-400" />
                            <span className="bg-transparent border-none outline-none text-sm flex-1 text-gray-500">Search documentation...</span>
                            <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded">
                                ⌘
                            </kbd>
                            <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded">
                                K
                            </kbd>
                        </button>
                        <a href="#" className="p-2 hover:bg-gray-100 rounded-md flex items-center gap-1 text-sm">
                            <Github size={16} />
                            <span className="hidden sm:inline">98.3k</span>
                        </a>
                        {/* <button className="p-2 hover:bg-gray-100 rounded-md">
                            <div className="w-5 h-5 border border-gray-300 rounded"></div>
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-md">
                            <div className="w-5 h-5 rounded-full bg-linear-to-br from-blue-400 to-purple-500"></div>
                        </button> */}
                    </div>
                </div>
            </header>
            <div className="flex gap-32">
                <SidebarDocs sidebarOpen={sidebarOpen} activeSection={activeSection} setActiveSection={setActiveSection} setSidebarOpen={setSidebarOpen}/>
                <main className="flex-1 min-w-0 py-10">
                    {children}
                </main>
            </div>

            {/* Command Palette */}
            {cmdOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setCmdOpen(false)}
                    />
                    {/* Dialog */}
                    <div className="relative z-10 w-full max-w-xl rounded-xl border border-gray-200 bg-white shadow-2xl">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input
                                ref={cmdInputRef}
                                type="text"
                                value={cmdQuery}
                                onChange={(e) => { setCmdQuery(e.target.value); setCmdHighlight(0); }}
                                onKeyDown={(e) => {
                                    if (e.key === 'ArrowDown') {
                                        e.preventDefault();
                                        setCmdHighlight(i => Math.min(i + 1, Math.max(0, results.length - 1)));
                                    } else if (e.key === 'ArrowUp') {
                                        e.preventDefault();
                                        setCmdHighlight(i => Math.max(0, i - 1));
                                    } else if (e.key === 'Enter') {
                                        const item = results[cmdHighlight];
                                        if (item) {
                                            setCmdOpen(false);
                                            router.push(`/docs/${item.id}`);
                                        }
                                    } else if (e.key === 'Escape') {
                                        setCmdOpen(false);
                                    }
                                }}
                                placeholder="Search documentation..."
                                className="w-full bg-transparent outline-none text-sm placeholder:text-gray-400 py-1.5"
                            />
                            <kbd className="ml-auto text-[10px] text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">Esc</kbd>
                        </div>
                        <div className="max-h-80 overflow-auto py-2">
                            {cmdQuery.trim() && results.length === 0 && (
                                <div className="px-4 py-2 text-sm text-gray-500">No results for "{cmdQuery}"</div>
                            )}
                            {results.map((d, idx) => (
                                <button
                                    key={d.id}
                                    onClick={() => { setCmdOpen(false); router.push(`/docs/${d.id}`); }}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${idx === cmdHighlight ? 'bg-gray-50' : ''}`}
                                >
                                    <span className="truncate pr-3">{d.title}</span>
                                    {d.category && (
                                        <span className="ml-2 shrink-0 rounded-full border px-2 py-0.5 text-xs text-gray-600 bg-gray-50 border-gray-200">{d.category}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}