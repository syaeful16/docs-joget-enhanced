"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = {
    id: string;
    title: string;
    category?: string | null;
};

export default function DocsSidebar({ activePath }: { activePath: string }) {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data, error } = await supabase
                    .from("docs")
                    .select("id,title,category")
                    .eq("is_public", true)
                    .order("category", { ascending: true })
                    .order("title", { ascending: true });

                if (error) {
                    console.error("Failed to fetch public docs:", error);
                    setItems([]);
                } else {
                    setItems(data || []);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const groups = items.reduce<Record<string, Item[]>>((acc, it) => {
        const key = it.category || "General";
        if (!acc[key]) acc[key] = [];
        acc[key].push(it);
        
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="text-sm text-gray-500">Loading...</div>
        );
    }

    return (
        <nav className="text-sm">
            {Object.entries(groups).map(([cat, list]) => (
                <div key={cat} className="mb-6">
                    <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {cat}
                    </div>
                    <ul className="space-y-1">
                        {list.map((it) => {
                            const href = `/docs/${it.id}`;
                            const active = activePath === href;
                            return (
                                <li key={it.id}>
                                    <Link
                                        href={href}
                                        className={`block rounded-md px-2 py-1.5 transition-colors ${
                                        active
                                            ? "bg-gray-100 text-gray-900"
                                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                        }`}
                                    >
                                        {it.title}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}