import React, { useCallback, useRef, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';

export const ImageResizer: React.FC<NodeViewProps> = (props) => {
    const { node, updateAttributes, selected } = props;
    const { src, alt, title, width: initialWidth, 'data-asset-name': assetName } = node.attrs;


    const [isResizing, setIsResizing] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initialize aspect ratio once the image loads
    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        if (naturalWidth && naturalHeight) {
            // aspectRatio is not used currently, but we keep the load handler for other potential uses
        }
    }, []);

    const handleResizeStart = useCallback((corner: 'nw' | 'ne' | 'sw' | 'se') => (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsResizing(true);
        const startX = e.clientX;
        const startWidth = imgRef.current?.getBoundingClientRect().width || 0;

        const onPointerMove = (moveEvent: PointerEvent) => {
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

        const onPointerUp = () => {
            setIsResizing(false);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
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

                        {/* Resize Handles (Touch-Accessible Hit Targets) */}
                        <div
                            className="absolute -bottom-2.5 -right-2.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-20 touch-none group/handle select-none"
                            onPointerDown={handleResizeStart('se')}
                        >
                            <div className="w-3.5 h-3.5 bg-primary border-2 border-white rounded-full shadow-md group-hover/handle:scale-125 transition-transform" />
                        </div>
                        <div
                            className="absolute -bottom-2.5 -left-2.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-20 touch-none group/handle select-none"
                            onPointerDown={handleResizeStart('sw')}
                        >
                            <div className="w-3.5 h-3.5 bg-primary border-2 border-white rounded-full shadow-md group-hover/handle:scale-125 transition-transform" />
                        </div>
                        <div
                            className="absolute -top-2.5 -right-2.5 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-20 touch-none group/handle select-none"
                            onPointerDown={handleResizeStart('ne')}
                        >
                            <div className="w-3.5 h-3.5 bg-primary border-2 border-white rounded-full shadow-md group-hover/handle:scale-125 transition-transform" />
                        </div>
                        <div
                            className="absolute -top-2.5 -left-2.5 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-20 touch-none group/handle select-none"
                            onPointerDown={handleResizeStart('nw')}
                        >
                            <div className="w-3.5 h-3.5 bg-primary border-2 border-white rounded-full shadow-md group-hover/handle:scale-125 transition-transform" />
                        </div>
                    </>
                )}
            </div>
        </NodeViewWrapper>
    );
};
