"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { PartialBlock } from "@blocknote/core";
import { BlockNoteSchema, defaultBlockSpecs, filterSuggestionItems } from "@blocknote/core";
import {
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
} from "@blocknote/react";
import { useLayoutEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { createCustomCodeBlock } from "./CustomCodeBlock";
import { HiOutlineGlobeAlt } from "react-icons/hi";

type Props = {
  initialContent?: PartialBlock[];
  onChange?: (content: PartialBlock[]) => void;
};

function EditorContent({ initialContent, onChange }: Props) {
  const schema = BlockNoteSchema.create().extend({
    blockSpecs: {
      ...defaultBlockSpecs,
      customCodeBlock: createCustomCodeBlock(),
    },
  });

  const editor = useCreateBlockNote({
    schema,
    initialContent,
    uploadFile: async (file: File) => {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload_image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

        const result = await response.json();
        if (result.success) return result.url;
        throw new Error(result.error || 'Upload failed');
      } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
      }
    },
  });

  const hydrated = useRef(false);
  useLayoutEffect(() => {
    if (hydrated.current) return;
    if (!initialContent || initialContent.length === 0) return;
    
    // Gunakan setTimeout untuk menghindari flushSync
    setTimeout(() => {
      editor.replaceBlocks(editor.topLevelBlocks, initialContent);
      hydrated.current = true;
    }, 0);
  }, [editor, initialContent]);

  const insertCustomCodeItem = (ed: typeof editor) => ({
    title: "Custom Code Block",
    onItemClick: () =>
      ed.insertBlocks(
        [
          {
            type: "customCodeBlock",
            props: { language: "javascript", code: "" },
          },
        ],
        ed.getTextCursorPosition().block,
        "after"
      ),
    aliases: ["custom", "customcode", "code"],
    group: "Insert",
    icon: <HiOutlineGlobeAlt size={18} />,
    subtext: "Insert a custom code block with language select",
  });

  const getItems = (ed: typeof editor): DefaultReactSuggestionItem[] => [
    ...getDefaultReactSlashMenuItems(ed),
    insertCustomCodeItem(ed),
  ];

  return (
    <div className="w-full mx-auto">
      <BlockNoteView
        editor={editor}
        className="bg-white"
        theme="light"
        slashMenu={false}
        onChange={() => {
          onChange?.(editor.topLevelBlocks as PartialBlock[]);
        }}
      >
        <SuggestionMenuController
          triggerCharacter={"/"}
          getItems={async (query) =>
            filterSuggestionItems(getItems(editor), query)
          }
        />
      </BlockNoteView>
    </div>
  );
}

const DynamicEditor = dynamic(() => Promise.resolve(EditorContent), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-4xl mx-auto bg-white">
      <div className="h-32 flex items-center justify-center text-gray-500">
        Loading editor...
      </div>
    </div>
  ),
});

export default function BlockNoteEditor(props: Props) {
  return <DynamicEditor {...props} />;
}