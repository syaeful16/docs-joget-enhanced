"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import DocumentCardSkeleton from "@/components/DocumentCardSkeleton";
import { Loader2Icon, Plus, Search } from "lucide-react";

// Hydration-safe date formatting (UTC) to avoid server/client mismatch
function formatDateStable(iso: string): string {
    try {
        return (
            new Intl.DateTimeFormat("en-US", {
                year: "numeric",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "UTC",
            }).format(new Date(iso)) + " UTC"
        );
    } catch {
        const d = new Date(iso);
        return isNaN(d.getTime()) ? "" : d.toISOString();
    }
}

type Doc = {
    id: string;
    slug: string;         // NEW
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

    // Search & Pagination
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 9;
    const [totalCount, setTotalCount] = useState(0);
    const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

    // Modal: New Document
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMounted, setModalMounted] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [formTitle, setFormTitle] = useState<string>("");
    const [formCategory, setFormCategory] = useState<string>("Form Element");
    const [formError, setFormError] = useState<string | null>(null);
    const CATEGORIES = [
        "Form Element",
        "Permission",
        "Validator",
        "Plugin",
        "App",
        "Helper",
        "Tutorial",
        "Other",
    ];

    // Modal: Delete Document
    const [deleteModalMounted, setDeleteModalMounted] = useState(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

    // Ambil dokumen user saat ini
    useEffect(() => {
        if (!user) return;

        const fetchDocs = async () => {
            setLoadingDocs(true);
            try {
                const from = (page - 1) * PAGE_SIZE;
                const to = from + PAGE_SIZE - 1;

                let query = supabase
                    .from("docs")
                    .select("id,slug,title,created_at,is_public", { count: "exact" })
                    .eq("user_id", user.id);

                if (debouncedSearch) {
                    query = query.ilike("title", `%${debouncedSearch}%`);
                }

                const { data, error, count } = await query
                    .order("created_at", { ascending: false })
                    .range(from, to);

                if (error) {
                    console.error(error);
                    setDocs([]);
                    setTotalCount(0);
                } else {
                    setDocs(data || []);
                    setTotalCount(count || 0);
                }
            } catch (err) {
                console.error(err);
                setDocs([]);
                setTotalCount(0);
            } finally {
                setLoadingDocs(false);
            }
        };

        fetchDocs();
    }, [user, page, debouncedSearch]);

    // debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
        return () => clearTimeout(t);
    }, [search]);

    // Buka modal create
    const handleOpenCreateModal = () => {
        setFormTitle("");
        setFormCategory(CATEGORIES[0]);
        setFormError(null);
        setIsModalOpen(true);
        setModalMounted(true);
        // Next tick: play enter animation
        requestAnimationFrame(() => setModalVisible(true));
    };

    const closeCreateModal = () => {
        if (loadingCreateDoc) return;
        // Play exit animation then unmount
        setModalVisible(false);
        setTimeout(() => {
            setModalMounted(false);
            setIsModalOpen(false);
        }, 200); // duration should match transition
    };

    // Submit create dokumen baru
    const handleCreateSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!user) return;
        if (!formTitle.trim()) {
            setFormError("Title is required.");
            return;
        }
        setFormError(null);
        setLoadingCreateDoc(true);
        try {
            const { data, error } = await supabase
                .from("docs")
                .insert({
                    user_id: user.id,
                    title: formTitle.trim(),
                    category: formCategory,
                })
                .select("id, slug")
                .single();

            if (error) {
                console.error(error);
                setFormError("Failed to create document. Please try again.");
                return;
            }
            setIsModalOpen(false);
            router.push(`/dashboard/docs/${(data?.slug || data?.id)}`);
        } finally {
            setLoadingCreateDoc(false);
        }
    };

    // Buka modal delete
    const openDeleteModal = (doc: Doc, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteTarget({ id: doc.id, title: doc.title });
        setDeleteModalMounted(true);
        requestAnimationFrame(() => setDeleteModalVisible(true));
    };

    const closeDeleteModal = () => {
        setDeleteModalVisible(false);
        setTimeout(() => {
            setDeleteModalMounted(false);
            setDeleteTarget(null);
        }, 200);
    };

    // Hapus dokumen (tanpa native confirm, dipanggil dari modal)
    const handleDelete = async (docId: string, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent navigation when clicking delete

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
                const remaining = docs.filter(doc => doc.id !== docId);
                setDocs(remaining);
                // Refetch to ensure pagination/count stays accurate
                // If page becomes empty and not the first page, go back a page
                if (remaining.length === 0 && page > 1) {
                    setPage(page - 1);
                } else {
                    // trigger refetch by nudging totalCount
                    setTotalCount((c) => Math.max(0, c - 1));
                }
                closeDeleteModal();
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
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
            <div className="h-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-22">
                {/* Breadcrumb */}
                <nav className="flex" aria-label="Breadcrumb">
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
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-16">
                    <div className="mb-1 sm:mb-0">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Documents</h1>
                        <p className="mt-1 text-sm text-gray-600">Create and manage your documentation</p>
                    </div>
                    <div className="flex w-full sm:w-auto items-center gap-2">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search by title..."
                                className="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                            />
                        </div>
                        <button
                            onClick={handleOpenCreateModal}
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
                </div>

                {/* Documents Grid */}
                {docs.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">Try adjusting your search or create a new document.</p>
                        <button
                            onClick={handleOpenCreateModal}
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Your First Document
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {docs.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="group bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer relative"
                                    onClick={() => router.push(`/dashboard/docs/${doc.slug || doc.id}`)}
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
                                            onClick={(e) => openDeleteModal(doc, e)}
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
                                        <p className="text-xs text-gray-500">Created {formatDateStable(doc.created_at)}</p>
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

                        {/* Pagination */}
                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-gray-600">
                                {totalCount > 0 ? (
                                    <>Showing <span className="font-medium">{(page - 1) * PAGE_SIZE + 1}</span>–<span className="font-medium">{Math.min(page * PAGE_SIZE, totalCount)}</span> of <span className="font-medium">{totalCount}</span></>
                                ) : (
                                    <>No results</>
                                )}
                            </p>
                            <div className="inline-flex items-center gap-1">
                                <button
                                    onClick={() => setPage(1)}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    First
                                </button>
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Prev
                                </button>
                                <span className="px-2 text-sm text-gray-600">Page {page} of {totalPages}</span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                                <button
                                    onClick={() => setPage(totalPages)}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Last
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
            {/* Modal New Document */}
            {modalMounted && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Backdrop */}
                    <div
                        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${modalVisible ? "opacity-100" : "opacity-0"}`}
                        onClick={closeCreateModal}
                    />
                    {/* Dialog */}
                    <div className={`relative z-10 w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200 transition-all duration-200 ease-out ${modalVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"}`}>
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-gray-900">Create New Document</h3>
                            <button
                                onClick={closeCreateModal}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50 transition"
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleCreateSubmit} className="px-5 py-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Enter document title"
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                <select
                                    value={formCategory}
                                    onChange={(e) => setFormCategory(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {formError && (
                                <p className="text-sm text-red-600">{formError}</p>
                            )}
                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    onClick={closeCreateModal}
                                    disabled={loadingCreateDoc}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-60"
                                    disabled={loadingCreateDoc}
                                >
                                    {loadingCreateDoc ? (
                                        <>
                                            <Loader2Icon className="size-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="size-4" />
                                            Create
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Delete Document */}
            {deleteModalMounted && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    role="dialog"
                    aria-modal="true"
                >
                    {/* Backdrop */}
                    <div
                        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${deleteModalVisible ? "opacity-100" : "opacity-0"}`}
                        onClick={closeDeleteModal}
                    />
                    {/* Dialog */}
                    <div className={`relative z-10 w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200 transition-all duration-200 ease-out ${deleteModalVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-2"}`}>
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-gray-900">Delete Document</h3>
                            <button
                                onClick={closeDeleteModal}
                                className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50 transition"
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="px-5 py-4">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-red-600">
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-700">Are you sure you want to delete this document?</p>
                                    <p className="mt-1 text-sm text-gray-500">This action cannot be undone.</p>
                                    {deleteTarget?.title && (
                                        <p className="mt-2 text-sm text-gray-900 font-medium">{deleteTarget.title}</p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-6 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                                    onClick={closeDeleteModal}
                                    disabled={deletingId === deleteTarget?.id}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-60"
                                    onClick={() => deleteTarget && handleDelete(deleteTarget.id)}
                                    disabled={deletingId === deleteTarget?.id}
                                >
                                    {deletingId === deleteTarget?.id ? (
                                        <>
                                            <Loader2Icon className="size-4 animate-spin" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>Delete</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}