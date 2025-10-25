"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DocumentCardSkeleton from "@/components/DocumentCardSkeleton";
import { Loader2Icon, Plus } from "lucide-react";

type Doc = {
    id: string;
    title: string;
    created_at: string;
    is_public: boolean;
};

export default function DocsPage() {
    const { user, isLoaded } = useUser();
    const [docs, setDocs] = useState<Doc[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    const [loadingDocs, setLoadingDocs] = useState<boolean>(true)
    const [loadingCreateDoc, setLoadingCreateDoc] = useState<boolean>(false)

    // Ambil dokumen user saat ini
    useEffect(() => {
        if (!user) return;

        const fetchDocs = async () => {
            try {
                const { data, error } = await supabase
                    .from("docs")
                    .select("id, title, is_public, created_at")
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });
        
                if (error) console.error(error);
                else setDocs(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingDocs(false);
            }
        };
        
        fetchDocs();
    }, [user]);

    // Buat dokumen baru
    const handleCreate = async () => {
        if (!user) return;

        setLoadingCreateDoc(true)
        const { data, error } = await supabase
            .from("docs")
            .insert({
                user_id: user.id,
                title: "Untitled Document",
            })
            .select()
            .single();

        if (error) {
            console.error(error);
        } else {
            router.push(`/dashboard/docs/${data.id}`);
        }
        setLoadingCreateDoc(false)
    };

    // Hapus dokumen
    const handleDelete = async (docId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent navigation when clicking delete
        
        if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
            return;
        }

        setDeletingId(docId);
        
        try {
            const { error } = await supabase
                .from("docs")
                .delete()
                .eq("id", docId);

            if (error) {
                console.error("Error deleting document:", error);
                alert("Failed to delete document. Please try again.");
            } else {
                // Remove from local state
                setDocs(docs.filter(doc => doc.id !== docId));
            }
        } catch (error) {
            console.error("Error deleting document:", error);
            alert("Failed to delete document. Please try again.");
        } finally {
            setDeletingId(null);
        }
    };

    if (loadingDocs) {
        return (
            <div className="min-h-screen bg-gray-50/50">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Breadcrumb Skeleton */}
                    <div className="flex mb-8 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                        <div className="mx-2 h-4 bg-gray-200 rounded w-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </div>
            
                    {/* Header Skeleton */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                        <div className="mb-4 sm:mb-0">
                            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-64"></div>
                        </div>
                        <div className="h-10 bg-gray-200 rounded w-32"></div>
                    </div>
        
                    {/* Documents Grid Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <DocumentCardSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumb */}
                <nav className="flex mb-8" aria-label="Breadcrumb">
                    <ol className="inline-flex items-center space-x-1 md:space-x-3">
                        <li>
                            <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                                </svg>
                                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">Documents</span>
                            </div>
                        </li>
                    </ol>
                </nav>

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                    <div className="mb-4 sm:mb-0">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Documents</h1>
                        <p className="mt-2 text-sm text-gray-600">Create and manage your documentation</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                    >
                        {loadingCreateDoc ? (
                            <Loader2Icon
                                aria-label="Loading"
                                className="size-4 animate-spin"
                            />
                        ): (
                            <Plus className="size-4"/>
                        )}
                        New Document
                    </button>
                </div>

                {/* Documents Grid */}
                {docs.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">Get started by creating your first document to organize your thoughts and ideas.</p>
                        <button
                            onClick={handleCreate}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Your First Document
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {docs.map((doc) => (
                            <div
                                key={doc.id}
                                className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer relative"
                                onClick={() => router.push(`/dashboard/docs/${doc.id}`)}
                            >
                                {/* Document Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-medium text-gray-900 truncate group-hover:text-gray-700 transition-colors">
                                                {doc.title}
                                            </h3>
                                        </div>
                                    </div>
                                
                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => handleDelete(doc.id, e)}
                                        disabled={deletingId === doc.id}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all duration-200 disabled:opacity-50"
                                        title="Delete document"
                                    >
                                        {deletingId === doc.id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                        ) : (
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        )}
                                    </button>
                                </div>

                                {/* Document Info */}
                                <div className="space-y-2">
                                    <p className="text-xs text-gray-500">
                                        Created {new Date(doc.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                    <div className="w-full flex items-center justify-between">
                                        <div className="flex items-center text-xs text-gray-400">
                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Last edited recently
                                        </div>
                                        <div className={`flex items-center text-xs border ${doc.is_public ? "text-green-500 bg-green-50 border-green-200" : "text-red-500 bg-red-50 border-red-200"} rounded-xl px-3 py-0.5`}>
                                            <p>{doc.is_public ? "Public" : "Private"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Hover indicator */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}