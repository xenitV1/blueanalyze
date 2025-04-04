import React from 'react';
import type { BlueSkyUser } from '../../services/blueskyAPI';
import { motion } from 'framer-motion';

interface UserListItemProps {
  user: BlueSkyUser;
  index: number;
}

const UserListItem: React.FC<UserListItemProps> = ({ user, index }) => {
  const avatarUrl = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.handle)}&background=random`;

  // Open user's profile in new tab
  const openProfile = () => {
    window.open(`https://bsky.app/profile/${user.handle}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      whileHover={{ scale: 1.01 }}
      className="flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
      onClick={openProfile}
    >
      <img 
        src={avatarUrl} 
        alt={user.displayName || user.handle}
        className="w-10 h-10 rounded-full object-cover"
      />
      <div className="ml-3 flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900 dark:text-white">
            {user.displayName || user.handle}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(user.indexedAt || '').toLocaleDateString()}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">@{user.handle}</p>
        {user.description && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-1">
            {user.description}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default UserListItem; 