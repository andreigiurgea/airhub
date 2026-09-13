import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { collection, onSnapshot, query, getDocs, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { QUERY_LIMITS } from '@/lib/constants';
import type { NotificationCategory } from '@/types/client';

export type { NotificationCategory };

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category?: NotificationCategory;
  isUnread: boolean;
  createdAt: any;
  actionType?: 'group_invite' | 'group_invite_accepted' | 'group_invite_declined';
  invitationGroupId?: string;
  invitationGroupName?: string;
  invitationDropzoneId?: string;
  inviterCustomerId?: string;
  inviterName?: string;
}

export interface NotificationPath {
  customerDocId: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  notificationPath: NotificationPath | null;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  loading: true,
  notificationPath: null,
});

export const useNotifications = () => useContext(NotificationsContext);

function subscribeToNotifications(
  customerDocId: string,
  onData: (notifications: Notification[]) => void
): () => void {
  const notificationsRef = collection(db, 'customers', customerDocId, 'notifications');
  const notificationsQuery = query(notificationsRef, limit(QUERY_LIMITS.NOTIFICATIONS));

  return onSnapshot(notificationsQuery, (snapshot) => {
    const fetched: Notification[] = [];
    snapshot.forEach((d) => {
      fetched.push({ id: d.id, ...d.data() } as Notification);
    });
    fetched.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    onData(fetched);
  });
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationPath, setNotificationPath] = useState<NotificationPath | null>(null);

  const notifUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!user) {
      if (notifUnsubRef.current) {
        notifUnsubRef.current();
        notifUnsubRef.current = null;
      }
      setNotifications([]);
      setNotificationPath(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const setup = async () => {
      try {
        const customersRef = collection(db, 'customers');
        const q = query(customersRef, where('accountId', '==', user.uid), limit(1));
        const snap = await getDocs(q);
        if (cancelled || snap.empty) {
          if (!cancelled) setLoading(false);
          return;
        }

        const customerDocId = snap.docs[0].id;
        const path: NotificationPath = { customerDocId };

        if (cancelled) return;

        setNotificationPath(path);

        if (notifUnsubRef.current) {
          notifUnsubRef.current();
        }

        notifUnsubRef.current = subscribeToNotifications(customerDocId, (data) => {
          if (!cancelled) {
            setNotifications(data);
            setLoading(false);
          }
        });
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setLoading(false);
        }
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (notifUnsubRef.current) {
        notifUnsubRef.current();
        notifUnsubRef.current = null;
      }
    };
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.isUnread).length,
    [notifications]
  );

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, loading, notificationPath }}>
      {children}
    </NotificationsContext.Provider>
  );
}
