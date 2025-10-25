"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import type { PartialBlock } from "@blocknote/core";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { createCustomCodeBlock } from "./CustomCodeBlock";

type Props = {
  content?: PartialBlock[] | null;
};

export default function BlockNoteViewer({ content }: Props) {
  const schema = BlockNoteSchema.create().extend({
    blockSpecs: {
      ...defaultBlockSpecs,
      customCodeBlock: createCustomCodeBlock(),
    },
  });

  const editor = useCreateBlockNote({
    schema,
    initialContent: (content as PartialBlock[] | undefined) ?? [],
  });

  // Pastikan read-only
  // Catatan: BlockNote tidak punya prop editable untuk view Mantine; nonaktifkan UI editing lewat style/opsi lain jika perlu.
  return (
    <div className="prose prose-gray max-w-none">
      <BlockNoteView
        editor={editor}
        theme="light"
        className="bg-white"
        // Tidak menampilkan slashMenu agar terasa read-only
        slashMenu={false}
        editable={false as any}
      />
    </div>
  );
}