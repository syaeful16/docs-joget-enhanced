import React, { useState } from 'react'

import {
    Search,
    Copy,
    ChevronRight,
    ChevronLeft,
    Github,
    Menu,
    X,
    Loader2,
} from "lucide-react";

interface Section {
    id: string;
    label: string;
    type?: "header";
    active?: boolean;
}
  
interface TocItem {
    id: string;
    label: string;
    indent?: boolean;
}

const TestPage = () => {
    const [activeSection, setActiveSection] = useState<string>("spinner");
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);

    const escapeHtml = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      
      // helper: highlight satu baris kode
    const highlightCodeLine = (line: string): string => {
        // 1) escape HTML
        const escaped = escapeHtml(line);
      
        // 2) highlight string literals pertama (so they won't be re-highlighted as keywords/braces)
        //    menggunakan capture group supaya tanda " tetap tampil
        const afterStrings = escaped.replace(/"([^"]*)"/g, (_m, p1) =>
          `<span class="text-green-400">"${p1}"</span>`
        );
      
        // 3) highlight keywords (pakai word boundary agar mis-match minimal)
        const afterKeywords = afterStrings.replace(
          /\b(import|export|function|from|return)\b/g,
          '<span class="text-purple-400">$1</span>'
        );
      
        // 4) highlight braces
        const afterBraces = afterKeywords.replace(/({|})/g, '<span class="text-yellow-400">$1</span>');
      
        // jika line kosong, kembalikan nbsp supaya height baris tetap konsisten
        return afterBraces === "" ? "&nbsp;" : afterBraces;
    };

    const sections: Section[] = [
        { id: "sections", label: "Sections", type: "header" },
        { id: "get-started", label: "Get Started" },
        { id: "components", label: "Components", active: true },
        { id: "registry", label: "Registry" },
        { id: "mcp-server", label: "MCP Server" },
        { id: "forms", label: "Forms" },
        { id: "changelog", label: "Changelog" },
        { id: "get-started-2", label: "Get Started", type: "header" },
        { id: "installation", label: "Installation" },
        { id: "components-json", label: "components.json" },
        { id: "theming", label: "Theming" },
        { id: "dark-mode", label: "Dark Mode" },
        { id: "cli", label: "CLI" },
        { id: "monorepo", label: "Monorepo" },
        { id: "open-v0", label: "Open in v0" },
        { id: "javascript", label: "JavaScript" },
        { id: "blocks", label: "Blocks" },
        { id: "figma", label: "Figma" },
        { id: "llms-txt", label: "llms.txt" },
        { id: "legacy-docs", label: "Legacy Docs" },
        { id: "components-header", label: "Components", type: "header" },
        { id: "accordion", label: "Accordion" },
        { id: "alert", label: "Alert" },
        { id: "alert-dialog", label: "Alert Dialog" },
        { id: "spinner", label: "Spinner" },
      ];
    
      const tocItems: TocItem[] = [
        { id: "installation", label: "Installation" },
        { id: "usage", label: "Usage" },
        { id: "customization", label: "Customization" },
        { id: "examples", label: "Examples" },
        { id: "size", label: "Size", indent: true },
        { id: "color", label: "Color", indent: true },
        { id: "button", label: "Button", indent: true },
        { id: "badge", label: "Badge", indent: true },
        { id: "input-group", label: "Input Group", indent: true },
        { id: "empty", label: "Empty", indent: true },
        { id: "item", label: "Item", indent: true },
        { id: "api-reference", label: "API Reference" },
        { id: "spinner", label: "Spinner", indent: true },
      ];
    
      const codeExample = `import { Loader2 } from "lucide-react"
    
    export function SpinnerDemo() {
      return (
        <div className="flex items-center justify-between p-6 border rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="animate-spin text-gray-600" size={20} />
            <span className="text-sm">Processing payment...</span>
          </div>
          <span className="text-sm font-medium">$100.00</span>
        </div>
      )
    }`;

    const handleCopy = (): void => {
        navigator.clipboard.writeText(codeExample);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      };

    return (
        <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
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
            <a
              href="#"
              className="p-2 hover:bg-gray-100 rounded-md flex items-center gap-1 text-sm"
            >
              <Github size={16} />
              <span className="hidden sm:inline">98.3k</span>
            </a>
            <button className="p-2 hover:bg-gray-100 rounded-md">
              <div className="w-5 h-5 border border-gray-300 rounded"></div>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-md">
              <div className="w-5 h-5 rounded-full bg-linear-to-br from-blue-400 to-purple-500"></div>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar */}
        <aside
          className={`fixed lg:sticky top-14 left-0 h-[calc(100vh-3.5rem)] w-64 border-r border-gray-200 bg-white overflow-y-auto transition-transform duration-300 z-40 ${
            sidebarOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="py-6 px-4 space-y-1">
            {sections.map((section) =>
              section.type === "header" ? (
                <div
                  key={section.id}
                  className="pt-4 pb-2 text-xs font-semibold text-gray-900 uppercase tracking-wide"
                >
                  {section.label}
                </div>
              ) : (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                    activeSection === section.id || section.active
                      ? "bg-gray-100 text-black font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-black"
                  }`}
                >
                  {section.label}
                </button>
              )
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-4xl font-bold tracking-tight">Spinner</h1>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50 flex items-center gap-2">
                    <Copy size={14} />
                    Copy Page
                  </button>
                  <button className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50">
                    <ChevronLeft size={16} />
                  </button>
                  <button className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <p className="text-gray-600">
                An indicator that can be used to show a loading state.
              </p>
            </div>

            {/* Preview Box */}
            <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 p-12 flex items-center justify-center min-h-[300px]">
                <div className="bg-white border border-gray-200 rounded-lg p-6 w-full max-w-md flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="animate-spin text-gray-600" size={20} />
                    <span className="text-sm">Processing payment...</span>
                  </div>
                  <span className="text-sm font-medium">$100.00</span>
                </div>
              </div>
            </div>

            {/* Code Block */}
            <div className="relative group mb-8">
              <div className="bg-gray-950 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <span className="text-xs text-gray-400">tsx</span>
                  <button
                    onClick={handleCopy}
                    className="text-xs text-gray-400 hover:text-white flex items-center gap-2"
                  >
                    <Copy size={14} />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto">
                <code className="text-sm text-gray-100 font-mono leading-relaxed">
                    {codeExample.split("\n").map((line, i) => (
                    <div key={i} className="flex">
                        <span className="text-gray-600 select-none w-8 text-right mr-4">{i + 1}</span>
                        <span
                        dangerouslySetInnerHTML={{ __html: highlightCodeLine(line) }}
                        />
                    </div>
                    ))}
                </code>
                </pre>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold mb-2">
                Deploy your shadcn/ui app on Vercel
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Trusted by OpenAI, Sonos, Adobe, and more.
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Vercel provides tools and infrastructure to deploy apps and
                features at scale.
              </p>
              <button className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800">
                Deploy Now
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar */}
        <aside className="hidden xl:block w-56 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-l border-gray-200 py-6 px-4">
          <div className="mb-4">
            <h3 className="text-xs font-semibold text-gray-900 mb-3 uppercase tracking-wide">
              On This Page
            </h3>
            <div className="space-y-2">
              {tocItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`block text-sm text-gray-600 hover:text-black transition-colors ${
                    item.indent ? "pl-4" : ""
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
    )
}

export default TestPage