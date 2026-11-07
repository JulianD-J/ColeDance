import React, { useEffect, useState } from 'react';
import { socketService } from '../services/socketService';

export const PhoneController: React.FC = () => {
  const queryParams = new URLSearchParams(window.location.search);
  const initialRoom = queryParams.get('room') || '8291';

  const [roomId, setRoomId] = useState(initialRoom);
  const [playerName, setPlayerName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ff1493');
  const [isConnected, setIsConnected] = useState(false);
  const [motionIntensity, setMotionIntensity] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [lastFeedback, setLastFeedback] = useState('READY');
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Colors for phone controller setup
  const colors = ['#ff1493', '#00d2ff', '#ffea00', '#10b981', '#a855f7', '#f97316'];

  const requestMotionPermission = async () => {
    // iOS 13+ motion permission requirement check
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === 'granted') {
          setPermissionGranted(true);
        }
      } catch (e) {
        console.log('Motion permission request error:', e);
      }
    } else {
      setPermissionGranted(true);
    }
  };

  const handleJoin = () => {
    if (!roomId.trim()) return;
    requestMotionPermission();

    const socket = socketService.initSocket();
    const avatarSeed = `P_${Date.now()}`;

    socketService.joinRoom(roomId.trim(), playerName || 'Dancer', avatarSeed, selectedColor);

    socket.on('joined_successfully', (data) => {
      setIsConnected(true);
    });

    socket.on('haptic_feedback', (data: { feedback: string; pointsAdded: number; totalScore: number }) => {
      setLastFeedback(data.feedback);
      setTotalScore(data.totalScore);

      // Trigger phone vibration haptics
      if (navigator.vibrate) {
        navigator.vibrate(data.feedback === 'PERFECT' ? [100, 50, 100] : [80]);
      }
    });

    socket.on('join_error', (msg: string) => {
      alert(msg);
    });
  };

  // Motion Detection Hook
  useEffect(() => {
    if (!isConnected) return;

    let lastX = 0, lastY = 0, lastZ = 0;

    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity || { x: 0, y: 0, z: 0 };
      const x = accel.x || 0;
      const y = accel.y || 0;
      const z = accel.z || 0;

      const deltaX = Math.abs(x - lastX);
      const deltaY = Math.abs(y - lastY);
      const deltaZ = Math.abs(z - lastZ);
      const intensity = deltaX + deltaY + deltaZ;

      lastX = x;
      lastY = y;
      lastZ = z;

      setMotionIntensity(Math.min(100, Math.floor(intensity * 3)));

      if (intensity > 8) {
        socketService.sendMotionData({ x, y, z }, { alpha: 0, beta: 0, gamma: 0 }, intensity);
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);
    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion);
    };
  }, [isConnected]);

  // Manual gesture shake button for mobile devices without gyroscope permission
  const handleManualShake = () => {
    const fakeIntensity = 22;
    setMotionIntensity(80);
    socketService.sendMotionData({ x: 10, y: 15, z: 5 }, { alpha: 0, beta: 0, gamma: 0 }, fakeIntensity, 'SHAKE');

    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  if (!isConnected) {
    return (
      <main className="min-h-screen bg-[#0b051b] text-white flex flex-col justify-center items-center p-6 select-none font-sans">
        <div className="w-full max-w-sm bg-[#130b33]/90 border border-pink-500/50 rounded-3xl p-6 shadow-2xl space-y-5 text-center backdrop-blur-md">
          <div className="w-14 h-14 bg-pink-500/20 text-pink-500 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-pink-500/40 shadow-lg">
            <i className="fa-solid fa-mobile-screen-button"></i>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black italic tracking-wider text-white">
              COLE<span className="text-pink-500">DANCE</span>
            </h1>
            <p className="text-xs text-white/70">Smartphone Motion Controller</p>
          </div>

          <div className="space-y-3 text-left">
            <div>
              <label className="text-[10px] font-black uppercase text-pink-400">Room Code</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="e.g. 8291"
                className="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-xl text-center font-black text-lg text-yellow-300 tracking-widest focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-pink-400">Your Dancer Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter Name"
                className="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-xl font-bold text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-pink-400">Glow Color</label>
              <div className="flex justify-between items-center pt-1">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition ${
                      selectedColor === c ? 'scale-125 border-white shadow-lg' : 'border-transparent opacity-70'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleJoin}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black italic rounded-2xl shadow-2xl text-base tracking-wider hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            JOIN GAME AS CONTROLLER
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen text-white flex flex-col justify-between p-6 select-none font-sans relative overflow-hidden"
      style={{ backgroundColor: '#09051d' }}
    >
      {/* Top Controller Header */}
      <div className="flex justify-between items-center bg-black/50 p-4 rounded-2xl border border-white/10">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full animate-ping" style={{ backgroundColor: selectedColor }}></span>
          <span className="font-black text-sm">{playerName || 'Dancer'}</span>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-white/60">SCORE</div>
          <div className="text-lg font-black text-yellow-300">{totalScore.toLocaleString()}</div>
        </div>
      </div>

      {/* Main Feedback & Shake Sensor Graphic */}
      <div className="flex-1 flex flex-col justify-center items-center space-y-6 my-4">
        {/* Dynamic Move Feedback Popup */}
        <div className="text-center space-y-2">
          <div className="text-3xl font-black italic tracking-widest text-pink-400 bg-pink-950/80 px-6 py-2 rounded-2xl border border-pink-500 shadow-[0_0_30px_rgba(255,20,147,0.8)] animate-pulse">
            {lastFeedback}
          </div>
          <p className="text-xs text-white/70 font-semibold">Hold phone in right hand and dance!</p>
        </div>

        {/* Motion Intensity Gauge Bar */}
        <div className="w-full max-w-xs space-y-1">
          <div className="flex justify-between text-[10px] font-extrabold text-white/60">
            <span>MOTION ACCELERATION</span>
            <span>{motionIntensity}%</span>
          </div>
          <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 p-0.5">
            <div
              className="h-full rounded-full transition-all duration-75"
              style={{
                width: `${motionIntensity}%`,
                backgroundColor: selectedColor,
              }}
            ></div>
          </div>
        </div>

        {/* Tap/Shake Gesture Button for high score triggers */}
        <button
          onClick={handleManualShake}
          className="w-48 h-48 rounded-full border-4 border-white/30 flex flex-col items-center justify-center space-y-2 shadow-[0_0_50px_rgba(255,20,147,0.6)] active:scale-95 transition cursor-pointer"
          style={{ background: `radial-gradient(circle, ${selectedColor} 0%, #11052c 100%)` }}
        >
          <i className="fa-solid fa-bolt text-4xl text-white animate-bounce"></i>
          <span className="font-black italic text-sm tracking-wider">TAP OR SHAKE!</span>
        </button>
      </div>

      {/* Bottom Status */}
      <div className="text-center text-[10px] font-bold text-white/40">
        Connected to Room #{roomId} • ColeDance Phone Sync
      </div>
    </main>
  );
};
