"use client"

import Link from "next/link"
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { usePathname } from "next/navigation"

export default function Navbar() {
    const pathname = usePathname()
    
    return (
        <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60">
            <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4">
                {/* Logo/Brand */}
                <div className="flex items-center space-x-2">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-lg bg-black flex items-center justify-center">
                            <span className="text-white font-bold text-sm">D</span>
                        </div>
                        <span className="font-bold text-xl text-gray-900">Docs</span>
                    </Link>
                </div>

                <div className="flex items-center gap-8">
                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-6">
                        {/* Public Documentation Link */}
                        <SignedIn>
                            <Link 
                                href="/dashboard/docs" 
                                className={`text-sm font-medium transition-colors hover:text-gray-900 ${
                                    pathname.startsWith('/dashboard/docs') ? 'text-gray-900' : 'text-gray-600'
                                }`}
                            >
                                My Documents
                            </Link>
                        </SignedIn>
                    </div>

                    {/* Right side - Auth */}
                    <div className="flex items-center space-x-4">
                        <SignedOut>
                            <Link 
                                href="/sign-in" 
                                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link 
                                href="/sign-up" 
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-black text-white hover:bg-gray-800 h-9 px-4 py-2"
                            >
                                Sign Up
                            </Link>
                        </SignedOut>

                        <SignedIn>
                            <UserButton 
                                afterSignOutUrl="/"
                                appearance={{
                                    elements: {
                                        avatarBox: "h-8 w-8",
                                    }
                                }}
                            />
                        </SignedIn>
                    </div>
                </div>
            </div>
        </nav>
    )
}
