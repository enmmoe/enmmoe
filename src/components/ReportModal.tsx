import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { BottomSheet, Button, useToast } from './ui';
import { useLanguage } from '../utils/i18n';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetId: string;
}

const REASONS = [
  { id: 'spam', label: 'Spam or automated bot content' },
  { id: 'harassment', label: 'Harassment or hate speech' },
  { id: 'nudity', label: 'Inappropriate or explicit content' },
  { id: 'impersonation', label: 'Impersonation or fake account' },
  { id: 'misinformation', label: 'False or harmful information' },
];

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [selectedReason, setSelectedReason] = useState<string>('spam');
  const [extraDetails, setExtraDetails] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(t('report_submitted', 'Report submitted for review'), { type: 'success' });
    setExtraDetails('');
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={t('report', 'Report Content')}>
      <form onSubmit={handleSubmit} className="px-4 py-3 space-y-4">
        <p className="text-[15px] text-[#8E8E93]">
          Select a reason why you are reporting this content:
        </p>

        <div className="rounded-[18px] bg-[#F2F2F7] dark:bg-[#2C2C2E] divide-y divide-black/[0.06] dark:divide-white/[0.08] overflow-hidden">
          {REASONS.map((r) => {
            const selected = selectedReason === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedReason(r.id)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left text-[15px] cursor-pointer hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <span className={selected ? 'font-semibold text-[#007AFF]' : ''}>
                  {r.label}
                </span>
                {selected && <Check className="w-4 h-4 text-[#007AFF] shrink-0" />}
              </button>
            );
          })}
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#8E8E93] mb-1.5">
            Additional Details (optional)
          </label>
          <textarea
            value={extraDetails}
            onChange={(e) => setExtraDetails(e.target.value)}
            rows={3}
            placeholder="Provide context..."
            className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[15px] text-black dark:text-white placeholder:text-[#8E8E93] outline-none focus:ring-2 focus:ring-[#007AFF]/25 resize-none"
          />
        </div>

        <div className="flex items-center gap-2.5 pt-1">
          <Button type="button" variant="secondary" size="md" className="flex-1" onClick={onClose}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button type="submit" variant="destructive" size="md" className="flex-1">
            {t('submit_report', 'Submit Report')}
          </Button>
        </div>
      </form>
    </BottomSheet>
  );
};
