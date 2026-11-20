import avatar1 from '../assets/images/enmmoe_avatar_1_1795107200008.jpg';
import avatar2 from '../assets/images/enmmoe_avatar_2_1795107202541.jpg';
import avatar3 from '../assets/images/enmmoe_avatar_3_1795107203215.jpg';
import avatar4 from '../assets/images/enmmoe_avatar_4_1795107203064.jpg';
import avatar5 from '../assets/images/enmmoe_avatar_5_1795107203265.jpg';
import avatar6 from '../assets/images/enmmoe_avatar_6_1795107204343.jpg';
import avatar7 from '../assets/images/enmmoe_avatar_7_1795107203040.jpg';

export interface EnmmoeAvatarOption {
  id: string;
  label: string;
  src: string;
}

export const ENMMOE_AVATARS: EnmmoeAvatarOption[] = [
  { id: 'enmmoe-avatar-1', label: 'Studio', src: avatar1 },
  { id: 'enmmoe-avatar-2', label: 'Coral', src: avatar2 },
  { id: 'enmmoe-avatar-3', label: 'Midnight', src: avatar3 },
  { id: 'enmmoe-avatar-4', label: 'Cozy', src: avatar4 },
  { id: 'enmmoe-avatar-5', label: 'Atelier', src: avatar5 },
  { id: 'enmmoe-avatar-6', label: 'Visor', src: avatar6 },
  { id: 'enmmoe-avatar-7', label: 'Fox', src: avatar7 },
];
