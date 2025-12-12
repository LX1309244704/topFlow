import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

// 通知类型
const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// 单个通知项
const NotificationItem = ({ notification, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // 自动关闭逻辑
    if (notification.duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onClose(notification.id), 300);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.id, notification.duration, onClose]);

  const icons = {
    [NOTIFICATION_TYPES.SUCCESS]: CheckCircle,
    [NOTIFICATION_TYPES.ERROR]: XCircle,
    [NOTIFICATION_TYPES.WARNING]: AlertCircle,
    [NOTIFICATION_TYPES.INFO]: Info
  };

  const colors = {
    [NOTIFICATION_TYPES.SUCCESS]: 'bg-green-950/30 border-green-900 text-green-300',
    [NOTIFICATION_TYPES.ERROR]: 'bg-red-950/30 border-red-900 text-red-300',
    [NOTIFICATION_TYPES.WARNING]: 'bg-yellow-950/30 border-yellow-900 text-yellow-300',
    [NOTIFICATION_TYPES.INFO]: 'bg-zinc-900 border-zinc-800 text-zinc-300'
  };

  const IconComponent = icons[notification.type] || Info;

  return (
    <div 
      className={`
        flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md 
        transition-all duration-300 transform animate-in slide-in-from-right-full
        ${colors[notification.type]}
        ${isExiting ? 'opacity-0 scale-95 translate-x-full' : 'opacity-100 scale-100 translate-x-0'}
      `}
      style={{ maxWidth: '400px', minWidth: '300px' }}
    >
      <IconComponent size={20} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
        <p className="text-sm opacity-90 leading-relaxed">{notification.message}</p>
      </div>
      <button 
        onClick={() => {
          setIsExiting(true);
          setTimeout(() => onClose(notification.id), 300);
        }}
        className="flex-shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

// 通知容器
const NotificationContainer = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed top-4 right-4 z-[200] space-y-3 pointer-events-none">
      {notifications.map(notification => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem 
            notification={notification} 
            onClose={removeNotification}
          />
        </div>
      ))}
    </div>
  );
};

// 通知管理器 Hook
const useNotification = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = (Date.now() + Math.random()).toString();
    const newNotification = {
      id,
      type: notification.type || NOTIFICATION_TYPES.INFO,
      title: notification.title || '',
      message: notification.message || '',
      duration: notification.duration || 4000
    };

    setNotifications(prev => [newNotification, ...prev]);
    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const success = (message, title = '操作成功') => {
    return addNotification({ type: NOTIFICATION_TYPES.SUCCESS, title, message });
  };

  const error = (message, title = '操作失败') => {
    return addNotification({ type: NOTIFICATION_TYPES.ERROR, title, message });
  };

  const warning = (message, title = '警告') => {
    return addNotification({ type: NOTIFICATION_TYPES.WARNING, title, message });
  };

  const info = (message, title = '提示') => {
    return addNotification({ type: NOTIFICATION_TYPES.INFO, title, message });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info
  };
};

export { NotificationContainer, useNotification, NOTIFICATION_TYPES };