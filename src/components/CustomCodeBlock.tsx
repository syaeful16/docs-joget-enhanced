"use client";

import { useState, useRef, useEffect } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";

// NEW: CodeMirror + languages
import CodeMirror from "@uiw/react-codemirror";
import { vscodeLight } from "@uiw/codemirror-theme-vscode";
import { javascript } from "@codemirror/lang-javascript";
import { html as htmlLang } from "@codemirror/lang-html";
import { css as cssLang } from "@codemirror/lang-css";
import { json as jsonLang } from "@codemirror/lang-json";
import { markdown as markdownLang } from "@codemirror/lang-markdown";
import { xml as xmlLang } from "@codemirror/lang-xml";
import { sql as sqlLang } from "@codemirror/lang-sql";
import { python as pythonLang } from "@codemirror/lang-python";

const LANGUAGES = [
  "javascript","typescript","html","css","python","java","cpp","c","csharp","php","ruby","go",
  "rust","swift","kotlin","scala","r","sql","bash","powershell","yaml","json","xml",
  "markdown","plaintext"
];

// NEW: mapping bahasa ke extensions CodeMirror (fallback ke plaintext)
function languageExtensions(lang: string) {
  switch (lang) {
    case "javascript": return [javascript()];
    case "typescript": return [javascript({ typescript: true })];
    case "html": return [htmlLang()];
    case "css": return [cssLang()];
    case "json": return [jsonLang()];
    case "markdown": return [markdownLang()];
    case "xml": return [xmlLang()];
    case "sql": return [sqlLang()];
    case "python": return [pythonLang()];
    default: return []; // plaintext
  }
}

function CustomCodeView({
  block,
  editor,
}: {
  block: PartialBlock;
  editor: BlockNoteEditor;
}) {
  const codeProp =
        typeof block.props === "object" && block.props !== null && "code" in block.props
            ? (block.props as any).code
            : "";
    const languageProp =
        typeof block.props === "object" && block.props !== null && "language" in block.props
            ? (block.props as any).language
            : "javascript";

    const [activeTab, setActiveTab] = useState<"render" | "code">(
      languageProp === "html" ? "render" : "code"
    );
    const [code, setCode] = useState(codeProp);
    const [language, setLanguage] = useState(languageProp);
    const canRender = language === "html";

    // Hapus state isEditing; kita langsung pakai editor CodeMirror di tab "Code"
    // const [isEditing, setIsEditing] = useState(false);

    const isReadOnly = !((editor as any)?.isEditable ?? true);

    // Debounce update agar tidak terlalu sering update block
    const cmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const updateCodeDebounced = (val: string) => {
      setCode(val);
      if (cmTimer.current) clearTimeout(cmTimer.current);
      cmTimer.current = setTimeout(() => {
        editor.updateBlock(block.id!, {
          props: { ...block.props, code: val, language },
        });
      }, 300);
    };

    // Jika bukan HTML, pastikan tidak berada di tab Render
    useEffect(() => {
      if (!canRender && activeTab === "render") {
        setActiveTab("code");
      }
    }, [canRender, activeTab]);

    const update = (next: { code?: string; language?: string }) => {
        editor.updateBlock(block.id!, {
            props: {
                ...block.props,
                code: next.code ?? code,
                language: next.language ?? language,
            },
        });
        if (next.code !== undefined) setCode(next.code);
        if (next.language !== undefined) setLanguage(next.language);
        // Ketika ganti bahasa dari html -> lainnya, pindah ke tab Code
        if (next.language && next.language !== "html" && activeTab === "render") {
          setActiveTab("code");
        }
    };

    if (isReadOnly) {
        return (
            <div className="w-full rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 bg-neutral-50">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-500 ml-2">
                            {language}
                        </span>
                    </div>
                </div>
                {language === "html" && code ? (
                    <div
                        className="w-full p-4 bg-neutral-50 overflow-auto"
                        // Catatan: sanitasi jika sumber tidak tepercaya
                        dangerouslySetInnerHTML={{ __html: code }}
                    />
                ) : (
                    <pre className="w-full p-4 bg-neutral-50 overflow-auto">
                        <code className={`language-${language}`}>
                            {code || `// No ${language} code`}
                        </code>
                    </pre>
                )}
            </div>
        );
    }

    return (
        <div className="w-full rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 bg-neutral-50">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs font-medium text-neutral-500 ml-2">
                        {language}
                    </span>
                </div>
                <select
                    value={language}
                    onChange={(e) => update({ language: e.target.value })}
                    className="h-8 px-3 text-xs border border-neutral-200 rounded-md bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-0 transition-colors"
                >
                    {LANGUAGES.map((lang) => (
                        <option key={lang} value={lang}>
                            {lang.charAt(0).toUpperCase() + lang.slice(1)}
                        </option>
                    ))}
                </select>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-200">
              {canRender && (
                <button
                  onClick={() => setActiveTab("render")}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === "render" ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  Render
                  {activeTab === "render" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
                </button>
              )}
                <button
                    onClick={() => setActiveTab("code")}
                    className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                        activeTab === "code" ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                    }`}
                >
                    Code
                    {activeTab === "code" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {canRender && activeTab === "render" ? (
                    code ? (
                        <div
                            className="w-full min-h-[200px] rounded-md border border-neutral-200 p-4 bg-white"
                            dangerouslySetInnerHTML={{ __html: code }}
                        />
                    ) : (
                        <div className="w-full min-h-[200px] rounded-md border border-dashed border-neutral-300 p-4 bg-neutral-50 text-neutral-400 flex items-center justify-center text-sm">
                            No code to render
                        </div>
                    )
                ) : (
                  <CodeMirror
                    value={code}
                    height="260px"
                    theme={vscodeLight}
                    extensions={languageExtensions(language)}
                    basicSetup={{
                      lineNumbers: true,
                      highlightActiveLine: true,
                      bracketMatching: true,
                      autocompletion: true,
                      indentOnInput: true,
                    }}
                    onChange={(val) => updateCodeDebounced(val)}
                    className="cm-no-focus-outline"
                  />
                )}
            </div>
        </div>
    );
}

export const createCustomCodeBlock = createReactBlockSpec(
  {
    type: "customCodeBlock",
    propSchema: {
      code: { default: "" },
      language: {
        default: "javascript",
        values: [
          "javascript","typescript","html","css","python","java","cpp","c","csharp","php","ruby","go",
          "rust","swift","kotlin","scala","r","sql","bash","powershell","yaml","json","xml",
          "markdown","plaintext"
        ],
      },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => (
      <CustomCodeView
        block={block as any}
        editor={editor as any}
      />
    ),
  }
);