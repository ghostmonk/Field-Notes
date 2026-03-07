import React from 'react';
import { NavIcon } from '@/shared/lib/navigation';
import { HiHome, HiUser, HiFolder, HiMail, HiViewGrid } from 'react-icons/hi';

export const iconMap: Record<NavIcon, React.ComponentType<{ className?: string }>> = {
    home: HiHome,
    user: HiUser,
    folder: HiFolder,
    mail: HiMail,
    default: HiViewGrid,
};
