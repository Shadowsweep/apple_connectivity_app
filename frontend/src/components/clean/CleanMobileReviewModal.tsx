import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { CleanItem } from '../../types/clean';
import { formatBytes } from '../../utils/formatters';
import {
  ShieldCheck,
  ShieldAlert,
  HardDrive,
  Smartphone,
  CheckCircle2,
  XCircle,
  Hash,
  FileCheck,
} from '../icons';

interface CleanMobileReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CleanItem | null;
}

export const CleanMobileReviewModal: React.FC<CleanMobileReviewModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  if (!item) return null;

  const isCleanable = item.status === 'CLEANABLE';
  const isUnverified = item.status === 'UNVERIFIED_CANDIDATE';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Safety Verification Details" maxWidth="max-w-xl">
      <div className="space-y-5">
        {/* Status Badge */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            isCleanable
              ? 'bg-[#00D68F]/10 border-[#00D68F]/30 text-[#00D68F]'
              : isUnverified
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {isCleanable ? (
            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">
              {isCleanable
                ? 'Fully Verified & Safe to Clean'
                : isUnverified
                ? 'Unverified Candidate (Blocked from Deletion)'
                : 'Not Backed Up (Device Only)'}
            </h4>
            <p className="text-xs leading-relaxed opacity-90">
              {item.verification.reason ||
                (isCleanable
                  ? 'All cryptographic SHA-256 signatures, file sizes, and storage locations match the Windows vault.'
                  : 'Cannot be cleaned without successful verification.')}
            </p>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Device Side */}
          <div className="p-3.5 bg-[#1A1D28] border border-[#232736] rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#A0A6B8]">
              <Smartphone className="w-4 h-4 text-(--mm-accent)" />
              <span>Mobile Device File</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="text-white font-medium truncate" title={item.filename}>
                {item.filename}
              </div>
              <div className="text-[#6B7280]">
                Size: <span className="text-[#A0A6B8]">{formatBytes(item.device_size_bytes)}</span>
              </div>
              <div className="text-[11px] text-[#6B7280] font-mono truncate" title={item.source_path_str}>
                {item.source_path_str}
              </div>
            </div>
          </div>

          {/* Local Windows Side */}
          <div className="p-3.5 bg-[#1A1D28] border border-[#232736] rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#A0A6B8]">
              <HardDrive className="w-4 h-4 text-[#00D68F]" />
              <span>Windows Vault Copy</span>
            </div>
            <div className="space-y-1 text-xs">
              <div
                className="text-white font-medium truncate"
                title={item.local_relative_path || 'No local record'}
              >
                {item.local_relative_path ? item.filename : 'Not in vault'}
              </div>
              <div className="text-[#6B7280]">
                Size:{' '}
                <span className="text-[#A0A6B8]">
                  {item.local_size_bytes ? formatBytes(item.local_size_bytes) : '0 B'}
                </span>
              </div>
              <div
                className="text-[11px] text-[#6B7280] font-mono truncate"
                title={item.local_relative_path || 'N/A'}
              >
                {item.local_relative_path || 'None'}
              </div>
            </div>
          </div>
        </div>

        {/* Verification Checkpoints */}
        <div className="p-4 bg-[#1A1D28] border border-[#232736] rounded-xl space-y-3">
          <h5 className="text-xs font-semibold text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-(--mm-accent)" /> Multi-Tier Verification Gates
          </h5>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[#A0A6B8]">Discovered on connected device</span>
              {item.verification.discovered_on_device ? (
                <CheckCircle2 className="w-4 h-4 text-[#00D68F]" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#A0A6B8]">Indexed in local SQLite catalog</span>
              {item.verification.import_completed ? (
                <CheckCircle2 className="w-4 h-4 text-[#00D68F]" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#A0A6B8]">Confirmed intact on Windows local disk</span>
              {item.verification.local_file_exists ? (
                <CheckCircle2 className="w-4 h-4 text-[#00D68F]" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[#A0A6B8] flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-[#6B7280]" /> Cryptographic SHA-256 Hash Match
              </span>
              {item.verification.content_identity_matched ? (
                <CheckCircle2 className="w-4 h-4 text-[#00D68F]" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
