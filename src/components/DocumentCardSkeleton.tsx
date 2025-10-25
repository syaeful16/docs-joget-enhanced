import React from 'react'

const DocumentCardSkeleton = () => {
    return (
        <div className="group bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
            {/* Document Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 min-w-0">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
                <div className="w-6 h-6 bg-gray-200 rounded"></div>
            </div>
    
            {/* Document Info */}
            <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                <div className="flex items-center space-x-4">
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
            </div>
    
            {/* Hover indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg"></div>
        </div>
    )
}

export default DocumentCardSkeleton