"use client";

import { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";

const LANGUAGES = [
  "javascript","typescript","html","css","python","java","cpp","c","csharp","php","ruby","go",
  "rust","swift","kotlin","scala","r","sql","bash","powershell","yaml","json","xml",
  "markdown","plaintext"
];

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

  const [activeTab, setActiveTab] = useState<"render" | "code">("render");
  const [code, setCode] = useState(codeProp);
  const [language, setLanguage] = useState(languageProp);
  const [isEditing, setIsEditing] = useState(false);

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
  };

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
        <button
          onClick={() => setActiveTab("render")}
          className={`relative px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "render"
              ? "text-neutral-900"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Render
          {activeTab === "render" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab("code")}
          className={`relative px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "code"
              ? "text-neutral-900"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Code
          {activeTab === "code" && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900"></div>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "render" ? (
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
        ) : isEditing ? (
          <div className="space-y-3">
            <textarea
              value={code}
              onChange={(e) => update({ code: e.target.value })}
              className="w-full min-h-[200px] p-3 border border-neutral-300 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-neutral-50"
              placeholder={`Enter your ${language} code here...`}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md bg-neutral-900 text-white hover:bg-neutral-800 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <pre className="w-full min-h-[200px] p-4 bg-neutral-950 rounded-md overflow-auto">
              <code className={`text-sm font-mono text-neutral-50 language-${language}`}>
                {code || `// No ${language} code yet`}
              </code>
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center justify-center h-9 px-4 text-sm font-medium rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 hover:text-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:ring-offset-2"
              >
                Edit Code
              </button>
            </div>
          </div>
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