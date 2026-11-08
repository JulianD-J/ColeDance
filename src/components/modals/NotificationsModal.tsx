import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { soundEngine } from '../../services/soundEffects';
import { Modal, Button, Badge, Chip, Tooltip, Card } from '../ui';

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
  icon: React.ReactNode;
  color: 'brand' | 'accent' | 'sun' | 'success' | 'error' | 'warning';
  actionText: string;
  action: 'songs' | 'training' | 'phone';
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'New Headline Routine Available!',
    desc: 'Jump into "APT." by ROSÉ & Bruno Mars with 3-Coach multi-dancer formation.',
    time: 'Just now',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
    color: 'brand',
    actionText: 'DANCE NOW',
    action: 'songs',
  },
  {
    id: 'notif-2',
    title: 'Coach Choreo Training Studio Ready',
    desc: 'Upload any local dance video to extract frame-by-frame 17-keypoint coach movements.',
    time: '1h ago',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>,
    color: 'sun',
    actionText: 'OPEN STUDIO',
    action: 'training',
  },
  {
    id: 'notif-3',
    title: 'Phone Controller Motion Sync',
    desc: 'Use your smartphone gyroscope & accelerometer as a wireless motion controller.',
    time: '2h ago',
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>,
    color: 'accent',
    actionText: 'PAIR PHONE',
    action: 'phone',
  },
];

const colorStyles = {
  brand: 'from-brand-500 to-brand-600',
  accent: 'from-accent-500 to-accent-600',
  sun: 'from-sun-500 to-sun-600',
  success: 'from-success-500 to-success-600',
  error: 'from-error-500 to-error-600',
  warning: 'from-sun-500 to-error-500',
};

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
    <Modal
      isOpen={true}
      onClose={() => { soundEngine.playClick(); onClose(); }}
      title="NOTIFICATIONS"
      description="Updates, challenges, and dance events"
      size="lg"
      variant="form"
      showCloseButton={true}
      footer={
        notifications.length > 0 ? (
          <div className="flex gap-3 w-full">
            <Button variant="outlined" fullWidth onClick={handleClearAll}>Clear All</Button>
            <Button variant="primary" fullWidth onClick={() => { soundEngine.playClick(); onClose(); }}>Close</Button>
          </div>
        ) : (
          <Button variant="primary" fullWidth onClick={() => { soundEngine.playClick(); onClose(); }}>Close</Button>
        )
      }
    >
      <motion.div
        className="space-y-3 max-h-[60vh] overflow-y-auto pr-1"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {notifications.length === 0 ? (
          <motion.div
            className="text-center py-12 text-on-surface-variant space-y-3"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 17 }}
          >
            <motion.div className="w-16 h-16 rounded-full bg-success-500/20 text-success-400 flex items-center justify-center mx-auto text-3xl" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 17 }}>
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            </motion.div>
            <div className="text-body-medium font-semibold text-on-surface">All notifications caught up!</div>
            <div className="text-body-small">No new updates at the moment.</div>
          </motion.div>
        ) : (
          notifications.map((item, index) => (
            <AnimatePresence key={item.id}>
              <motion.div
                className="bg-surface-1/50 border border-outline-variant rounded-2xl overflow-hidden"
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30, height: 0 }}
                transition={{ delay: 0.05 * index, type: 'spring', stiffness: 500, damping: 30 }}
              >
                <Card variant="filled" padding="md" className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${colorStyles[item.color]} flex items-center justify-center text-white shadow-level-1 shrink-0`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-body-medium font-black text-white truncate">{item.title}</h4>
                        <p className="text-label-small text-on-surface-variant">{item.time}</p>
                      </div>
                    </div>
                    <Tooltip content="Dismiss notification" position="left">
                      <Button variant="ghost" size="xs" onClick={() => handleDismiss(item.id)}>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      </Button>
                    </Tooltip>
                  </div>

                  <p className="text-body-small text-on-surface/80 leading-relaxed">{item.desc}</p>

                  <Tooltip content={item.actionText} position="bottom">
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      trailingIcon={<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5 12 19 12" /><polyline points="13 5 19 12 13 19" /></svg>}
                      onClick={() => handleAction(item)}
                    >
                      {item.actionText}
                    </Button>
                  </Tooltip>
                </Card>
              </motion.div>
            </AnimatePresence>
          ))
        )}
      </motion.div>
    </Modal>
  );
};

export default NotificationsModal;