import React from 'react'

interface Section {
    id: string;
    label: string;
    items: Item[];
}

interface Item {
    id: string,
    title: string
}

const menus: Section[] = [
    {
        id: "sections",
        label: "Sections",
        items: [
            {
                id: "form-grid-enhanced",
                title: "Form Grid Enhanced"
            },
            {
                id: "dropdown-search",
                title: "Dropdown Search"
            },
            {
                id: "form-grid3",
                title: "Form Grid"
            },
            {
                id: "form-grid4",
                title: "Form Grid"
            },
            {
                id: "form-grid5",
                title: "Form Grid"
            },
            {
                id: "form-grid6",
                title: "Form Grid"
            }
        ]
    }
]

interface SidebarDocsProps {
    sidebarOpen: boolean;
    activeSection: string;
    setActiveSection: (id: string) => void;
    setSidebarOpen:(status: boolean) => void;
} 

const SidebarDocs = ({ sidebarOpen, activeSection, setActiveSection, setSidebarOpen }: SidebarDocsProps) => {
    return (
        <aside
            className={`fixed lg:sticky top-14 left-0 h-[calc(100vh-3.5rem)] w-64 overflow-y-auto transition-transform duration-300 z-40 ${
                sidebarOpen
                ? "translate-x-0"
                : "-translate-x-full lg:translate-x-0"
            }`}
        >
            <div className="py-10 px-5 space-y-5">
                {menus.map((menu) => (
                    <div key={menu.id} className='space-y-1'>
                        <div className="pb-2 px-3 text-xs font-normal text-gray-400 tracking-wide">
                            {menu.label}
                        </div>
                        {menu?.items?.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveSection(item.id);
                                    setSidebarOpen(false);
                                }}
                                className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors ${
                                    activeSection === item.id
                                    ? "bg-gray-100 text-black font-medium"
                                    : "text-gray-600 hover:bg-gray-50 hover:text-black"
                                }`}
                            >
                                {item.title}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
            {/* <div className="px-4 space-y-1">
                {sections.map((section) =>
                    section.type === "header" ? (
                        <div key={section.id} className="mt-8 pb-2 px-3 text-xs font-normal text-gray-400 tracking-wide">
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
            </div> */}
        </aside>
    )
}

export default SidebarDocs