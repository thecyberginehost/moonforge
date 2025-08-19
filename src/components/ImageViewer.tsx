
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onImageUpdate: (newImageUrl: string) => void;
  onRegenerate: () => void;
}

const ImageViewer = ({ isOpen, onClose, imageUrl, onImageUpdate, onRegenerate }: ImageViewerProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    setImageDimensions({
      width: img.naturalWidth,
      height: img.naturalHeight
    });
    setImageLoaded(true);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'token-logo.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      toast.success("Image downloaded!");
    } catch (error) {
      console.error('Download failed:', error);
      toast.error("Failed to download image");
    }
  };

  const handleRegenerate = () => {
    onRegenerate();
    onClose();
  };

  const getImageContainerStyle = () => {
    if (!imageLoaded || !imageDimensions.width || !imageDimensions.height) {
      return { maxWidth: '100%', maxHeight: '70vh' };
    }

    const maxWidth = Math.min(imageDimensions.width, 800);
    const maxHeight = Math.min(imageDimensions.height, 600);
    
    // Calculate aspect ratio to maintain proportions
    const aspectRatio = imageDimensions.width / imageDimensions.height;
    
    let containerWidth = maxWidth;
    let containerHeight = maxHeight;
    
    if (containerWidth / containerHeight > aspectRatio) {
      containerWidth = containerHeight * aspectRatio;
    } else {
      containerHeight = containerWidth / aspectRatio;
    }

    return {
      width: `${containerWidth}px`,
      height: `${containerHeight}px`,
      maxWidth: '90vw',
      maxHeight: '70vh'
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-fit w-auto max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <span>Token Image Preview</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6">
          {/* Image Display */}
          <div className="mb-6 flex justify-center">
            <div 
              className="relative rounded-lg overflow-hidden bg-white shadow-sm border"
              style={getImageContainerStyle()}
            >
              <img
                src={imageUrl}
                alt="Token preview"
                className="w-full h-full object-contain"
                onLoad={handleImageLoad}
                onError={() => {
                  setImageLoaded(false);
                  toast.error("Failed to load image");
                }}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted">
                  <div className="text-muted-foreground text-sm">Loading image...</div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 justify-center">
            <Button 
              onClick={handleDownload}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            
            <Button 
              onClick={handleRegenerate}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Regenerate
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
