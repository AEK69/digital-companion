import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, SwitchCamera, Flashlight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, isOpen, onClose }: BarcodeScannerProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const lastScannedRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);

        // Check for flash capability
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setHasFlash(!!capabilities?.torch);
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      toast({
        title: 'ບໍ່ສາມາດເປີດກ້ອງໄດ້',
        description: 'ກະລຸນາອະນຸຍາດໃຫ້ເຂົ້າເຖິງກ້ອງ',
        variant: 'destructive',
      });
    }
  }, [facingMode, toast]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setFlashOn(false);
  }, []);

  // Toggle flash
  const toggleFlash = useCallback(async () => {
    if (!streamRef.current) return;
    
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !flashOn } as MediaTrackConstraintSet],
      });
      setFlashOn(!flashOn);
    } catch (error) {
      console.error('Error toggling flash:', error);
    }
  }, [flashOn]);

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  // Barcode detection using BarcodeDetector API (where available)
  useEffect(() => {
    if (!isScanning || !videoRef.current) return;

    let animationId: number;
    let barcodeDetector: BarcodeDetector | null = null;

    // Check if BarcodeDetector is available
    if ('BarcodeDetector' in window) {
      barcodeDetector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code', 'upc_a', 'upc_e'],
      });
    }

    const detectBarcode = async () => {
      if (!videoRef.current || !barcodeDetector) {
        animationId = requestAnimationFrame(detectBarcode);
        return;
      }

      try {
        const barcodes = await barcodeDetector.detect(videoRef.current);
        
        if (barcodes.length > 0) {
          const barcode = barcodes[0].rawValue;
          const now = Date.now();
          
          // Debounce: same barcode within 2 seconds
          if (barcode !== lastScannedRef.current || now - lastScanTimeRef.current > 2000) {
            lastScannedRef.current = barcode;
            lastScanTimeRef.current = now;
            
            onScan(barcode);
            
            // Visual feedback
            toast({
              title: 'ສະແກນສຳເລັດ',
              description: barcode,
            });
          }
        }
      } catch (error) {
        // Ignore detection errors
      }

      animationId = requestAnimationFrame(detectBarcode);
    };

    if (barcodeDetector) {
      detectBarcode();
    } else {
      toast({
        title: 'ບໍ່ຮອງຮັບ BarcodeDetector',
        description: 'ກະລຸນາໃຊ້ Chrome ຫຼື Edge ລຸ້ນໃໝ່',
        variant: 'destructive',
      });
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isScanning, onScan, toast]);

  // Start/stop camera based on dialog state
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isOpen, startCamera, stopCamera]);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (isOpen && isScanning) {
      startCamera();
    }
  }, [facingMode, isOpen, isScanning, startCamera]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            ສະແກນບາໂຄ້ດ / QR Code
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative bg-black aspect-[4/3]">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Scan overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-40 border-2 border-primary rounded-lg relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
              
              {/* Scanning line animation */}
              <div className="absolute inset-x-4 top-1/2 h-0.5 bg-primary animate-pulse" />
            </div>
          </div>
          
          {/* Controls */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
            <Button
              variant="secondary"
              size="icon"
              onClick={switchCamera}
              className="rounded-full"
            >
              <SwitchCamera className="w-5 h-5" />
            </Button>
            
            {hasFlash && (
              <Button
                variant={flashOn ? "default" : "secondary"}
                size="icon"
                onClick={toggleFlash}
                className="rounded-full"
              >
                <Flashlight className="w-5 h-5" />
              </Button>
            )}
            
            <Button
              variant="destructive"
              size="icon"
              onClick={onClose}
              className="rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="p-4 text-center text-sm text-muted-foreground">
          ຈັດວາງບາໂຄ້ດໃຫ້ຢູ່ໃນກອບ ແລະ ຖືນິ້ງໆ
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Type declaration for BarcodeDetector API
declare global {
  interface Window {
    BarcodeDetector: typeof BarcodeDetector;
  }
  
  class BarcodeDetector {
    constructor(options?: { formats: string[] });
    detect(source: HTMLVideoElement | HTMLImageElement | ImageBitmap): Promise<{ rawValue: string; format: string }[]>;
    static getSupportedFormats(): Promise<string[]>;
  }
}
