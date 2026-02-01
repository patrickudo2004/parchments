import React, { useCallback, useRef, useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

export const ImageResizer: React.FC<NodeViewProps> = (props) => {
    const { node, updateAttributes, selected } = props;
    const { src, alt, title, width: initialWidth, 'data-asset-name': assetName } = node.attrs;

    const [aspectRatio, setAspectRatio] = useState<number>(1);
    const [isResizing, setIsResizing] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize aspect ratio once the image loads
    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        if (naturalWidth && naturalHeight) {
            setAspectRatio(naturalWidth / naturalHeight);
        }
    }, []);

    const handleResizeStart = useCallback((corner: 'nw' | 'ne' | 'sw' | 'se') => (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsResizing(true);
        const startX = e.clientX;
        const startWidth = imgRef.current?.getBoundingClientRect().width || 0;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const currentX = moveEvent.clientX;
            let diffX = currentX - startX;

            // Invert diff for left-side handles
            if (corner === 'nw' || corner === 'sw') {
                diffX = -diffX;
            }

            // Since it's centered, expansion/shrink happens on both sides
            const newWidth = Math.max(100, startWidth + diffX * 2);
            updateAttributes({ width: `${Math.round(newWidth)}px` });
        };

        const onMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, [updateAttributes]);

    return (
        <NodeViewWrapper className="image-resizer-wrapper">
            <div
                ref={containerRef}
                className={`relative inline-block group transition-shadow duration-300 ${selected ? 'ring-2 ring-primary ring-offset-4 rounded-lg' : ''}`}
                style={{ width: initialWidth || 'auto', maxWidth: '100%' }}
            >
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    title={title}
                    onLoad={onImageLoad}
                    data-asset-name={assetName}
                    className="block w-full h-auto rounded-lg shadow-md cursor-pointer"
                />

                {selected && (
                    <>
                        {/* Status Overlay */}
                        {isResizing && (
                            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center rounded-lg pointer-events-none z-10">
                                <span className="bg-primary text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">
                                    {initialWidth}
                                </span>
                            </div>
                        )}

                        {/* Resize Handles */}
                        <div
                            className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border-2 border-white rounded-full cursor-nwse-resize shadow-sm hover:scale-125 transition-transform z-20"
                            onMouseDown={handleResizeStart('se')}
                        />
                        <div
                            className="absolute -bottom-1 -left-1 w-3 h-3 bg-primary border-2 border-white rounded-full cursor-nesw-resize shadow-sm hover:scale-125 transition-transform z-20"
                            onMouseDown={handleResizeStart('sw')}
                        />
                        <div
                            className="absolute -top-1 -right-1 w-3 h-3 bg-primary border-2 border-white rounded-full cursor-nesw-resize shadow-sm hover:scale-125 transition-transform z-20"
                            onMouseDown={handleResizeStart('ne')}
                        />
                        <div
                            className="absolute -top-1 -left-1 w-3 h-3 bg-primary border-2 border-white rounded-full cursor-nwse-resize shadow-sm hover:scale-125 transition-transform z-20"
                            onMouseDown={handleResizeStart('nw')}
                        />
                    </>
                )}
            </div>
        </NodeViewWrapper>
    );
};
