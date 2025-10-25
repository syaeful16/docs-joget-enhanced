"use client";

import { usePathname } from "next/navigation";
import { Github, Menu, Search, X } from "lucide-react";
import { useState } from "react";
import SidebarDocs from "@/components/SidebarDocs";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    const [activeSection, setActiveSection] = useState<string>("spinner");
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

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
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-md bg-gray-50 w-64">
                            <Search size={16} className="text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search documentation..."
                                className="bg-transparent border-none outline-none text-sm flex-1"
                            />
                            <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded">
                                ⌘
                            </kbd>
                            <kbd className="px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded">
                                K
                            </kbd>
                        </div>
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
        </div>
    );
}