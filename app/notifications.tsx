import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Bell,
  ShoppingBag,
  Users,
  CalendarDays,
  Wrench,
  Tent,
  CreditCard,
  BookOpen,
  Store,
  Megaphone,
  Clock,
  CloudRain,
  Info,
  PlaneTakeoff,
  UserCheck,
  UserX,
  PenLine,
  Check,
  X,
} from 'lucide-react-native';
import { useNotifications } from '@/contexts/NotificationsContext';
import type { NotificationCategory } from '@/types/client';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { acceptGroupInvitation, declineGroupInvitation, type GroupMember } from '@/lib/groupsService';
import { notifyInvitationDeclined } from '@/lib/notificationsService';
import { getCustomerData } from '@/lib/customerCache';
import { logger } from '@/lib/logger';

interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'error';
  category?: NotificationCategory;
  isUnread: boolean;
  createdAt: any;
  actionType?: 'group_invite' | 'group_invite_accepted' | 'group_invite_declined' | 'signature_request' | 'signature_signed' | 'signature_declined';
  // group invite fields
  invitationGroupId?: string;
  invitationGroupName?: string;
  invitationDropzoneId?: string;
  inviterCustomerId?: string;
  inviterName?: string;
  // signature request fields
  signerCustomerId?: string;
  requesterCustomerId?: string;
  requesterCustomerDocId?: string;
  requesterName?: string;
  logbookEntryId?: string;
  jumpDate?: string;
  dropzoneName?: string;
  discipline?: string;
  freefallTime?: number | string | null;
  aircraft?: string;
}

const CATEGORY_CONFIG: Record<NotificationCategory, { bg: string; color: string }> = {
  shop:              { bg: '#FFF3E0', color: '#F57C00' },
  groups:            { bg: '#E8F5E9', color: '#388E3C' },
  bookings:          { bg: '#E3F2FD', color: '#1976D2' },
  equipment:         { bg: '#F3E5F5', color: '#7B1FA2' },
  camps:             { bg: '#E8F5E9', color: '#2E7D32' },
  transactions:      { bg: '#FFF8E1', color: '#F9A825' },
  logbook:           { bg: '#E0F2F1', color: '#00796B' },
  marketplace:       { bg: '#FCE4EC', color: '#C2185B' },
  announcements:     { bg: '#E8EAF6', color: '#3949AB' },
  loads:             { bg: '#E8F5E9', color: '#2E7D32' },
  standby:           { bg: '#FFF3E0', color: '#E65100' },
  weather:           { bg: '#E1F5FE', color: '#0277BD' },
  general:           { bg: '#E3F2FD', color: '#1976D2' },
  signature_request: { bg: '#EFF6FF', color: '#2D3E50' },
};

function getCategoryFromTitle(title: string): NotificationCategory {
  const lower = title.toLowerCase();
  if (lower.includes('signature')) return 'signature_request';
  if (lower.includes('shop') || lower.includes('purchase')) return 'shop';
  if (lower.includes('group') || lower.includes('member')) return 'groups';
  if (lower.includes('booking')) return 'bookings';
  if (lower.includes('equipment') || lower.includes('gear')) return 'equipment';
  if (lower.includes('camp')) return 'camps';
  if (lower.includes('transaction') || lower.includes('payment') || lower.includes('balance')) return 'transactions';
  if (lower.includes('logbook') || lower.includes('jump') || lower.includes('log')) return 'logbook';
  if (lower.includes('marketplace')) return 'marketplace';
  if (lower.includes('announcement')) return 'announcements';
  if (lower.includes('load') || lower.includes('manifested')) return 'loads';
  if (lower.includes('standby')) return 'standby';
  if (lower.includes('weather')) return 'weather';
  return 'general';
}

function getCategoryIcon(category: NotificationCategory, color: string) {
  const size = 24;
  switch (category) {
    case 'shop':              return <ShoppingBag size={size} color={color} />;
    case 'groups':            return <Users size={size} color={color} />;
    case 'bookings':          return <CalendarDays size={size} color={color} />;
    case 'equipment':         return <Wrench size={size} color={color} />;
    case 'camps':             return <Tent size={size} color={color} />;
    case 'transactions':      return <CreditCard size={size} color={color} />;
    case 'logbook':           return <BookOpen size={size} color={color} />;
    case 'marketplace':       return <Store size={size} color={color} />;
    case 'announcements':     return <Megaphone size={size} color={color} />;
    case 'loads':             return <PlaneTakeoff size={size} color={color} />;
    case 'standby':           return <Clock size={size} color={color} />;
    case 'weather':           return <CloudRain size={size} color={color} />;
    case 'signature_request': return <PenLine size={size} color={color} />;
    default:                  return <Info size={size} color={color} />;
  }
}

function JumpDetailPill({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.jumpPill}>
      <Text style={styles.jumpPillLabel}>{label}</Text>
      <Text style={styles.jumpPillValue}>{String(value)}</Text>
    </View>
  );
}

function NotificationCard({
  item,
  onMarkRead,
  onJoinInvite,
  onDeclineInvite,
  onSignRequest,
  onDeclineRequest,
}: {
  item: Notification;
  onMarkRead: (id: string) => void;
  onJoinInvite: (notificationId: string, notification: Notification) => Promise<void>;
  onDeclineInvite: (notificationId: string, notification: Notification) => Promise<void>;
  onSignRequest: (notificationId: string, notification: Notification) => Promise<void>;
  onDeclineRequest: (notificationId: string, notification: Notification) => Promise<void>;
}) {
  const [actionLoading, setActionLoading] = useState<'join' | 'decline' | 'sign' | 'decline_sig' | null>(null);
  const [actionDone, setActionDone] = useState<'joined' | 'declined' | 'signed' | 'declined_sig' | null>(null);

  const resolvedCategory: NotificationCategory =
    (item.category && CATEGORY_CONFIG[item.category])
      ? item.category
      : getCategoryFromTitle(item.title);
  const config = CATEGORY_CONFIG[resolvedCategory] ?? CATEGORY_CONFIG['general'];

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const isGroupInvite = item.actionType === 'group_invite' && item.invitationGroupId;
  const isSigRequest = item.actionType === 'signature_request' && item.logbookEntryId;

  const isAlreadyActioned =
    item.actionType === 'group_invite_accepted' ||
    item.actionType === 'group_invite_declined' ||
    item.actionType === 'signature_signed' ||
    item.actionType === 'signature_declined';

  const handleJoin = async () => {
    if (actionLoading || actionDone) return;
    setActionLoading('join');
    await onJoinInvite(item.id, item);
    setActionDone('joined');
    setActionLoading(null);
  };

  const handleDeclineInvite = async () => {
    if (actionLoading || actionDone) return;
    setActionLoading('decline');
    await onDeclineInvite(item.id, item);
    setActionDone('declined');
    setActionLoading(null);
  };

  const handleSign = async () => {
    if (actionLoading || actionDone) return;
    setActionLoading('sign');
    await onSignRequest(item.id, item);
    setActionDone('signed');
    setActionLoading(null);
  };

  const handleDeclineSig = async () => {
    if (actionLoading || actionDone) return;
    setActionLoading('decline_sig');
    await onDeclineRequest(item.id, item);
    setActionDone('declined_sig');
    setActionLoading(null);
  };

  const borderColor = isSigRequest
    ? '#2D3E50'
    : isGroupInvite
    ? '#388E3C'
    : undefined;

  return (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        item.isUnread && styles.unreadCard,
        borderColor && { borderWidth: 2, borderColor },
      ]}
      onPress={() => onMarkRead(item.id)}
      activeOpacity={0.85}
    >
      <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
        {getCategoryIcon(resolvedCategory, config.color)}
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          {item.isUnread && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationDescription}>{item.description}</Text>

        {/* Jump detail pills for signature requests */}
        {isSigRequest && (item.discipline || item.aircraft || item.freefallTime != null) && (
          <View style={styles.jumpPills}>
            <JumpDetailPill label="Discipline" value={item.discipline} />
            <JumpDetailPill label="Aircraft" value={item.aircraft} />
            <JumpDetailPill label="Freefall" value={item.freefallTime != null ? `${item.freefallTime}s` : null} />
          </View>
        )}

        <Text style={styles.notificationTime}>{formatDate(item.createdAt)}</Text>

        {/* Group invite actions */}
        {isGroupInvite && !actionDone && !isAlreadyActioned && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btnPrimary, actionLoading === 'join' && styles.btnLoading]}
              onPress={handleJoin}
              disabled={!!actionLoading}
            >
              {actionLoading === 'join'
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <><UserCheck size={14} color="#FFFFFF" strokeWidth={2.5} /><Text style={styles.btnPrimaryText}>Join</Text></>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSecondary, actionLoading === 'decline' && styles.btnLoading]}
              onPress={handleDeclineInvite}
              disabled={!!actionLoading}
            >
              {actionLoading === 'decline'
                ? <ActivityIndicator size="small" color="#DC2626" />
                : <><UserX size={14} color="#DC2626" strokeWidth={2.5} /><Text style={styles.btnSecondaryText}>Decline</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* Signature request actions */}
        {isSigRequest && !actionDone && !isAlreadyActioned && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btnSign, actionLoading === 'sign' && styles.btnLoading]}
              onPress={handleSign}
              disabled={!!actionLoading}
            >
              {actionLoading === 'sign'
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <><Check size={14} color="#FFFFFF" strokeWidth={2.5} /><Text style={styles.btnSignText}>Sign</Text></>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnSecondary, actionLoading === 'decline_sig' && styles.btnLoading]}
              onPress={handleDeclineSig}
              disabled={!!actionLoading}
            >
              {actionLoading === 'decline_sig'
                ? <ActivityIndicator size="small" color="#DC2626" />
                : <><X size={14} color="#DC2626" strokeWidth={2.5} /><Text style={styles.btnSecondaryText}>Decline</Text></>}
            </TouchableOpacity>
          </View>
        )}

        {/* Result states */}
        {(actionDone === 'joined' || item.actionType === 'group_invite_accepted') && (
          <View style={styles.resultRow}>
            <UserCheck size={14} color="#16A34A" />
            <Text style={styles.resultTextSuccess}>You joined the group</Text>
          </View>
        )}
        {(actionDone === 'declined' || item.actionType === 'group_invite_declined') && (
          <View style={styles.resultRow}>
            <UserX size={14} color="#94A3B8" />
            <Text style={styles.resultTextNeutral}>Invitation declined</Text>
          </View>
        )}
        {(actionDone === 'signed' || item.actionType === 'signature_signed') && (
          <View style={styles.resultRow}>
            <Check size={14} color="#16A34A" />
            <Text style={styles.resultTextSuccess}>Jump signed</Text>
          </View>
        )}
        {(actionDone === 'declined_sig' || item.actionType === 'signature_declined') && (
          <View style={styles.resultRow}>
            <X size={14} color="#94A3B8" />
            <Text style={styles.resultTextNeutral}>Signature declined</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const { notifications, loading, notificationPath } = useNotifications();
  const { user } = useAuth();

  const getNotifDoc = useCallback((notificationId: string) => {
    if (!notificationPath) return null;
    return doc(db, 'customers', notificationPath.customerDocId, 'notifications', notificationId);
  }, [notificationPath]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const ref = getNotifDoc(notificationId);
    if (!ref) return;
    try { await updateDoc(ref, { isUnread: false }); } catch {}
  }, [getNotifDoc]);

  const handleJoinInvite = useCallback(async (notificationId: string, notification: Notification) => {
    if (!user) return;
    try {
      const customerResult = await getCustomerData(user.uid);
      if (!customerResult) return;
      const d = customerResult.data;
      const member: GroupMember = {
        customerId: d.customerId,
        firstName: d.firstName || '',
        lastName: d.lastName || '',
        nickname: d.nickname || '',
        useNickname: d.useNickname || false,
        profileImage: d.profileImage || d.photoURL || '',
      };
      const invitation = {
        id: `${notification.invitationGroupId}_${d.customerId}`,
        groupId: notification.invitationGroupId!,
        groupName: notification.invitationGroupName!,
        dropzoneId: notification.invitationDropzoneId!,
        inviterCustomerId: notification.inviterCustomerId!,
        inviterName: notification.inviterName!,
        inviteeCustomerId: d.customerId,
      };
      await acceptGroupInvitation(invitation, member);
      const ref = getNotifDoc(notificationId);
      if (ref) await updateDoc(ref, { isUnread: false, actionType: 'group_invite_accepted' });
    } catch (e) { logger.error('Error accepting invitation:', e); }
  }, [user, getNotifDoc]);

  const handleDeclineInvite = useCallback(async (notificationId: string, notification: Notification) => {
    if (!user) return;
    try {
      const customerResult = await getCustomerData(user.uid);
      const d = customerResult?.data;
      const declinerName = (d?.useNickname && d?.nickname)
        ? d.nickname
        : `${d?.firstName || ''} ${d?.lastName || ''}`.trim() || 'Someone';
      const invitation = {
        id: `${notification.invitationGroupId}_${d?.customerId}`,
        groupId: notification.invitationGroupId!,
        groupName: notification.invitationGroupName!,
        dropzoneId: notification.invitationDropzoneId!,
        inviterCustomerId: notification.inviterCustomerId!,
        inviterName: notification.inviterName!,
        inviteeCustomerId: d?.customerId || '',
      };
      const result = await declineGroupInvitation(invitation, declinerName);
      if (result.success && result.creatorCustomerId && result.groupName) {
        notifyInvitationDeclined(result.creatorCustomerId, declinerName, result.groupName, invitation.dropzoneId)
          .catch((e) => logger.error('Notify decline error:', e));
      }
      const ref = getNotifDoc(notificationId);
      if (ref) await updateDoc(ref, { isUnread: false, actionType: 'group_invite_declined' });
    } catch (e) { logger.error('Error declining invitation:', e); }
  }, [user, getNotifDoc]);

  // Sign a jump: write signature to the requester's logbook entry
  const handleSignRequest = useCallback(async (notificationId: string, notification: Notification) => {
    if (!user || !notification.logbookEntryId || !notification.requesterCustomerDocId) return;
    try {
      const customerResult = await getCustomerData(user.uid);
      const d = customerResult?.data;
      const signerName = (d?.useNickname && d?.nickname)
        ? d.nickname
        : `${d?.firstName || ''} ${d?.lastName || ''}`.trim() || 'Unknown';
      const signerLicense = d?.license || '';

      // Update the logbook entry with signature info
      const entryRef = doc(
        db,
        'customers',
        notification.requesterCustomerDocId,
        'logbook',
        notification.logbookEntryId
      );
      await updateDoc(entryRef, {
        status: 'signed',
        signedBy: signerName,
        signedByLicense: signerLicense,
        signedByCustomerId: d?.customerId || '',
        signedAt: new Date().toISOString(),
      });

      // Mark notification as actioned
      const ref = getNotifDoc(notificationId);
      if (ref) await updateDoc(ref, { isUnread: false, actionType: 'signature_signed' });

      // Send a confirmation notification back to the requester
      if (notification.requesterCustomerDocId) {
        const { addDoc, collection: col, serverTimestamp } = await import('firebase/firestore');
        await addDoc(col(db, 'customers', notification.requesterCustomerDocId, 'notifications'), {
          userId: '',
          customerId: notification.requesterCustomerId || '',
          title: 'Jump Signed',
          description: `${signerName}${signerLicense ? ` (${signerLicense})` : ''} signed your jump on ${notification.jumpDate} at ${notification.dropzoneName}`,
          type: 'success',
          category: 'logbook',
          isUnread: true,
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) { logger.error('Error signing request:', e); }
  }, [user, getNotifDoc]);

  const handleDeclineSignRequest = useCallback(async (notificationId: string, notification: Notification) => {
    if (!user) return;
    try {
      const customerResult = await getCustomerData(user.uid);
      const d = customerResult?.data;
      const signerName = (d?.useNickname && d?.nickname)
        ? d.nickname
        : `${d?.firstName || ''} ${d?.lastName || ''}`.trim() || 'Someone';

      // Update logbook entry back to draft
      if (notification.requesterCustomerDocId && notification.logbookEntryId) {
        const entryRef = doc(
          db,
          'customers',
          notification.requesterCustomerDocId,
          'logbook',
          notification.logbookEntryId
        );
        await updateDoc(entryRef, { status: 'draft' });
      }

      const ref = getNotifDoc(notificationId);
      if (ref) await updateDoc(ref, { isUnread: false, actionType: 'signature_declined' });

      // Notify the requester
      if (notification.requesterCustomerDocId) {
        const { addDoc, collection: col, serverTimestamp } = await import('firebase/firestore');
        await addDoc(col(db, 'customers', notification.requesterCustomerDocId, 'notifications'), {
          userId: '',
          customerId: notification.requesterCustomerId || '',
          title: 'Signature Declined',
          description: `${signerName} declined to sign your jump on ${notification.jumpDate} at ${notification.dropzoneName}`,
          type: 'warning',
          category: 'logbook',
          isUnread: true,
          createdAt: serverTimestamp(),
        });
      }
    } catch (e) { logger.error('Error declining signature:', e); }
  }, [user, getNotifDoc]);

  const clearAll = useCallback(async () => {
    if (!user || notifications.length === 0 || !notificationPath) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        const ref = doc(db, 'customers', notificationPath.customerDocId, 'notifications', n.id);
        batch.delete(ref);
      });
      await batch.commit();
    } catch {}
  }, [user, notifications, notificationPath]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Notifications" showBack={true} showNotifications={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D3E50" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  const clearAllButton = notifications.length > 0 ? (
    <TouchableOpacity onPress={clearAll} style={styles.clearAllButton}>
      <Text style={styles.clearAllText}>Clear All</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={styles.container}>
      <Header title="Notifications" showBack={true} showNotifications={false} rightAction={clearAllButton} />
      <View style={styles.content}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Bell size={64} color="#CCC" />
            </View>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyDescription}>
              You're all caught up! Notifications will appear here when you have updates.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={({ item }) => (
              <NotificationCard
                item={item as Notification}
                onMarkRead={markAsRead}
                onJoinInvite={handleJoinInvite}
                onDeclineInvite={handleDeclineInvite}
                onSignRequest={handleSignRequest}
                onDeclineRequest={handleDeclineSignRequest}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D4E8F0' },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  clearAllButton: { paddingHorizontal: 12, paddingVertical: 6 },
  clearAllText: { fontSize: 15, color: '#FF3B30', fontWeight: '600' },
  listContainer: { paddingTop: 12, paddingBottom: 32, paddingHorizontal: 20 },

  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  unreadCard: { borderWidth: 2, borderColor: '#2196F3' },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  notificationContent: { flex: 1 },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  notificationTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2196F3', marginLeft: 8 },
  notificationDescription: { fontSize: 14, color: '#555', lineHeight: 20, marginBottom: 8 },
  notificationTime: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginBottom: 2 },

  jumpPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  jumpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  jumpPillLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  jumpPillValue: { fontSize: 11, color: '#1A1A1A', fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#16A34A', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16, flex: 1, justifyContent: 'center',
  },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  btnSign: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#2D3E50', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16, flex: 1, justifyContent: 'center',
  },
  btnSignText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FEF2F2', borderRadius: 8,
    paddingVertical: 8, paddingHorizontal: 16, flex: 1, justifyContent: 'center',
    borderWidth: 1, borderColor: '#FECACA',
  },
  btnSecondaryText: { color: '#DC2626', fontSize: 14, fontWeight: '700' },
  btnLoading: { opacity: 0.6 },

  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  resultTextSuccess: { fontSize: 13, color: '#16A34A', fontWeight: '600' },
  resultTextNeutral: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconContainer: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 28, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  emptyTitle: { fontSize: 26, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },
  emptyDescription: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, maxWidth: 300 },
});
