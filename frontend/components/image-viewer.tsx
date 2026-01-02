"use client";

import { useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Printer, 
  Maximize2,
  Minimize2 
} from "lucide-react";
import { motion } from "framer-motion";

interface ImageViewerProps {
  imageUrl: string;
  alt: string;
}

export function ImageViewer({ imageUrl, alt }: ImageViewerProps) {
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = alt || "paper-image.jpg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open(imageUrl, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <div className={`relative ${isFullscreen ? "fixed inset-0 z-50 bg-black" : "h-full"}`}>
      {/* Image Controls Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center gap-2">
        <TransformWrapper>
          {({ zoomIn, zoomOut, resetTransform, instance }) => (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => zoomOut()}
                title="Zoom Out"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 min-w-[60px] text-center">
                {Math.round((instance?.transformState.scale || 1) * 100)}%
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => zoomIn()}
                title="Zoom In"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              
              <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-2" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRotate}
                title="Rotate 90°"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => resetTransform()}
                title="Reset View"
              >
                Reset
              </Button>
              
              <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-2" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrint}
                title="Print"
              >
                <Printer className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </TransformWrapper>
      </div>

      {/* Image Container with Zoom/Pan */}
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={4}
        centerOnInit
        wheel={{ step: 0.1 }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <TransformComponent
            wrapperClass="!w-full !h-full"
            contentClass="!w-full !h-full flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: rotation }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center"
            >
              <img
                src={imageUrl}
                alt={alt}
                className="max-w-full max-h-full object-contain"
                style={{
                  maxHeight: isFullscreen ? "100vh" : "calc(100vh - 300px)",
                }}
              />
            </motion.div>
          </TransformComponent>
        )}
      </TransformWrapper>
    </div>
  );
}
