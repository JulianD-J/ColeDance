import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Player } from '../../types/game';
import { soundEngine } from '../../services/soundEffects';
import { poseTracker, CameraEvaluationResult } from '../../services/poseTracker';

interface PhonePairingModalProps {
  roomId: string;
  players: Player[];
  hasCamera?: boolean;
  onClose: () => void;
  onUpdateCameraStatus: (active: boolean) => void;
}

export const PhonePairingModal: React.FC<PhonePairingModalProps> = ({
  roomId,
  players,
  hasCamera = true,
  onClose,
  onUpdateCameraStatus,
}) => {
  const [tab, setTab] = useState<'info' | 'phone' | 'camera'>('info');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraTestResult, setCameraTestResult] = useState<CameraEvaluationResult | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Generate controller URL for QR Code
    const controllerUrl = `${window.location.origin}/?controller=true&room=${roomId}`;
    QRCode.toDataURL(controllerUrl, { margin: 1, width: 220 })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [roomId]);

  const handleStartCameraTest = async () => {
    soundEngine.playClick();
    setTab('camera');
    setTimeout(async () => {
      if (videoRef.current && canvasRef.current) {
        const initOk = await poseTracker.initialize(videoRef.current, canvasRef.current);
        if (initOk) {
          const camOk = await poseTracker.startCamera();
          setCameraActive(camOk);
          onUpdateCameraStatus(camOk);
          poseTracker.setTargetPose('RAISE_HANDS');
          poseTracker.setOnEvaluation((res) => {
            setCameraTestResult(res);
          });
        }
      }
    }, 150);
  };

  const handleClose = () => {
    soundEngine.playClick();
    if (cameraActive) {
      poseTracker.stopCamera();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
      <div className="bg-[#0b0622] border-2 border-indigo-500/60 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-[0_0_60px_rgba(0,210,255,0.4)] relative text-white">
        {/* Top Header matching image_ce122d29.png */}
        <div className="flex justify-between items-start pb-2 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded-lg shadow">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR" className="w-14 h-14" />
              ) : (
                <div className="w-14 h-14 bg-gray-200"></div>
              )}
            </div>
            <div>
              <div className="text-[11px] font-bold text-white/70">Dance Room</div>
              <div className="text-2xl font-black italic tracking-widest text-cyan-400">{roomId}</div>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-cyan-400">
              SCORE YOUR DANCE MOVES!
            </h2>
            <div className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
              BE A SUPERSTAR OR A MEGASTAR!
            </div>
          </div>

          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-xs text-white cursor-pointer ml-2"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-2 bg-black/40 p-1.5 rounded-2xl border border-white/10">
          <button
            onClick={() => {
              soundEngine.playClick();
              setTab('info');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              tab === 'info' ? 'bg-pink-600 text-white shadow-lg' : 'text-white/60 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-gamepad"></i>
            <span>SETUP OVERVIEW</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playClick();
              setTab('phone');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              tab === 'phone' ? 'bg-pink-600 text-white shadow-lg' : 'text-white/60 hover:text-white'
            }`}
          >
            <i className="fa-solid fa-mobile-screen"></i>
            <span>PHONE CONTROLLERS (P2-P6)</span>
          </button>

          <button
            onClick={() => {
              if (!hasCamera) {
                soundEngine.playClick();
                setTab('camera');
                return;
              }
              handleStartCameraTest();
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center space-x-1.5 ${
              tab === 'camera'
                ? 'bg-pink-600 text-white shadow-lg'
                : hasCamera
                ? 'text-white/60 hover:text-white'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <i className={hasCamera ? 'fa-solid fa-video' : 'fa-solid fa-video-slash'}></i>
            <span>{hasCamera ? 'TEST 1-PLAYER CAMERA' : 'CAMERA UNAVAILABLE'}</span>
          </button>
        </div>

        {/* TAB 1: Setup Overview with the artwork from image_ce122d29.png */}
        {tab === 'info' && (
          <div className="space-y-4">
            <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-white/20 shadow-xl flex items-center justify-center">
              <img
                src="/assets/aistudio/image_ce122d29.png"
                alt="Dance Room Setup"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30"></div>
              <div className="absolute bottom-3 left-4 right-4 text-center">
                <p className="text-xs md:text-sm font-semibold text-white/95 drop-shadow-md">
                  "Hold your smartphone in your right hand and follow the dancers on screen as if they were your reflection in a mirror."
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-black/50 p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-black text-cyan-400 flex items-center space-x-1.5">
                  <i className="fa-solid fa-camera"></i>
                  <span>Player 1: AI Camera</span>
                </div>
                <div className="text-[11px] text-white/70">
                  Strictly 1 player tracked by webcam. Requires standing back so shoulders & arms are visible.
                </div>
              </div>

              <div className="bg-black/50 p-3 rounded-xl border border-white/10 space-y-1">
                <div className="font-black text-pink-400 flex items-center space-x-1.5">
                  <i className="fa-solid fa-mobile-screen-button"></i>
                  <span>Party Players: Phones</span>
                </div>
                <div className="text-[11px] text-white/70">
                  Friends scan the QR code to join in live. Supports real-time motion sensors and vibration!
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Phone Pairing QR Details */}
        {tab === 'phone' && (
          <div className="flex flex-col items-center space-y-4 py-2">
            <div className="p-3 bg-white rounded-2xl shadow-2xl">
              {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />}
            </div>
            <div className="text-center space-y-1">
              <div className="text-xs font-bold text-white/70">Scan or visit on mobile:</div>
              <div className="text-xs font-mono bg-black/60 px-3 py-1 rounded border border-white/20 text-yellow-300">
                {window.location.origin}/?room={roomId}
              </div>
            </div>

            {/* Connected players */}
            <div className="w-full bg-black/40 p-3 rounded-xl border border-white/10 space-y-1">
              <div className="text-[10px] font-black uppercase text-white/60">Connected Controllers:</div>
              <div className="flex flex-wrap gap-2">
                {players.map((p) => (
                  <span
                    key={p.id}
                    className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/20 flex items-center space-x-1.5"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
                    <span>{p.name}</span>
                    <span className="text-[9px] text-pink-400">({p.isPhoneController ? 'Phone' : 'Camera P1'})</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Test 1-Player Camera */}
        {tab === 'camera' && (
          <div className="space-y-3">
            {!hasCamera ? (
              <div className="w-full h-56 bg-slate-900/90 rounded-2xl border-2 border-amber-500/50 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl border border-amber-500/40">
                  <i className="fa-solid fa-video-slash"></i>
                </div>
                <div>
                  <h3 className="text-base font-black text-amber-300 uppercase">No Camera Hardware Detected</h3>
                  <p className="text-xs text-white/70 max-w-sm mt-1">
                    Your device doesn't have an accessible webcam. Don't worry! You can sync your smartphone as a motion controller or use keyboard arrow keys.
                  </p>
                </div>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setTab('phone');
                  }}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-black cursor-pointer shadow transition"
                >
                  Pair Smartphone Controller
                </button>
              </div>
            ) : (
              <div className="relative w-full h-56 bg-black rounded-2xl overflow-hidden border-2 border-pink-500 shadow-2xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={280}
                  className="absolute inset-0 w-full h-full transform -scale-x-100 pointer-events-none"
                />

                {/* Status overlay */}
                <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-[10px] font-bold text-cyan-400 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>SINGLE-PLAYER POSE TRACKER</span>
                </div>

                {cameraTestResult && (
                  <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs">
                    <div className="font-bold text-yellow-300">{cameraTestResult.statusTip}</div>
                    <div className="font-black text-pink-400 uppercase tracking-wider">
                      {cameraTestResult.feedback} ({Math.round(cameraTestResult.motionVelocity * 100)}% SPEED)
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="text-[11px] text-white/80 bg-white/5 p-2.5 rounded-xl border border-white/10 text-center font-medium">
              💡 <strong>Action-Based Scoring:</strong> Ensure you stand 5–8 feet away so your arms, shoulders, and chest are visible. Merely showing your face or standing still will register MISS!
            </div>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleClose}
            className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:scale-105 transition font-black italic text-xs rounded-xl shadow-xl border border-white/20 cursor-pointer"
          >
            LET'S DANCE!
          </button>
        </div>
      </div>
    </div>
  );
};
