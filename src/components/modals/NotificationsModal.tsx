import React, { useState } from 'react';
import { soundEngine } from '../../services/soundEffects';

interface NotificationsModalProps {
  onClose: () => void;
  onOpenSongs: () => void;
  onOpenTrainingStudio: () => void;
  onOpenPhonePairing: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  icon: string;
  color: string;
  actionText: string;
  action: 'songs' | 'training' | 'phone';
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New Headline Routine Available!',
    desc: 'Jump into "APT." by ROSÉ & Bruno Mars with 3-Coach multi-dancer formation.',
    time: 'Just now',
    icon: 'fa-music',
    color: 'from-pink-500 to-rose-600',
    actionText: 'DANCE NOW',
    action: 'songs',
  },
  {
    id: 'notif-2',
    title: 'Coach Choreo Training Studio Ready',
    desc: 'Upload any local dance video to extract frame-by-frame 17-keypoint coach movements.',
    time: '1h ago',
    icon: 'fa-graduation-cap',
    color: 'from-yellow-400 to-amber-600',
    actionText: 'OPEN STUDIO',
    action: 'training',
  },
  {
    id: 'notif-3',
    title: 'Phone Controller Motion Sync',
    desc: 'Use your smartphone gyroscope & accelerometer as a wireless motion controller.',
    time: '2h ago',
    icon: 'fa-mobile-screen-button',
    color: 'from-cyan-400 to-blue-600',
    actionText: 'PAIR PHONE',
    action: 'phone',
  },
];

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  onClose,
  onOpenSongs,
  onOpenTrainingStudio,
  onOpenPhonePairing,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const handleAction = (item: NotificationItem) => {
    soundEngine.playClick();
    onClose();
    if (item.action === 'songs') onOpenSongs();
    else if (item.action === 'training') onOpenTrainingStudio();
    else if (item.action === 'phone') onOpenPhonePairing();
  };

  const handleDismiss = (id: string) => {
    soundEngine.playClick();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    soundEngine.playClick();
    setNotifications([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="max-w-md w-full bg-[#130b33]/95 border-2 border-pink-500/80 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(255,20,147,0.4)] text-white space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-lg text-white shadow-lg">
              <i className="fa-solid fa-bell"></i>
            </div>
            <div>
              <h2 className="text-xl font-black italic tracking-wide text-white">NOTIFICATIONS</h2>
              <p className="text-[11px] text-white/60">Updates, challenges, and dance events</p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-600/80 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {notifications.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-xs text-white shadow`}
                  >
                    <i className={`fa-solid ${item.icon}`}></i>
                  </div>
                  <div>
                    <div className="text-xs font-black text-white">{item.title}</div>
                    <div className="text-[10px] text-white/40">{item.time}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleDismiss(item.id)}
                  className="text-white/40 hover:text-white text-xs p-1"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] text-white/70 leading-relaxed">{item.desc}</p>

              <button
                onClick={() => handleAction(item)}
                className="w-full py-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:scale-[1.01] text-white rounded-xl text-xs font-black italic shadow cursor-pointer transition flex items-center justify-center space-x-1.5"
              >
                <span>{item.actionText}</span>
                <i className="fa-solid fa-arrow-right text-[10px]"></i>
              </button>
            </div>
          ))}

          {notifications.length === 0 && (
            <div className="text-center py-8 text-white/50 text-xs font-bold space-y-2">
              <i className="fa-solid fa-circle-check text-2xl text-emerald-400"></i>
              <div>All notifications caught up!</div>
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs">
            <button
              onClick={handleClearAll}
              className="text-white/50 hover:text-white transition font-bold cursor-pointer"
            >
              Clear All
            </button>
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold cursor-pointer transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
