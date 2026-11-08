import React from 'react';
import { soundEngine } from '../../services/soundEffects';
import { Modal, Button } from '../ui';

interface GenericModalProps {
  title: string;
  body: string;
  onClose: () => void;
}

export const GenericModal: React.FC<GenericModalProps> = ({ title, body, onClose }) => {
  return (
    <Modal
      isOpen={true}
      onClose={() => { soundEngine.playClick(); onClose(); }}
      title={title}
      variant="confirmation"
      showCloseButton={false}
      footer={
        <Button variant="primary" size="md" fullWidth onClick={() => { soundEngine.playClick(); onClose(); }}>
          CLOSE
        </Button>
      }
    >
      <motion.div
        className="text-center space-y-4"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-16 h-16 bg-brand-500/20 text-brand-400 rounded-2xl flex items-center justify-center mx-auto text-2xl border border-brand-500/40 shadow-brand-glow">
          <svg className="w-8 h-8 text-sun-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
        </div>
        <p className="text-body-medium text-on-surface/80 leading-relaxed">{body}</p>
      </motion.div>
    </Modal>
  );
};

/* Import motion for GenericModal */
import { motion } from 'motion/react';

export default GenericModal;