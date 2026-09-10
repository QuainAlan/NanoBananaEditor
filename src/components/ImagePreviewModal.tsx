import React from 'react';
import { Dialog } from './ui/Dialog';

interface ImagePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title: string;
  description?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ open, onOpenChange, imageUrl, title, description }) => (
  <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description} size="lg">
    <div className="checkerboard overflow-hidden rounded-xl border border-line">
      {imageUrl && <img src={imageUrl} alt={title} className="mx-auto block max-h-[70vh] w-auto max-w-full" />}
    </div>
  </Dialog>
);
