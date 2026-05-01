import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedImage: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ image, onCropComplete, onSkip, onCancel }) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', (error) => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
  ): Promise<string> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Limit output size by resizing if needed to stay under 1MB
    const finalCanvas = document.createElement('canvas');
    const MAX_DIM = 800; 
    let targetWidth = canvas.width;
    let targetHeight = canvas.height;

    if (targetWidth > targetHeight) {
      if (targetWidth > MAX_DIM) {
        targetHeight *= MAX_DIM / targetWidth;
        targetWidth = MAX_DIM;
      }
    } else {
      if (targetHeight > MAX_DIM) {
        targetWidth *= MAX_DIM / targetHeight;
        targetHeight = MAX_DIM;
      }
    }

    finalCanvas.width = targetWidth;
    finalCanvas.height = targetHeight;
    const finalCtx = finalCanvas.getContext('2d');
    finalCtx?.drawImage(canvas, 0, 0, targetWidth, targetHeight);

    return finalCanvas.toDataURL('image/jpeg', 0.6);
  };

  const handleDone = async () => {
    if (croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(image, croppedAreaPixels);
        onCropComplete(croppedImage);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between text-white border-b border-white/10 bg-slate-900">
        <button onClick={onCancel} className="p-2 hover:bg-white/10 rounded-full transition-all">
          <X size={24} />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-black tracking-widest uppercase">Crop & Adjust</h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onSkip}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-all border border-white/5"
          >
            Skip (সরাসরি সেভ)
          </button>
          <button 
            onClick={handleDone}
            className="bg-indigo-600 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
          >
            <Check size={18} strokeWidth={3} /> Done
          </button>
        </div>
      </div>

      {/* Main Cropper Area */}
      <div className="flex-grow relative bg-black">
        <Cropper
          image={image}
          crop={crop}
          zoom={zoom}
          aspect={4 / 3}
          onCropChange={setCrop}
          onCropComplete={onCropCompleteInternal}
          onZoomChange={setZoom}
          minZoom={0.5}
          maxZoom={5}
        />
      </div>

      {/* Controls Footer */}
      <div className="bg-slate-900 p-8 space-y-4">
        <div className="max-w-xl mx-auto flex items-center gap-4">
          <ZoomOut size={18} className="text-slate-400" />
          <input
            type="range"
            value={zoom}
            min={0.5}
            max={5}
            step={0.1}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-grow h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <ZoomIn size={18} className="text-slate-400" />
        </div>

        <div className="text-center">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
            Drag to Move • Pinch or Slider to Zoom
          </p>
        </div>
      </div>
    </div>
  );
};

