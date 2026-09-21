import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { formatBytes } from '../../utils/formatters';
import { AlertTriangle, Trash2, ShieldCheck, Loader2 } from '../icons';

interface CleanConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  totalBytes: number;
  deviceName: string;
  isExecuting?: boolean;
}

export const CleanConfirmationModal: React.FC<CleanConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  count,
  totalBytes,
  deviceName,
  isExecuting = false,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [typedConfirm, setTypedConfirm] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAcknowledged(false);
      setTypedConfirm('');
    }
  }, [isOpen]);

  const canSubmit = acknowledged && typedConfirm.trim().toUpperCase() === 'DELETE' && !isExecuting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isExecuting && onClose()}
      title="Confirm Mobile Cleanup"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Warning Banner */}
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3.5 text-red-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <div className="font-bold text-white">Destructive Device Action</div>
            <div>
              This will permanently delete{' '}
              <strong className="text-white">{count} verified files ({formatBytes(totalBytes)})</strong> from{' '}
              <strong className="text-white">{deviceName}</strong> to reclaim storage on your phone.
            </div>
          </div>
        </div>

        {/* Local Vault Safety Guarantee */}
        <div className="p-3 bg-[#00D68F]/10 border border-[#00D68F]/20 rounded-xl flex items-center gap-3 text-xs text-[#00D68F]">
          <ShieldCheck className="w-4 h-4 flex-shrink-0" />
          <span>
            Your Windows local vault copies will remain <strong>100% untouched</strong>.
          </span>
        </div>

        {/* Confirmation Stage 1: Checkbox */}
        <div className="space-y-3 pt-2">
          <label className="flex items-start gap-2.5 text-xs text-[#A0A6B8] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 rounded border-gray-600 text-red-500 focus:ring-0 cursor-pointer"
            />
            <span>
              I understand that these files will be removed from my phone and cannot be undone on the device.
            </span>
          </label>

          {/* Confirmation Stage 2: Typing confirmation */}
          <div className="space-y-1.5">
            <div className="text-[11px] text-[#6B7280]">
              Type <strong className="text-white font-mono">DELETE</strong> below to confirm:
            </div>
            <input
              type="text"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 bg-[#1A1D28] border border-[#232736] rounded-lg text-sm text-white focus:outline-none focus:border-red-500 transition-colors font-mono uppercase"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#232736]">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isExecuting}>
            Cancel
          </Button>

          <Button
            variant="danger"
            size="sm"
            icon={isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            onClick={onConfirm}
            disabled={!canSubmit}
          >
            {isExecuting ? 'Cleaning Device...' : `Permanently Delete ${count} Items`}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
