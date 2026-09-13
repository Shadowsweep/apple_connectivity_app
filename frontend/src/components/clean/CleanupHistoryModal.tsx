import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useCleanHistory } from '../../hooks/useCleanMobile';
import { formatBytes, formatDate } from '../../utils/formatters';
import { History, Smartphone } from 'lucide-react';

interface CleanupHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CleanupHistoryModal: React.FC<CleanupHistoryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: history = [], isLoading } = useCleanHistory();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mobile Cleanup History & Audit Log"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-[#A0A6B8]">
          Complete record of all mobile cleanup sessions executed from MEMEASY.
        </p>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#6B7280]">Loading cleanup history...</div>
        ) : history.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#6B7280] flex flex-col items-center gap-2">
            <History className="w-8 h-8 opacity-40 text-[#A0A6B8]" />
            <span>No cleanup sessions recorded yet.</span>
          </div>
        ) : (
          <div className="divide-y divide-[#232736] border border-[#232736] bg-[#1A1D28] rounded-xl overflow-hidden max-h-[400px] overflow-y-auto">
            {history.map((record) => (
              <div key={record.id} className="p-4 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-[#2E7CF6]" />
                    <span className="font-semibold text-white">{record.device_id}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        record.status === 'COMPLETED'
                          ? 'bg-[#00D68F]/15 text-[#00D68F]'
                          : record.status === 'PAUSED_DISCONNECTED'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                  <div className="text-[#6B7280]">
                    {formatDate(record.started_at)}
                    {record.completed_at && ` • Finished ${formatDate(record.completed_at)}`}
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="font-bold text-[#00D68F]">
                    +{formatBytes(record.bytes_reclaimed)} Reclaimed
                  </div>
                  <div className="text-[11px] text-[#A0A6B8]">
                    {record.deleted_items} deleted • {record.failed_items} skipped
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
