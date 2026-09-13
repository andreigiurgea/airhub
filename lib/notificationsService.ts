import { db } from './firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { logger } from './logger';
import type { NotificationCategory } from '@/types/client';

interface CustomerInfo {
  accountId: string;
  customerId: string;
  customerDocId: string;
}

async function getCustomerInfo(customerId: string): Promise<CustomerInfo | null> {
  try {
    const customersRef = collection(db, 'customers');
    const q = query(customersRef, where('customerId', '==', customerId), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const docSnap = snapshot.docs[0];
    const data = docSnap.data();
    return {
      accountId: data.accountId || '',
      customerId,
      customerDocId: docSnap.id,
    };
  } catch (err) {
    logger.error('Error looking up customer info:', err);
    return null;
  }
}

async function sendNotification(
  info: CustomerInfo,
  title: string,
  description: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  category: NotificationCategory = 'general',
  extra?: Record<string, any>
): Promise<void> {
  try {
    await addDoc(
      collection(db, 'customers', info.customerDocId, 'notifications'),
      {
        userId: info.accountId,
        customerId: info.customerId,
        title,
        description,
        type,
        category,
        isUnread: true,
        createdAt: serverTimestamp(),
        ...(extra || {}),
      }
    );
  } catch (err) {
    logger.error('Error sending notification:', err);
  }
}

export async function notifyMembersAdded(
  addedCustomerIds: string[],
  actorName: string,
  groupName: string,
  _dropzoneId?: string
): Promise<void> {
  for (const customerId of addedCustomerIds) {
    const info = await getCustomerInfo(customerId);
    if (!info) continue;
    await sendNotification(info, 'Added to Group', `${actorName} added you to ${groupName}`, 'info', 'groups');
  }
}

export async function notifyMemberJoined(
  creatorCustomerId: string,
  memberName: string,
  groupName: string,
  _dropzoneId?: string
): Promise<void> {
  const info = await getCustomerInfo(creatorCustomerId);
  if (!info) return;
  await sendNotification(info, 'Member Joined', `${memberName} joined ${groupName}`, 'success', 'groups');
}

export async function notifyMemberLeft(
  creatorCustomerId: string,
  memberName: string,
  groupName: string,
  _dropzoneId?: string
): Promise<void> {
  const info = await getCustomerInfo(creatorCustomerId);
  if (!info) return;
  await sendNotification(info, 'Member Left', `${memberName} has left ${groupName}`, 'info', 'groups');
}

export async function notifyMemberRemoved(
  removedCustomerId: string,
  groupName: string,
  _dropzoneId?: string
): Promise<void> {
  const info = await getCustomerInfo(removedCustomerId);
  if (!info) return;
  await sendNotification(info, 'Removed from Group', `You were removed from ${groupName}`, 'warning', 'groups');
}

export async function notifyManifestedOnLoad(
  customerIds: string[],
  loadNumber: number,
  minutesUntilDeparture: number | null,
  _dropzoneId?: string
): Promise<void> {
  const timeText = minutesUntilDeparture !== null
    ? ` and you have ${minutesUntilDeparture} minute${minutesUntilDeparture === 1 ? '' : 's'} until departure`
    : '';
  for (const customerId of customerIds) {
    const info = await getCustomerInfo(customerId);
    if (!info) continue;
    await sendNotification(
      info,
      'Manifested on Load',
      `You were manifested on Load #${loadNumber}${timeText}`,
      'success',
      'loads'
    );
  }
}

export async function notifyRemovedFromLoad(
  customerIds: string[],
  loadNumber: number,
  _dropzoneId?: string
): Promise<void> {
  for (const customerId of customerIds) {
    const info = await getCustomerInfo(customerId);
    if (!info) continue;
    await sendNotification(
      info,
      'Removed from Load',
      `You were removed from Load #${loadNumber}`,
      'warning',
      'loads'
    );
  }
}

export async function notifyGroupRenamed(
  memberCustomerIds: string[],
  oldName: string,
  newName: string,
  _dropzoneId?: string
): Promise<void> {
  for (const customerId of memberCustomerIds) {
    const info = await getCustomerInfo(customerId);
    if (!info) continue;
    await sendNotification(info, 'Group Renamed', `${oldName} was changed to ${newName}`, 'info', 'groups');
  }
}

export async function notifyGroupInvitation(
  invitation: import('./groupsService').GroupInvitation,
  _dropzoneId?: string
): Promise<void> {
  try {
    const info = await getCustomerInfo(invitation.inviteeCustomerId);
    if (!info) return;

    await addDoc(
      collection(db, 'customers', info.customerDocId, 'notifications'),
      {
        userId: info.accountId,
        customerId: invitation.inviteeCustomerId,
        title: 'Group Invitation',
        description: `${invitation.inviterName} invited you to join ${invitation.groupName}`,
        type: 'info',
        category: 'groups',
        isUnread: true,
        createdAt: serverTimestamp(),
        actionType: 'group_invite',
        invitationGroupId: invitation.groupId,
        invitationGroupName: invitation.groupName,
        invitationDropzoneId: invitation.dropzoneId,
        inviterCustomerId: invitation.inviterCustomerId,
        inviterName: invitation.inviterName,
      }
    );
  } catch (err) {
    logger.error('Error sending group invitation notification:', err);
  }
}

export interface SignatureRequestPayload {
  // The customer being asked to sign
  signerCustomerId: string;
  // The owner of the logbook entry
  requesterCustomerId: string;
  requesterCustomerDocId: string;
  requesterName: string;
  // Jump details for display in the notification
  logbookEntryId: string;
  jumpDate: string;
  dropzoneName: string;
  discipline: string;
  freefallTime?: number | string | null;
  aircraft?: string;
}

export async function sendSignatureRequest(payload: SignatureRequestPayload): Promise<void> {
  try {
    const info = await getCustomerInfo(payload.signerCustomerId);
    if (!info) return;

    const disciplineText = payload.discipline ? ` (${payload.discipline})` : '';
    const description = `${payload.requesterName} is requesting your signature for a jump on ${payload.jumpDate} at ${payload.dropzoneName}${disciplineText}`;

    await addDoc(
      collection(db, 'customers', info.customerDocId, 'notifications'),
      {
        userId: info.accountId,
        customerId: payload.signerCustomerId,
        title: 'Signature Request',
        description,
        type: 'info',
        category: 'signature_request',
        isUnread: true,
        createdAt: serverTimestamp(),
        actionType: 'signature_request',
        // Payload to locate and update the logbook entry on action
        signerCustomerId: payload.signerCustomerId,
        requesterCustomerId: payload.requesterCustomerId,
        requesterCustomerDocId: payload.requesterCustomerDocId,
        requesterName: payload.requesterName,
        logbookEntryId: payload.logbookEntryId,
        jumpDate: payload.jumpDate,
        dropzoneName: payload.dropzoneName,
        discipline: payload.discipline,
        freefallTime: payload.freefallTime ?? null,
        aircraft: payload.aircraft ?? '',
      }
    );
  } catch (err) {
    logger.error('Error sending signature request:', err);
  }
}

export async function notifyInvitationDeclined(
  creatorCustomerId: string,
  declinerName: string,
  groupName: string,
  _dropzoneId?: string
): Promise<void> {
  const info = await getCustomerInfo(creatorCustomerId);
  if (!info) return;
  await sendNotification(
    info,
    'Invitation Declined',
    `${declinerName} declined your invitation to join ${groupName}`,
    'warning',
    'groups'
  );
}
