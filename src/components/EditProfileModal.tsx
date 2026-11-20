import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';
import { User } from '../types';
import { ENMMOE_AVATARS } from '../data/enmmoeAvatars';
import { Avatar, TextField, useToast } from './ui';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onSave: (updatedData: Partial<User>) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSave,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState(currentUser.name || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || ENMMOE_AVATARS[0].src);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      setBio(currentUser.bio || '');
      setAvatar(currentUser.avatar || ENMMOE_AVATARS[0].src);
      setError(null);
    }
  }, [isOpen, currentUser]);

  const handleSelectAvatar = (selectedSrc: string) => {
    setAvatar(selectedSrc);
    onSave({ avatar: selectedSrc });
  };

  const handleSave = () => {
    const cleanedUsername = username.replace(/^@/, '').trim();
    if (!name.trim()) {
      setError('Display name cannot be empty');
      return;
    }
    if (!cleanedUsername) {
      setError('Username cannot be empty');
      return;
    }

    onSave({
      name: name.trim(),
      username: cleanedUsername,
      bio: bio.trim(),
      avatar,
    });
    showToast('Profile saved', { type: 'success' });
    onClose();
  };

  const selectedAvatarOption = ENMMOE_AVATARS.find((item) => item.src === avatar);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/35 dark:bg-black/65 backdrop-blur-[2px]"
          />

          <motion.div
            id="edit-profile-modal-sheet"
            initial={{ y: '100%', opacity: 0.9 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.9 }}
            transition={{ type: 'spring', damping: 32, stiffness: 360 }}
            className="relative z-10 w-full sm:max-w-md h-[92vh] sm:h-auto sm:max-h-[90vh] bg-[#F2F2F7] dark:bg-[#1C1C1E] text-black dark:text-white rounded-t-[24px] sm:rounded-[24px] flex flex-col overflow-hidden shadow-2xl border-t sm:border border-black/[0.08] dark:border-white/[0.1]"
          >
            {/* Modal Header */}
            <header className="h-13 px-4 bg-white dark:bg-[#2C2C2E] border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between shrink-0">
              <button
                id="edit-profile-back-btn"
                type="button"
                onClick={onClose}
                className="text-[17px] text-[#007AFF] dark:text-[#0A84FF] py-2 pr-2 cursor-pointer ios-press"
              >
                Cancel
              </button>

              <h2 className="text-[17px] font-semibold">Edit Profile</h2>

              <button
                id="edit-profile-save-btn"
                type="button"
                onClick={handleSave}
                className="text-[17px] font-semibold text-[#007AFF] dark:text-[#0A84FF] py-2 pl-2 cursor-pointer ios-press"
              >
                Save
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 pb-safe">
              {/* Current Profile Image Preview + Netflix-Inspired 7-Avatar Picker */}
              <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 space-y-4 border border-black/[0.04] dark:border-white/[0.08]">
                <div className="flex items-center gap-3.5">
                  <Avatar
                    src={avatar}
                    name={name || 'User'}
                    size="lg"
                    className="rounded-2xl shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold text-black dark:text-white leading-snug">
                      Choose Profile Icon
                    </p>
                    <p className="text-[13px] text-[#8E8E93] mt-0.5">
                      {selectedAvatarOption
                        ? `Selected · ${selectedAvatarOption.label}`
                        : 'Select an enmmoe avatar below'}
                    </p>
                  </div>
                </div>

                <div
                  id="enmmoe-avatar-grid"
                  role="radiogroup"
                  aria-label="enmmoe profile icons"
                  className="grid grid-cols-4 gap-3 pt-1"
                >
                  {ENMMOE_AVATARS.map((item, idx) => {
                    const isSelected = avatar === item.src;
                    return (
                      <button
                        key={item.id}
                        id={`avatar-option-${idx + 1}`}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`Select ${item.label} avatar`}
                        onClick={() => handleSelectAvatar(item.src)}
                        className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${
                          isSelected
                            ? 'ring-[3px] ring-[#007AFF] dark:ring-[#0A84FF] scale-[1.03] shadow-md'
                            : 'ring-1 ring-black/[0.08] dark:ring-white/[0.1] opacity-85 hover:opacity-100 hover:scale-[1.02]'
                        }`}
                      >
                        <img
                          src={item.src}
                          alt={item.label}
                          className="w-full h-full object-cover"
                          loading="eager"
                        />
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center shadow-sm border border-white/80">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#2C2C2E] border border-black/30 dark:border-white/30 text-black dark:text-white text-[14px] font-medium">
                  {error}
                </div>
              )}

              <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl p-4 space-y-4 border border-black/[0.04] dark:border-white/[0.08]">
                <TextField
                  label="Display Name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Your name"
                />

                <TextField
                  label="Username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder="username"
                />

                <div className="space-y-1.5">
                  <label className="block text-[13px] font-medium text-[#8E8E93] px-1">
                    Bio
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Write a short bio..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F2F2F7] dark:bg-[#1C1C1E] text-[16px] text-black dark:text-white placeholder-[#8E8E93] border border-black/[0.06] dark:border-white/[0.08] focus:border-[#007AFF] focus:bg-white dark:focus:bg-[#2C2C2E] resize-none transition-all"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
