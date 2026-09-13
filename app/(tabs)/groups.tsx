import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, Star, Users, Search, X, UserPlus, Power, QrCode } from 'lucide-react-native';
import { CameraView, Camera } from 'expo-camera';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentCheckIn } from '@/lib/dropzoneService';
import {
  subscribeToGroupsAsMember,
  deleteGroup,
  updateGroup,
  leaveGroup,
  searchCustomers,
  getCustomerByQrCode,
  sendGroupInvitation,
  type Group,
  type GroupMember,
  type Customer,
} from '@/lib/groupsService';
import {
  notifyMemberRemoved,
  notifyGroupRenamed,
  notifyGroupInvitation,
} from '@/lib/notificationsService';
import { getCustomerData } from '@/lib/customerCache';
import Header from '@/components/Header';
import { logger } from '@/lib/logger';

function getDisplayName(m: GroupMember | Customer) {
  if (m.useNickname && m.nickname) return m.nickname;
  return `${m.firstName} ${m.lastName}`.trim() || 'Unknown';
}

function getInitials(m: GroupMember | Customer) {
  if (m.useNickname && m.nickname) return m.nickname.slice(0, 2).toUpperCase();
  const first = m.firstName?.[0] || '';
  const last = m.lastName?.[0] || '';
  return `${first}${last}`.toUpperCase() || '??';
}

interface GroupCardProps {
  group: Group;
  currentCustomerId: string | null;
  actorName: string;
  dropzoneId: string;
  onToggleFavorite: (group: Group) => void;
  onToggleActive: (group: Group) => void;
  onDelete: (groupId: string) => void;
  onLeave: (group: Group) => void;
}

function GroupCard({ group, currentCustomerId, actorName, dropzoneId, onToggleFavorite, onToggleActive, onDelete, onLeave }: GroupCardProps) {
  const isCreator = group.createdBy === currentCustomerId;
  const [expanded, setExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState(group.name);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingMembers, setPendingMembers] = useState<GroupMember[]>([]);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [showScanner, setShowScanner] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [scanProcessing, setScanProcessing] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Map<string, Customer>>(new Map());
  const [postDoneFeedback, setPostDoneFeedback] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const postDoneTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentMember = group.members.find((m) => m.customerId === currentCustomerId);
  const otherMembers = group.members.filter((m) => m.customerId !== currentCustomerId);
  const baseOrdered = currentMember ? [currentMember, ...otherMembers] : otherMembers;
  const displayMembers = editMode
    ? (() => {
        const seen = new Set<string>();
        const merged = [
          ...baseOrdered.filter((m) => !removedIds.has(m.customerId)),
          ...pendingMembers,
        ];
        return merged.filter((m) => {
          if (seen.has(m.customerId)) return false;
          seen.add(m.customerId);
          return true;
        });
      })()
    : baseOrdered;

  const runSearch = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const existingIds = new Set([
        ...group.members.map((m) => m.customerId),
        ...pendingMembers.map((m) => m.customerId),
        ...pendingInvites.keys(),
      ]);
      const results = await searchCustomers(trimmed, null);
      setSearchResults(results.filter((r) => !existingIds.has(r.customerId) && !removedIds.has(r.customerId)));
    } catch (err) {
      logger.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  }, [group.members, pendingMembers, removedIds, pendingInvites]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => runSearch(text), 350);
  };

  const queueInvite = useCallback((customer: Customer) => {
    setPendingInvites((prev) => new Map([...prev, [customer.customerId, customer]]));
    setPendingMembers((prev) => {
      if (prev.some((m) => m.customerId === customer.customerId)) return prev;
      return [...prev, {
        customerId: customer.customerId,
        firstName: customer.firstName,
        lastName: customer.lastName,
        nickname: customer.nickname,
        useNickname: customer.useNickname,
      }];
    });
  }, []);

  const handleAddMember = (customer: Customer) => {
    setSearchQuery('');
    setSearchResults([]);
    queueInvite(customer);
  };

  const handleRemoveMember = (customerId: string) => {
    if (customerId === currentCustomerId) return;
    if (pendingMembers.some((m) => m.customerId === customerId)) {
      setPendingMembers((prev) => prev.filter((m) => m.customerId !== customerId));
    } else {
      setRemovedIds((prev) => new Set([...prev, customerId]));
    }
    setPendingInvites((prev) => {
      const next = new Map(prev);
      next.delete(customerId);
      return next;
    });
  };

  const handleOpenScanner = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setScanFeedback('Camera permission denied.');
      return;
    }
    setScanFeedback(null);
    setShowScanner(true);
  };

  const handleQrScanned = useCallback(async ({ data }: { data: string }) => {
    if (scanProcessing) return;
    setScanProcessing(true);
    try {
      const customer = await getCustomerByQrCode(data);
      if (!customer) {
        setScanFeedback('No customer found for this QR code.');
        return;
      }
      if (customer.customerId === currentCustomerId) {
        setScanFeedback('You cannot add yourself.');
        return;
      }
      if (group.members.some((m) => m.customerId === customer.customerId)) {
        setScanFeedback(`${getDisplayName(customer)} is already in the group.`);
        setShowScanner(false);
        return;
      }
      if (pendingInvites.has(customer.customerId)) {
        setScanFeedback(`${getDisplayName(customer)} is already added.`);
        setShowScanner(false);
        return;
      }
      queueInvite(customer);
      setShowScanner(false);
    } catch (e) {
      logger.error('QR scan error:', e);
      setScanFeedback('Error reading QR code.');
    } finally {
      setScanProcessing(false);
    }
  }, [scanProcessing, currentCustomerId, group.members, pendingInvites, queueInvite]);

  const toggleExpand = () => {
    setExpanded((v) => !v);
    if (expanded) {
      setEditMode(false);
      setSearchQuery('');
      setSearchResults([]);
      setPendingMembers([]);
      setRemovedIds(new Set());
      setPendingInvites(new Map());
      setScanFeedback(null);
    }
  };

  const handleDone = async () => {
    const nameChanged = editedName.trim() && editedName.trim() !== group.name;
    const membersChanged = removedIds.size > 0;
    const hasQueuedInvites = pendingInvites.size > 0;

    if (nameChanged || membersChanged || hasQueuedInvites) {
      setSaving(true);
      const updatedMembers = group.members.filter((m) => !removedIds.has(m.customerId));
      const updates: Record<string, any> = { members: updatedMembers };
      if (nameChanged) updates.name = editedName.trim();

      if (nameChanged || membersChanged) {
        await updateGroup(dropzoneId, group.id, updates);
      }

      if (removedIds.size > 0) {
        for (const removedId of removedIds) {
          notifyMemberRemoved(removedId, nameChanged ? editedName.trim() : group.name, dropzoneId)
            .catch((e) => logger.error('Notify removed error:', e));
        }
      }

      if (nameChanged) {
        const allMemberIds = updatedMembers.map((m) => m.customerId);
        notifyGroupRenamed(allMemberIds, group.name, editedName.trim(), dropzoneId)
          .catch((e) => logger.error('Notify renamed error:', e));
      }

      const invitedNames: string[] = [];
      for (const customer of pendingInvites.values()) {
        const inv = await sendGroupInvitation(
          group.id,
          nameChanged ? editedName.trim() : group.name,
          dropzoneId,
          currentCustomerId || '',
          actorName,
          customer.customerId
        );
        if (inv.success && inv.invitation) {
          invitedNames.push(getDisplayName(customer));
          notifyGroupInvitation(inv.invitation, dropzoneId)
            .catch((e) => logger.error('Notify invite error:', e));
        }
      }

      if (invitedNames.length > 0) {
        const msg = invitedNames.length === 1
          ? `Invite sent to ${invitedNames[0]}`
          : `Invites sent to ${invitedNames.join(', ')}`;
        if (postDoneTimer.current) clearTimeout(postDoneTimer.current);
        setPostDoneFeedback(msg);
        postDoneTimer.current = setTimeout(() => setPostDoneFeedback(null), 3000);
      }

      setSaving(false);
    }
    setEditMode(false);
    setSearchQuery('');
    setSearchResults([]);
    setPendingMembers([]);
    setRemovedIds(new Set());
    setPendingInvites(new Map());
    setScanFeedback(null);
  };

  const toggleEditMode = () => {
    if (editMode) {
      handleDone();
    } else {
      setEditMode(true);
      setEditedName(group.name);
      setSearchQuery('');
      setSearchResults([]);
      setPendingMembers([]);
      setRemovedIds(new Set());
      setPendingInvites(new Map());
      setScanFeedback(null);
    }
  };

  return (
    <View style={[styles.groupCard, group.isActive && styles.groupCardActive]}>
      <TouchableOpacity
        style={styles.groupHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={[styles.groupIconContainer, group.isActive && styles.groupIconContainerActive]}>
          <Users size={22} color={group.isActive ? '#16A34A' : '#6B7280'} />
        </View>

        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          <Text style={styles.memberCount}>
            {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
          </Text>
        </View>

        <View style={styles.groupActions}>
          {isCreator && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => { e.stopPropagation?.(); onToggleFavorite(group); }}
            >
              <Star
                size={20}
                color={group.isFavorite ? '#9B7EDE' : '#CBD5E1'}
                fill={group.isFavorite ? '#9B7EDE' : 'transparent'}
              />
            </TouchableOpacity>
          )}

          {isCreator && (
            <TouchableOpacity
              style={[styles.powerButton, group.isActive && styles.powerButtonActive]}
              onPress={(e) => { e.stopPropagation?.(); onToggleActive(group); }}
            >
              <Power size={18} color={group.isActive ? '#16A34A' : '#94A3B8'} />
            </TouchableOpacity>
          )}

          {!isCreator && group.isActive && (
            <View style={[styles.powerButton, styles.powerButtonActive]}>
              <Power size={18} color="#16A34A" />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Modal visible={showScanner} animationType="slide" statusBarTranslucent>
        <View style={styles.scannerContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanProcessing ? undefined : handleQrScanned}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Scan Member QR Code</Text>
              <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.scannerCloseButton}>
                <X size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerHint}>Point the camera at a member's QR code</Text>
            {scanProcessing && <ActivityIndicator size="large" color="#FFFFFF" style={{ marginTop: 16 }} />}
          </View>
        </View>
      </Modal>

      {expanded && (
        <View style={styles.expandedSection}>
          <View style={styles.expandedDivider} />

          {editMode && (
            <TextInput
              style={styles.editNameInput}
              value={editedName}
              onChangeText={setEditedName}
              placeholder="Group name"
              placeholderTextColor="#B0B0B0"
              returnKeyType="done"
            />
          )}

          {displayMembers.map((member) => {
            const isOwner = member.customerId === currentCustomerId;
            const isCheckedOut = member.checkedIn === false;
            return (
              <View key={member.customerId} style={[styles.memberRow, isCheckedOut && styles.memberRowCheckedOut]}>
                <View style={[styles.avatarCircle, isOwner && styles.avatarOwner, isCheckedOut && styles.avatarCheckedOut]}>
                  <Text style={[styles.avatarText, isOwner && styles.avatarTextOwner, isCheckedOut && styles.avatarTextCheckedOut]}>
                    {getInitials(member)}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, isCheckedOut && styles.memberNameCheckedOut]}>
                    {getDisplayName(member)}
                  </Text>
                  {isOwner && !isCheckedOut && (
                    <Text style={styles.ownerBadge}>You</Text>
                  )}
                  {isCheckedOut && (
                    <Text style={styles.checkedOutBadge}>Checked out</Text>
                  )}
                </View>
                {editMode && !isOwner && (
                  <TouchableOpacity
                    style={styles.removeMemberBtn}
                    onPress={() => handleRemoveMember(member.customerId)}
                    disabled={saving}
                  >
                    <X size={16} color="#FF5A5F" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {editMode && (
            <View style={styles.searchSection}>
              <View style={styles.searchBox}>
                <Search size={16} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search to add member..."
                  placeholderTextColor="#B0B0B0"
                  value={searchQuery}
                  onChangeText={handleSearchChange}
                  returnKeyType="search"
                />
                {searching && <ActivityIndicator size="small" color="#3B82F6" />}
                <View style={styles.searchDivider} />
                <TouchableOpacity onPress={handleOpenScanner} style={styles.qrButton}>
                  <QrCode size={16} color="#9B7EDE" />
                </TouchableOpacity>
              </View>

              {scanFeedback && (
                <Text style={[styles.scanFeedback, scanFeedback.includes('added!') && styles.scanFeedbackSuccess]}>
                  {scanFeedback}
                </Text>
              )}

              {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
                <Text style={styles.noResults}>No members found</Text>
              )}

              {searchResults.map((customer) => (
                <TouchableOpacity
                  key={customer.customerId}
                  style={styles.searchResultRow}
                  onPress={() => handleAddMember(customer)}
                  disabled={saving}
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{getInitials(customer)}</Text>
                  </View>
                  <Text style={styles.searchResultName}>{getDisplayName(customer)}</Text>
                  <UserPlus size={18} color="#3B82F6" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {postDoneFeedback && (
            <Text style={styles.postDoneFeedback}>{postDoneFeedback}</Text>
          )}

          <View style={styles.expandedFooter}>
            {isCreator ? (
              <>
                <TouchableOpacity
                  style={[styles.editToggleBtn, editMode && styles.editToggleBtnActive]}
                  onPress={toggleEditMode}
                >
                  <Text style={[styles.editToggleText, editMode && styles.editToggleTextActive]}>
                    {editMode ? 'Done' : 'Edit'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteGroupBtn}
                  onPress={() => onDelete(group.id)}
                >
                  <Text style={styles.deleteGroupText}>Delete</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.leaveGroupBtn}
                onPress={() => onLeave(group)}
              >
                <Text style={styles.leaveGroupText}>Leave Group</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dropzoneId, setDropzoneId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [actorName, setActorName] = useState('');
  const [notCheckedIn, setNotCheckedIn] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const dropzoneIdRef = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      let cancelled = false;

      const init = async () => {
        try {
          const [checkIn, customerResult] = await Promise.all([
            getCurrentCheckIn(user.uid),
            getCustomerData(user.uid),
          ]);

          if (cancelled) return;

          if (customerResult) {
            const d = customerResult.data;
            const resolvedCustomerId = d.customerId || customerResult.customerId || customerResult.docId;
            setCustomerId(resolvedCustomerId);
            const name = (d.useNickname && d.nickname)
              ? d.nickname
              : `${d.firstName || ''} ${d.lastName || ''}`.trim();
            setActorName(name || 'Someone');
          }

          if (checkIn?.dropzoneId) {
            const newDzId = checkIn.dropzoneId;
            if (dropzoneIdRef.current !== newDzId) {
              dropzoneIdRef.current = newDzId;
              setGroups([]);
              setNotCheckedIn(false);
              setLoading(true);
              setDropzoneId(newDzId);
            } else {
              setNotCheckedIn(false);
              setLoading(false);
            }
          } else {
            dropzoneIdRef.current = null;
            setGroups([]);
            setDropzoneId(null);
            setNotCheckedIn(true);
            setLoading(false);
          }
        } catch (error) {
          logger.error('Error initializing groups:', error);
          if (!cancelled) setLoading(false);
        }
      };

      init();

      return () => {
        cancelled = true;
      };
    }, [user])
  );

  useEffect(() => {
    if (!dropzoneId || !customerId) return;

    const rank = (g: Group) => {
      if (g.isActive && g.isFavorite) return 1;
      if (g.isActive) return 2;
      if (g.isFavorite) return 3;
      return 4;
    };

    const unsubscribe = subscribeToGroupsAsMember(dropzoneId, customerId, (all) => {
      const sorted = [...all].sort((a, b) => {
        const diff = rank(a) - rank(b);
        if (diff !== 0) return diff;
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      setGroups(sorted);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dropzoneId, customerId]);

  const handleToggleFavorite = useCallback(async (group: Group) => {
    if (!dropzoneId) return;
    await updateGroup(dropzoneId, group.id, { isFavorite: !group.isFavorite });
  }, [dropzoneId]);

  const handleToggleActive = useCallback(async (group: Group) => {
    if (!dropzoneId) return;
    const activating = !group.isActive;
    if (activating) {
      const hasActiveGroup = groups.some((g) => g.id !== group.id && g.isActive);
      if (hasActiveGroup) return;
    }
    await updateGroup(dropzoneId, group.id, { isActive: activating });
  }, [dropzoneId, groups]);

  const handleDelete = useCallback(async (groupId: string) => {
    if (!dropzoneId) return;
    await deleteGroup(dropzoneId, groupId);
  }, [dropzoneId]);

  const handleLeave = useCallback(async (group: Group) => {
    if (!dropzoneId || !customerId) return;
    await leaveGroup(dropzoneId, group.id, customerId, group.members, group.name, group.createdBy);
  }, [dropzoneId, customerId]);

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Users size={48} color="#CBD5E1" />
      </View>
      <Text style={styles.emptyTitle}>No Groups Yet</Text>
      <Text style={styles.emptySubtitle}>
        Create your first group to organize jumpers together.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Groups" showBack onBack={() => router.push('/(tabs)/more')} showNotifications={true} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : notCheckedIn ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Users size={48} color="#CBD5E1" />
          </View>
          <Text style={styles.emptyTitle}>Not Checked In</Text>
          <Text style={styles.emptySubtitle}>
            Check in to a dropzone to manage your groups.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            groups.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              currentCustomerId={customerId}
              actorName={actorName}
              dropzoneId={dropzoneId!}
              onToggleFavorite={handleToggleFavorite}
              onToggleActive={handleToggleActive}
              onDelete={handleDelete}
              onLeave={handleLeave}
            />
          )}
        />
      )}

      {!notCheckedIn && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/create-group')}
        >
          <Plus size={28} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#C8DEE6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  listContentEmpty: {
    flex: 1,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  groupCardActive: {
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  groupHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  groupIconContainerActive: {
    backgroundColor: '#DCFCE7',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  memberCount: {
    fontSize: 13,
    color: '#94A3B8',
  },
  groupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  powerButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  powerButtonActive: {
    backgroundColor: '#DCFCE7',
  },
  expandedSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  editNameInput: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  memberRowCheckedOut: {
    opacity: 0.5,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarOwner: {
    backgroundColor: '#DBEAFE',
  },
  avatarCheckedOut: {
    backgroundColor: '#F1F5F9',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  avatarTextOwner: {
    color: '#3B82F6',
  },
  avatarTextCheckedOut: {
    color: '#94A3B8',
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  memberNameCheckedOut: {
    color: '#94A3B8',
  },
  ownerBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  checkedOutBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  removeMemberBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    marginTop: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
  },
  noResults: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
    paddingVertical: 10,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchResultName: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  expandedFooter: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  editToggleBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  editToggleBtnActive: {
    backgroundColor: '#1A1A1A',
  },
  editToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editToggleTextActive: {
    color: '#FFFFFF',
  },
  deleteGroupBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#DC2626',
  },
  deleteGroupText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  leaveGroupBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  leaveGroupText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B45309',
  },
  searchDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 2,
  },
  qrButton: {
    padding: 2,
  },
  scanFeedback: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 6,
    textAlign: 'center',
  },
  scanFeedbackSuccess: {
    color: '#10B981',
  },
  postDoneFeedback: {
    fontSize: 13,
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  scannerHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scannerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scannerCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 220,
    height: 220,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  scannerHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 104,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
