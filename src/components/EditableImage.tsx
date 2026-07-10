import React from 'react';

interface EditableImageProps extends React.HTMLAttributes<HTMLImageElement> {
    id: string;
    isEditing: boolean;
    onClick: (id: string) => void;
    customImages: Record<string, string>;
    src?: string;
    alt?: string;
    className?: string;
    [key: string]: any;
}

export default function EditableImage({ id, isEditing, onClick, customImages, src, ...props }: EditableImageProps) {
    const finalSrc = customImages[id] || src || '';
    
    if (isEditing) {
        return (
            <div className="relative group" style={{ display: 'contents' }}>
                <img
                    {...props}
                    src={finalSrc}
                    onClick={() => onClick(id)}
                    className={`${props.className || ''} cursor-pointer border-2 border-dashed border-blue-500 ring-4 ring-blue-500/20 hover:scale-[1.01] transition-all duration-200`}
                />
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClick(id);
                    }}
                    className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white font-sans font-black text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-lg border border-blue-400/30 flex items-center gap-1 z-50 pointer-events-auto cursor-pointer"
                >
                    <span>📸 Thay Ảnh</span>
                </button>
            </div>
        );
    }

    return (
        <img
            {...props}
            src={finalSrc}
            className={props.className || ''}
        />
    );
}
