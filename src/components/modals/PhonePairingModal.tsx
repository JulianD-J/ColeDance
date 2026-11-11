import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { Player } from '../../types/game';
import { soundEngine } from '../../services/soundEffects';
import { poseTracker, CameraEvaluationResult } from '../../services/poseTracker';
import { Modal, Button, IconButton, Badge, Chip, Avatar, Tooltip, Card } from '../ui';

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

  const getControllerUrl = () => {
    const base = import.meta.env.BASE_URL || '/';
    const normalizedBase = base.endsWith('/') ? base : `${base}/`;
    return `${window.location.origin}${normalizedBase}?controller=true&room=${roomId}`;
  };

  const controllerUrl = getControllerUrl();

  useEffect(() => {
    QRCode.toDataURL(controllerUrl, { margin: 1, width: 220 })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [controllerUrl]);

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
    <Modal
      isOpen={true}
      onClose={handleClose}
      title="PHONE PAIRING & CAMERA TEST"
      description={`Dance Room ${roomId} • Score Your Dance Moves!`}
      size="lg"
      variant="form"
      showCloseButton={false}
      footer={
        <Button variant="primary" size="lg" fullWidth onClick={handleClose} className="shadow-brand-glow">
          LET'S DANCE!
        </Button>
      }
    >
      <motion.div
        className="space-y-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Top Header with QR Code */}
        <Card variant="filled" padding="md" className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Tooltip content="Scan to join as phone controller" position="top">
              <div className="p-2 bg-white rounded-xl shadow-level-2 shrink-0">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR Code" className="w-16 h-16" />
                ) : (
                  <div className="w-16 h-16 bg-surface-2 flex items-center justify-center text-on-surface-variant">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                  </div>
                )}
              </div>
            </Tooltip>
            <div>
              <div className="text-label-small font-semibold text-on-surface-variant uppercase tracking-wider">Dance Room</div>
              <div className="text-headline-small font-black italic text-transparent bg-clip-text bg-gradient-to-r from-sun-400 to-brand-400 tracking-widest">{roomId}</div>
            </div>
          </div>

          <motion.div
            className="text-right shrink-0"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h3 className="text-title-medium font-black uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-sun-300 via-brand-400 to-accent-400">
              SCORE YOUR DANCE MOVES!
            </h3>
            <div className="text-label-small font-black uppercase text-success-400 tracking-wider mt-1">
              BE A SUPERSTAR OR A MEGASTAR!
            </div>
          </motion.div>
        </Card>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-surface-1/50 p-1.5 rounded-2xl border border-outline-variant">
          <Tooltip content="Setup Overview" position="bottom">
            <Button
              variant={tab === 'info' ? 'primary' : 'ghost'}
              size="sm"
              fullWidth
              leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>}
              onClick={() => { soundEngine.playClick(); setTab('info'); }}
            >
              SETUP OVERVIEW
            </Button>
          </Tooltip>

          <Tooltip content="Phone Controllers for Players 2-6" position="bottom">
            <Button
              variant={tab === 'phone' ? 'primary' : 'ghost'}
              size="sm"
              fullWidth
              leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>}
              onClick={() => { soundEngine.playClick(); setTab('phone'); }}
            >
              PHONE CONTROLLERS
            </Button>
          </Tooltip>

          <Tooltip content={hasCamera ? 'Test Single-Player Camera' : 'Camera Unavailable'} position="bottom">
            <Button
              variant={tab === 'camera' ? 'primary' : 'ghost'}
              size="sm"
              fullWidth
              leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>}
              onClick={() => {
                if (!hasCamera) {
                  soundEngine.playClick();
                  setTab('camera');
                  return;
                }
                handleStartCameraTest();
              }}
              disabled={!hasCamera}
            >
              {hasCamera ? 'TEST CAMERA' : 'CAMERA UNAVAILABLE'}
            </Button>
          </Tooltip>
        </div>

        {/* TAB 1: Setup Overview */}
        <AnimatePresence mode="wait">
          {tab === 'info' && (
            <motion.div
              key="info"
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Card variant="filled" padding="none" className="overflow-hidden">
                <div className="relative w-full aspect-video bg-surface-0">
                  <img
                    src={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/assets/aistudio/image_ce122d29.png`}
                    alt="Dance Room Setup"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />
                  <div className="absolute bottom-4 left-4 right-4 text-center">
                    <p className="text-body-small font-semibold text-white/95 drop-shadow-md max-w-xl mx-auto">
                      "Hold your smartphone in your right hand and follow the dancers on screen as if they were your reflection in a mirror."
                    </p>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card variant="filled" padding="md" className="border border-accent-500/30">
                  <div className="flex items-center gap-2 text-accent-400 font-black text-label-medium mb-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                    <span>Player 1: AI Camera</span>
                  </div>
                  <p className="text-body-small text-on-surface-variant">
                    Strictly 1 player tracked by webcam. Requires standing back so shoulders & arms are visible.
                  </p>
                </Card>

                <Card variant="filled" padding="md" className="border border-brand-500/30">
                  <div className="flex items-center gap-2 text-brand-400 font-black text-label-medium mb-2">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>
                    <span>Party Players: Phones</span>
                  </div>
                  <p className="text-body-small text-on-surface-variant">
                    Friends scan the QR code to join in live. Supports real-time motion sensors and vibration!
                  </p>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAB 2: Phone Pairing QR Details */}
        <AnimatePresence mode="wait">
          {tab === 'phone' && (
            <motion.div
              key="phone"
              className="flex flex-col items-center space-y-4 py-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Tooltip content="Scan with phone camera to join" position="top">
                <div className="p-4 bg-white rounded-2xl shadow-level-3">
                  {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-56 h-56" />}
                </div>
              </Tooltip>
              <div className="text-center space-y-2">
                <div className="text-label-small font-semibold text-on-surface-variant">Scan or visit on mobile:</div>
                <div className="text-body-small font-mono bg-surface-2 px-4 py-2 rounded-xl border border-outline-variant text-sun-400 break-all">
                  {controllerUrl}
                </div>
                <Button variant="ghost" size="sm" leadingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>} onClick={() => navigator.clipboard.writeText(controllerUrl)}>
                  COPY LINK
                </Button>
              </div>

              {/* Connected players */}
              <Card variant="filled" padding="md" className="w-full">
                <div className="text-label-small font-black uppercase text-on-surface-variant tracking-wider mb-3">Connected Controllers:</div>
                <div className="flex flex-wrap gap-2">
                  {players.map((p) => (
                    <Tooltip key={p.id} content={`${p.name} (${p.isPhoneController ? 'Phone' : 'Camera'})`} position="top">
                      <Chip
                        variant={p.isPhoneController ? 'primary' : 'secondary'}
                        size="sm"
                        avatar={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.avatarSeed}`}
                        label={p.name}
                        removable={false}
                      />
                    </Tooltip>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TAB 3: Test 1-Player Camera */}
        <AnimatePresence mode="wait">
          {tab === 'camera' && (
            <motion.div
              key="camera"
              className="space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {!hasCamera ? (
                <Card variant="filled" padding="lg" className="border-2 border-sun-500/50 text-center space-y-4">
                  <motion.div className="w-16 h-16 rounded-full bg-sun-500/20 text-sun-400 flex items-center justify-center mx-auto text-3xl border border-sun-500/40" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 17 }}>
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /><line x1="3" y1="3" x2="21" y2="21" /></svg>
                  </motion.div>
                  <div>
                    <h3 className="text-title-medium font-black text-sun-400 uppercase">No Camera Hardware Detected</h3>
                    <p className="text-body-small text-on-surface-variant max-w-sm mx-auto mt-1">
                      Your device doesn't have an accessible webcam. Don't worry! You can sync your smartphone as a motion controller or use keyboard arrow keys.
                    </p>
                  </div>
                  <Button variant="primary" size="md" onClick={() => { soundEngine.playClick(); setTab('phone'); }}>
                    Pair Smartphone Controller
                  </Button>
                </Card>
              ) : (
                <Card variant="filled" padding="none" className="overflow-hidden border-2 border-brand-500">
                  <div className="relative w-full aspect-video bg-black">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover -scale-x-100"
                    />
                    <canvas
                      ref={canvasRef}
                      width={480}
                      height={280}
                      className="absolute inset-0 w-full h-full -scale-x-100 pointer-events-none"
                    />

                    {/* Status overlay */}
                    <div className="absolute top-3 left-3 bg-surface-0/80 backdrop-blur px-3 py-1.5 rounded-xl text-label-small font-bold text-accent-400 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success-400 animate-ping" />
                      <span>SINGLE-PLAYER POSE TRACKER</span>
                    </div>

                    {cameraTestResult && (
                      <motion.div
                        className="absolute bottom-3 left-3 right-3 flex justify-between items-center bg-surface-0/90 backdrop-blur px-4 py-2.5 rounded-xl border border-outline-variant text-body-small"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="font-semibold text-sun-400">{cameraTestResult.statusTip}</div>
                        <Badge variant={cameraTestResult.feedback === 'PERFECT' ? 'success' : cameraTestResult.feedback === 'SUPER' ? 'secondary' : cameraTestResult.feedback === 'GOOD' ? 'primary' : 'warning'} size="md" dot>
                          {cameraTestResult.feedback} ({Math.round(cameraTestResult.motionVelocity * 100)}% SPEED)
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                </Card>
              )}

              <Card variant="outlined" padding="md" className="text-center">
                <div className="flex items-center justify-center gap-2 text-body-small text-on-surface-variant">
                  <svg className="w-5 h-5 text-brand-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                  <strong className="text-on-surface">Action-Based Scoring:</strong> Ensure you stand 5–8 feet away so your arms, shoulders, and chest are visible. Merely showing your face or standing still will register MISS!
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Modal>
  );
};

export default PhonePairingModal;