import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { yoloTracker } from '../../services/yoloPoseTracker';
import { YoloPersonDetection } from '../../types/game';
import { soundEngine } from '../../services/soundEffects';
import { Modal, Button, Badge, Card, Tooltip, Avatar, Chip } from '../ui';

interface YoloDiagnosticModalProps {
  onClose: () => void;
}

const personColors = ['#d91e6d', '#0ea5e9', '#f59e0b', '#22c55e', '#a855f7'];

export const YoloDiagnosticModal: React.FC<YoloDiagnosticModalProps> = ({ onClose }) => {
  const [detections, setDetections] = useState<YoloPersonDetection[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [fps, setFps] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const fpsTimer = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      setFps(Math.round(frameCount / dt));
      frameCount = 0;
      lastTime = now;
    }, 1000);

    if (videoRef.current && canvasRef.current) {
      yoloTracker.initialize(videoRef.current, canvasRef.current).then(() => {
        yoloTracker.startCamera().then((ok) => {
          setCameraActive(ok);
        });
      });

      yoloTracker.setShowYoloDebugOverlay(true);
      yoloTracker.setOnMultiPersonDetections((dets) => {
        setDetections(dets);
        frameCount++;
      });
    }

    return () => {
      clearInterval(fpsTimer);
      yoloTracker.stopCamera();
    };
  }, []);

  return (
    <Modal
      isOpen={true}
      onClose={() => { soundEngine.playClick(); onClose(); }}
      title="YOLOv8 / YOLO11 MULTI-PERSON DETECTION DIAGNOSTIC"
      description={`ONNX Runtime Web Engine Active • ${fps} FPS`}
      size="lg"
      variant="default"
      showCloseButton={true}
      footer={
        <Button variant="primary" size="md" onClick={() => { soundEngine.playClick(); onClose(); }} className="shadow-brand-glow">
          CLOSE DIAGNOSTIC
        </Button>
      }
    >
      <motion.div
        className="space-y-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Live Camera View with YOLO Overlay */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card variant="filled" padding="none" className="lg:col-span-2 overflow-hidden">
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-accent-500/60 shadow-xl flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
              <canvas
                ref={canvasRef}
                width={560}
                height={320}
                className="absolute inset-0 w-full h-full -scale-x-100 pointer-events-none"
              />

              {!cameraActive && (
                <motion.div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 text-body-small text-on-surface-variant" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <motion.div className="w-10 h-10 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />
                  <span>Initializing webcam for YOLO multi-person pose tracking...</span>
                </motion.div>
              )}
            </div>
          </Card>

          {/* Right Panel: Detected Persons List (1 to 5) */}
          <Card variant="filled" padding="md" className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-label-medium font-black uppercase text-accent-400 tracking-wider">DETECTED PEOPLE ({detections.length}/5)</span>
              <Badge variant={cameraActive ? 'success' : 'ghost'} size="sm" dot dotColor={cameraActive ? 'success' : 'warning'}>
                {cameraActive ? 'LIVE' : 'OFFLINE'}
              </Badge>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {detections.map((p) => (
                <div key={p.id} className="p-2.5 rounded-xl bg-surface-1/50 border border-outline-variant flex items-center justify-between text-body-small font-bold">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: personColors[(p.id - 1) % personColors.length] }} />
                    <span>Person #{p.id}</span>
                  </div>
                  <div className="text-label-small font-mono text-sun-400">{Math.round(p.score * 100)}% CONF</div>
                </div>
              ))}

              {detections.length === 0 && cameraActive && (
                <motion.div className="text-center py-6 text-body-small text-on-surface-variant italic" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  No person detected. Stand in camera view!
                </motion.div>
              )}
            </div>

            <Tooltip content="YOLOv8/11 detects up to 5 dancers simultaneously. Persons are assigned IDs from Left to Right." position="top">
              <div className="p-2 rounded-xl bg-surface-1/50 border border-outline-variant text-label-small text-on-surface-variant/70">
                💡 YOLOv8/11 detects up to 5 dancers simultaneously. Persons are assigned IDs from Left to Right.
              </div>
            </Tooltip>
          </Card>
        </div>
      </motion.div>
    </Modal>
  );
};

export default YoloDiagnosticModal;