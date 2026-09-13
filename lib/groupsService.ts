import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { logger } from './logger';

export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName: string;
  dropzoneId: string;
  inviterCustomerId: string;
  inviterName: string;
  inviteeCustomerId: string;
}

export interface GroupMember {
  customerId: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  useNickname?: boolean;
  profileImage?: string;
  checkedIn?: boolean;
}

export interface Group {
  id: string;
  name: string;
  members: GroupMember[];
  isFavorite: boolean;
  isActive: boolean;
  createdBy: string;
  dropzoneId: string;
  createdAt: any;
  updatedAt: any;
}

export interface Customer {
  customerId: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  useNickname?: boolean;
  profileImage?: string;
  checkedIn?: boolean;
}

export async function searchCustomers(
  searchText: string,
  excludeCustomerId?: string | null,
  dropzoneId?: string | null
): Promise<Customer[]> {
  try {
    const lower = searchText.toLowerCase().trim();
    const results: Customer[] = [];

    if (dropzoneId) {
      const dzCustomersRef = collection(db, 'dropzones', dropzoneId, 'customers');
      const checkedInQuery = query(dzCustomersRef, where('checkedIn', '==', true), limit(500));
      const snapshot = await getDocs(checkedInQuery);

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (excludeCustomerId && data.customerId === excludeCustomerId) return;

        const firstName = (data.firstName || '').toLowerCase();
        const lastName = (data.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`;
        const nickname = (data.nickname || '').toLowerCase();
        const email = (data.email || '').toLowerCase();

        const matches =
          firstName.includes(lower) ||
          lastName.includes(lower) ||
          fullName.includes(lower) ||
          nickname.includes(lower) ||
          email.includes(lower);

        if (matches) {
          results.push({
            customerId: data.customerId,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            nickname: data.nickname || '',
            useNickname: data.useNickname || false,
            profileImage: data.profileImage || data.photoURL || '',
            checkedIn: true,
          });
        }
      });
    } else {
      const customersRef = collection(db, 'customers');
      const snapshot = await getDocs(query(customersRef, limit(500)));

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (excludeCustomerId && data.customerId === excludeCustomerId) return;

        const firstName = (data.firstName || '').toLowerCase();
        const lastName = (data.lastName || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`;
        const nickname = (data.nickname || '').toLowerCase();
        const email = (data.email || '').toLowerCase();

        const matches =
          firstName.includes(lower) ||
          lastName.includes(lower) ||
          fullName.includes(lower) ||
          nickname.includes(lower) ||
          email.includes(lower);

        if (matches) {
          results.push({
            customerId: data.customerId,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            nickname: data.nickname || '',
            useNickname: data.useNickname || false,
            profileImage: data.profileImage || data.photoURL || '',
          });
        }
      });
    }

    return results.slice(0, 15);
  } catch (error) {
    logger.error('Error searching customers:', error);
    return [];
  }
}

export async function getCustomerByQrCode(qrCode: string): Promise<Customer | null> {
  try {
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('qrCode', '==', qrCode), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data();
    return {
      customerId: data.customerId,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      nickname: data.nickname || '',
      useNickname: data.useNickname || false,
      profileImage: data.profileImage || data.photoURL || '',
    };
  } catch (error) {
    logger.error('Error looking up customer by QR code:', error);
    return null;
  }
}

export async function isCustomerCheckedIn(dropzoneId: string, customerId: string): Promise<boolean> {
  try {
    const dzCustomersRef = collection(db, 'dropzones', dropzoneId, 'customers');
    const q = query(
      dzCustomersRef,
      where('customerId', '==', customerId),
      where('checkedIn', '==', true),
      limit(1)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    logger.error('Error checking customer check-in status:', error);
    return false;
  }
}

export async function getDropzoneCustomers(dropzoneId: string): Promise<Customer[]> {
  try {
    const customersRef = collection(db, 'dropzones', dropzoneId, 'customers');
    const snapshot = await getDocs(customersRef);

    const customers: Customer[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      customers.push({
        customerId: data.customerId,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        nickname: data.nickname || '',
        useNickname: data.useNickname || false,
        profileImage: data.profileImage || '',
        checkedIn: data.checkedIn || false,
      });
    });

    return customers;
  } catch (error) {
    logger.error('Error fetching dropzone customers:', error);
    return [];
  }
}

export async function createGroup(
  name: string,
  members: GroupMember[],
  isFavorite: boolean,
  createdBy: string,
  dropzoneId: string
): Promise<{ success: boolean; groupId?: string; error?: string }> {
  try {
    const groupsRef = collection(db, 'dropzones', dropzoneId, 'groups');
    const docRef = await addDoc(groupsRef, {
      name,
      members,
      isFavorite,
      isActive: false,
      createdBy,
      dropzoneId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, groupId: docRef.id };
  } catch (error) {
    logger.error('Error creating group:', error);
    return { success: false, error: 'Failed to create group' };
  }
}

export async function updateGroup(
  dropzoneId: string,
  groupId: string,
  updates: Partial<Omit<Group, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const groupRef = doc(db, 'dropzones', dropzoneId, 'groups', groupId);
    await updateDoc(groupRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    logger.error('Error updating group:', error);
    return { success: false, error: 'Failed to update group' };
  }
}

export async function deleteGroup(
  dropzoneId: string,
  groupId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const groupRef = doc(db, 'dropzones', dropzoneId, 'groups', groupId);
    await deleteDoc(groupRef);
    return { success: true };
  } catch (error) {
    logger.error('Error deleting group:', error);
    return { success: false, error: 'Failed to delete group' };
  }
}

export async function leaveGroup(
  dropzoneId: string,
  groupId: string,
  customerId: string,
  currentMembers: GroupMember[],
  groupName: string,
  creatorCustomerId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const groupRef = doc(db, 'dropzones', dropzoneId, 'groups', groupId);
    const updatedMembers = currentMembers.filter((m) => m.customerId !== customerId);
    await updateDoc(groupRef, { members: updatedMembers, updatedAt: serverTimestamp() });

    const leavingMember = currentMembers.find((m) => m.customerId === customerId);
    if (leavingMember && creatorCustomerId !== customerId) {
      const { notifyMemberLeft } = await import('./notificationsService');
      const memberName = leavingMember.useNickname && leavingMember.nickname
        ? leavingMember.nickname
        : `${leavingMember.firstName} ${leavingMember.lastName}`.trim();
      await notifyMemberLeft(creatorCustomerId, memberName, groupName, dropzoneId);
    }

    return { success: true };
  } catch (error) {
    logger.error('Error leaving group:', error);
    return { success: false, error: 'Failed to leave group' };
  }
}

export async function getActiveGroupForCustomer(
  dropzoneId: string,
  customerId: string
): Promise<Group | null> {
  try {
    const groupsRef = collection(db, 'dropzones', dropzoneId, 'groups');
    const snapshot = await getDocs(query(groupsRef, where('isActive', '==', true)));

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      const members: GroupMember[] = data.members || [];
      const isMember = members.some((m) => m.customerId === customerId);
      if (isMember) {
        return {
          id: docSnap.id,
          name: data.name || '',
          members,
          isFavorite: data.isFavorite || false,
          isActive: true,
          createdBy: data.createdBy || '',
          dropzoneId: data.dropzoneId || dropzoneId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      }
    }
    return null;
  } catch (error) {
    logger.error('Error getting active group:', error);
    return null;
  }
}

export function subscribeToGroupsAsMember(
  dropzoneId: string,
  customerId: string,
  callback: (groups: Group[]) => void
): () => void {
  const groupsRef = collection(db, 'dropzones', dropzoneId, 'groups');
  const dzCustomersRef = collection(db, 'dropzones', dropzoneId, 'customers');

  let latestGroups: Group[] = [];
  let checkedInMap: Map<string, boolean> = new Map();

  const merge = () => {
    const merged = latestGroups.map((g) => ({
      ...g,
      members: g.members.map((m) => ({
        ...m,
        checkedIn: checkedInMap.has(m.customerId)
          ? checkedInMap.get(m.customerId)!
          : true,
      })),
    }));
    callback(merged);
  };

  const unsubscribeGroups = onSnapshot(groupsRef, (snapshot) => {
    const groups: Group[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const members: GroupMember[] = data.members || [];
      const isMember = members.some((m) => m.customerId === customerId);
      if (isMember) {
        groups.push({
          id: docSnap.id,
          name: data.name || '',
          members,
          isFavorite: data.isFavorite || false,
          isActive: data.isActive || false,
          createdBy: data.createdBy || '',
          dropzoneId: data.dropzoneId || dropzoneId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      }
    });
    latestGroups = groups;
    merge();
  }, (error) => {
    logger.error('Error subscribing to groups as member:', error);
    callback([]);
  });

  const unsubscribeCustomers = onSnapshot(dzCustomersRef, (snapshot) => {
    const map = new Map<string, boolean>();
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.customerId) {
        map.set(data.customerId, data.checkedIn === true);
      }
    });
    checkedInMap = map;
    merge();
  }, (error) => {
    logger.error('Error subscribing to dropzone customers for check-in status:', error);
  });

  return () => {
    unsubscribeGroups();
    unsubscribeCustomers();
  };
}

export function subscribeToGroups(
  dropzoneId: string,
  createdBy: string,
  callback: (groups: Group[]) => void
): () => void {
  const groupsRef = collection(db, 'dropzones', dropzoneId, 'groups');
  const q = query(groupsRef, where('createdBy', '==', createdBy));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const groups: Group[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      groups.push({
        id: doc.id,
        name: data.name || '',
        members: data.members || [],
        isFavorite: data.isFavorite || false,
        isActive: data.isActive || false,
        createdBy: data.createdBy || '',
        dropzoneId: data.dropzoneId || dropzoneId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    const groupRank = (g: Group) => {
      if (g.isActive && g.isFavorite) return 1;
      if (g.isActive) return 2;
      if (g.isFavorite) return 3;
      return 4;
    };

    const sorted = groups.sort((a, b) => {
      const rankDiff = groupRank(a) - groupRank(b);
      if (rankDiff !== 0) return rankDiff;
      const aTime = a.createdAt?.toMillis?.() ?? 0;
      const bTime = b.createdAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });

    callback(sorted);
  }, (error) => {
    logger.error('Error subscribing to groups:', error);
    callback([]);
  });

  return unsubscribe;
}

export async function sendGroupInvitation(
  groupId: string,
  groupName: string,
  dropzoneId: string,
  inviterCustomerId: string,
  inviterName: string,
  inviteeCustomerId: string
): Promise<{ success: boolean; invitation?: GroupInvitation; error?: string }> {
  try {
    const invitation: GroupInvitation = {
      id: `${groupId}_${inviteeCustomerId}`,
      groupId,
      groupName,
      dropzoneId,
      inviterCustomerId,
      inviterName,
      inviteeCustomerId,
    };
    return { success: true, invitation };
  } catch (error) {
    logger.error('Error sending group invitation:', error);
    return { success: false, error: 'Failed to send invitation' };
  }
}

export async function acceptGroupInvitation(
  invitation: GroupInvitation,
  inviteeAsMember: GroupMember
): Promise<{ success: boolean; error?: string }> {
  try {
    const groupRef = doc(db, 'dropzones', invitation.dropzoneId, 'groups', invitation.groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) return { success: false, error: 'Group not found' };

    const currentMembers: GroupMember[] = groupSnap.data().members || [];
    const alreadyMember = currentMembers.some((m) => m.customerId === inviteeAsMember.customerId);

    if (!alreadyMember) {
      await updateDoc(groupRef, {
        members: [...currentMembers, inviteeAsMember],
        updatedAt: serverTimestamp(),
      });
    }

    const joinerName = inviteeAsMember.useNickname && inviteeAsMember.nickname
      ? inviteeAsMember.nickname
      : `${inviteeAsMember.firstName} ${inviteeAsMember.lastName}`.trim();
    const { notifyMemberJoined } = await import('./notificationsService');
    await notifyMemberJoined(invitation.inviterCustomerId, joinerName, invitation.groupName, invitation.dropzoneId);

    return { success: true };
  } catch (error) {
    logger.error('Error accepting group invitation:', error);
    return { success: false, error: 'Failed to accept invitation' };
  }
}

export async function declineGroupInvitation(
  invitation: GroupInvitation,
  declinerName: string
): Promise<{ success: boolean; creatorCustomerId?: string; groupName?: string; error?: string }> {
  try {
    return {
      success: true,
      creatorCustomerId: invitation.inviterCustomerId,
      groupName: invitation.groupName,
    };
  } catch (error) {
    logger.error('Error declining group invitation:', error);
    return { success: false, error: 'Failed to decline invitation' };
  }
}
