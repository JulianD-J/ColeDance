import React, { useEffect, useRef, useState } from 'react';
import { yoloTracker } from '../../services/yoloPoseTracker';
import { YoloPersonDetection } from '../../types/game';
import { soundEngine } from '../../services/soundEffects';

interface YoloDiagnosticModalProps {
  onClose: () => void;
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
      <div className="bg-[#0b0622] border-2 border-cyan-500/60 rounded-3xl max-w-3xl w-full p-6 space-y-5 shadow-[0_0_60px_rgba(0,210,255,0.5)] text-white relative">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-400 text-lg shadow">
              <i className="fa-solid fa-radar"></i>
            </div>
            <div>
              <h2 className="text-xl font-black italic tracking-wider text-white">
                YOLOv8 / YOLO11 MULTI-PERSON DETECTION DIAGNOSTIC
              </h2>
              <div className="text-[11px] text-cyan-300 font-bold flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>ONNX Runtime Web Engine Active • {fps} FPS</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-white cursor-pointer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Live Camera View with YOLO Overlay */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative h-64 bg-black rounded-2xl overflow-hidden border-2 border-cyan-500/60 shadow-2xl flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
            <canvas
              ref={canvasRef}
              width={560}
              height={320}
              className="absolute inset-0 w-full h-full transform -scale-x-100 pointer-events-none"
            />

            {!cameraActive && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center space-y-2 text-xs text-white/60">
                <i className="fa-solid fa-spinner animate-spin text-2xl text-cyan-400"></i>
                <span>Initializing webcam for YOLO multi-person pose tracking...</span>
              </div>
            )}
          </div>

          {/* Right Panel: Detected Persons List (1 to 5) */}
          <div className="bg-black/50 p-4 rounded-2xl border border-white/10 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="text-xs font-black uppercase text-cyan-400 tracking-wider flex justify-between">
                <span>DETECTED PEOPLE ({detections.length}/5)</span>
                <span className="text-emerald-400">{cameraActive ? 'LIVE' : 'OFFLINE'}</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {detections.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-xl bg-white/5 border border-white/15 flex items-center justify-between text-xs font-bold"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor:
                            p.id === 1
                              ? '#ff1493'
                              : p.id === 2
                              ? '#00d2ff'
                              : p.id === 3
                              ? '#ffea00'
                              : p.id === 4
                              ? '#10b981'
                              : '#a855f7',
                        }}
                      ></span>
                      <span>Person #{p.id}</span>
                    </div>

                    <div className="text-[10px] text-yellow-300 font-mono">
                      {Math.round(p.score * 100)}% CONF
                    </div>
                  </div>
                ))}

                {detections.length === 0 && cameraActive && (
                  <div className="text-center py-6 text-xs text-white/50 italic">
                    No person detected. Stand in camera view!
                  </div>
                )}
              </div>
            </div>

            <div className="text-[10px] text-white/60 bg-white/5 p-2 rounded-xl border border-white/10">
              💡 YOLOv8/11 detects up to 5 dancers simultaneously. Persons are assigned IDs from Left to Right.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black italic rounded-xl text-xs shadow-lg hover:scale-105 transition cursor-pointer"
          >
            CLOSE DIAGNOSTIC
          </button>
        </div>
      </div>
    </div>
  );
};
