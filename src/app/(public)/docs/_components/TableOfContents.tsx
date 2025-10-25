"use client";

import { useEffect, useMemo, useState } from "react";

type TocItem = { id: string; text: string; level: number };

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function TableOfContents({ containerSelector }: { containerSelector: string }) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Build TOC by scanning h2/h3 inside content after render
  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const headings = Array.from(container.querySelectorAll<HTMLHeadingElement>("h2, h3"));
    const toc: TocItem[] = headings.map((h) => {
      if (!h.id) {
        h.id = slugify(h.textContent || "section");
      }
      return {
        id: h.id,
        text: h.textContent || "",
        level: h.tagName === "H2" ? 2 : 3,
      };
    });
    setItems(toc);

    // Observe active section
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.target as HTMLElement).offsetTop - (b.target as HTMLElement).offsetTop);
        if (visible[0]?.target) {
          setActiveId((visible[0].target as HTMLElement).id);
        }
      },
      { rootMargin: "0px 0px -70% 0px", threshold: [0, 1.0] }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [containerSelector]);

  const hasItems = useMemo(() => items.length > 0, [items]);

  if (!hasItems) {
    return (
      <div className="text-sm text-gray-500">On this page</div>
    );
  }

  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        On this page
      </div>
      <ul className="space-y-1 text-sm">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              className={`block rounded px-2 py-1 transition-colors ${
                activeId === it.id ? "bg-gray-100 text-gray-900" : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              } ${it.level === 3 ? "ml-4" : ""}`}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}