import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Modal } from 'react-native';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { db } from '@/lib/firebase';
import { collection, getDocs, getDoc, query, where, onSnapshot, doc, updateDoc, arrayUnion, limit, getDocFromServer, getDocsFromServer } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { getCurrentCheckIn, type CheckInStatus } from '@/lib/dropzoneService';
import { logger } from '@/lib/logger';
import { QUERY_LIMITS, FLATLIST_CONFIG } from '@/lib/constants';
import { calculateMinutesUntilDeparture } from '@/lib/timeUtils';
import { getCustomerData } from '@/lib/customerCache';
import { getActiveGroupForCustomer } from '@/lib/groupsService';
import { onPurchasesChange } from '@/lib/purchaseService';
import { deductTicketFromPurchase, refundTicketToPurchase, refundMostRecentTicketFromPurchase } from '@/lib/ticketService';
import type { Purchase, PurchaseItem } from '@/hooks/usePurchaseHistory';
import { Ticket, X } from 'lucide-react-native';

interface Load {
  id: string;
  aircraftName: string;
  loadNumber: number;
  slots: number;
  availableSlots: number;
  departureTime: string;
  loadMaster: string;
  status: string;
  time?: string;
  jumpers?: any[];
}

interface StandbyState {
  isActive: boolean;
  loadOffsets?: {
    [loadId: string]: {
      minutesUntilDeparture: number;
    };
  };
}

interface AvailableTicket {
  purchaseId: string;
  itemIndex: number;
  name: string;
  quantity: number;
  category: string | null | undefined;
}

interface Jumper {
  id: string;
  customerId: string;
  name: string;
  firstName: string;
  lastName: string;
  nickname: string;
  useNickname: boolean;
  ticketName?: string;
  ticketDeduction?: { purchaseId: string; itemIndex: number };
}

export default function LoadsScreen() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningLoadId, setJoiningLoadId] = useState<string | null>(null);
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>(null);
  const [customerDocId, setCustomerDocId] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentCheckIn, setCurrentCheckIn] = useState<CheckInStatus | null>(null);
  const [standbyState, setStandbyState] = useState<StandbyState>({ isActive: false });
  const [ticketModalLoadId, setTicketModalLoadId] = useState<string | null>(null);
  const [availableTickets, setAvailableTickets] = useState<AvailableTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<AvailableTicket | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  // Members-without-tickets warning modal
  const [missingTicketModal, setMissingTicketModal] = useState<{
    loadId: string;
    ticket: AvailableTicket;
    missingMembers: { customerId: string; name: string }[];
    eligibleMembers: Jumper[];
    selfJumper: Jumper;
    loadRef: any;
    existingJumpers: Jumper[];
  } | null>(null);
  // Prevents the external-removal watcher from double-restoring on intentional leave
  const intentionalLeaveRef = useRef(false);
  const router = useRouter();
  const { user } = useAuth();

  // Timer only runs when standby is NOT active
  useEffect(() => {
    if (standbyState.isActive) {
      return; // Don't run timer when in standby mode
    }

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [standbyState.isActive]);

  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!user) return;

      try {
        const customerResult = await getCustomerData(user.uid);

        if (customerResult) {
          const data = customerResult.data;
          setCurrentCustomerId(data.customerId);
          setCustomerDocId(customerResult.docId);
          setCustomerData(data);
        }

        // Get current check-in status
        const checkIn = await getCurrentCheckIn(user.uid);
        setCurrentCheckIn(checkIn);
      } catch (error) {
        logger.error('Error fetching customer data:', error);
      }
    };

    fetchCustomerData();
  }, [user]);

  // Listen to standby state
  useEffect(() => {
    if (!currentCheckIn?.dropzoneId) {
      setStandbyState({ isActive: false });
      return;
    }

    const standbyRef = doc(db, 'dropzones', currentCheckIn.dropzoneId, 'system', 'standby');

    const unsubscribe = onSnapshot(standbyRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        // Convert loadOffsets array to object keyed by loadId
        let loadOffsetsMap: { [loadId: string]: { minutesUntilDeparture: number } } = {};

        if (data.loadOffsets) {
          // Check if it's an array or already an object
          if (Array.isArray(data.loadOffsets)) {
            // Convert array to object keyed by loadId
            data.loadOffsets.forEach((offset: any) => {
              if (offset.loadId) {
                loadOffsetsMap[offset.loadId] = {
                  minutesUntilDeparture: offset.minutesUntilDeparture
                };
              }
            });
          } else {
            // Already an object, use as is
            loadOffsetsMap = data.loadOffsets;
          }
        }

        setStandbyState({
          isActive: data.isActive || false,
          loadOffsets: loadOffsetsMap
        });
        logger.log('Standby state updated:', {
          isActive: data.isActive,
          loadOffsets: loadOffsetsMap
        });
      } else {
        setStandbyState({ isActive: false });
      }
    }, (error) => {
      logger.error('Error listening to standby state:', error);
      setStandbyState({ isActive: false });
    });

    return () => unsubscribe();
  }, [currentCheckIn?.dropzoneId]);

  // Listen to loads
  useEffect(() => {
    if (!currentCheckIn?.dropzoneId) {
      setLoads([]);
      setLoading(false);
      return;
    }

    // Fetch loads from dropzone-specific path
    const loadsRef = collection(db, 'dropzones', currentCheckIn.dropzoneId, 'loads');
    const q = query(loadsRef, where('status', '==', 'upcoming'), limit(QUERY_LIMITS.LOADS));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadsData: Load[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        const jumpersCount = Array.isArray(data.jumpers) ? data.jumpers.length : 0;
        const loadMasterData = Array.isArray(data.loadMasters) && data.loadMasters.length > 0
          ? data.loadMasters[0]
          : null;

        const load: Load = {
          id: doc.id,
          aircraftName: data.aircraft || 'Unknown',
          loadNumber: data.loadNumber || 0,
          slots: data.maxSlots || 20,
          availableSlots: data.maxSlots ? data.maxSlots - jumpersCount : 0,
          departureTime: data.time || 'TBD',
          loadMaster: loadMasterData
            ? (loadMasterData.useNickname && loadMasterData.nickname
                ? loadMasterData.nickname
                : loadMasterData.name || 'TBD')
            : 'TBD',
          status: data.status || 'upcoming',
          time: data.time,
          jumpers: data.jumpers || [],
        };

        loadsData.push(load);
      });

      const sortedLoads = loadsData.sort((a, b) => {
        const parseTime = (timeStr: string) => {
          const match = timeStr.match(/(\d+):(\d+)/);
          if (match) {
            return parseInt(match[1]) * 60 + parseInt(match[2]);
          }
          return 999999;
        };
        return parseTime(a.time || '') - parseTime(b.time || '');
      });

      setLoads(sortedLoads);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentCheckIn?.dropzoneId, currentCustomerId]);

  // Listen to purchases for ticket selection
  useEffect(() => {
    if (!currentCustomerId || !currentCheckIn?.dropzoneId || !user) {
      setPurchases([]);
      return;
    }
    const unsub = onPurchasesChange(
      currentCustomerId,
      currentCheckIn.dropzoneId,
      user.uid,
      (p) => setPurchases(p)
    );
    return unsub;
  }, [currentCustomerId, currentCheckIn?.dropzoneId, user]);

  // Watch the load the user is currently manifested on.
  // If the user is externally removed (admin) or the load is deleted, restore their ticket.
  useEffect(() => {
    if (!currentCustomerId || !currentCheckIn?.dropzoneId || !user) return;

    // Find which load the user is on and what jumper entry they have
    const manifestedLoad = loads.find(load => isUserManifested(load));
    if (!manifestedLoad) return;

    const myJumper = manifestedLoad.jumpers?.find((j: any) => isJumperCurrentUser(j));
    // Only watch if the jumper has some ticket reference (new or legacy style)
    const hasTicket =
      myJumper?.ticketDeduction?.purchaseId != null ||
      myJumper?.ticketPurchaseId != null;
    if (!myJumper || !hasTicket) return;

    const doRestore = async () => {
      try {
        if (myJumper.ticketDeduction?.purchaseId != null) {
          await refundTicketToPurchase(
            customerData.customerId,
            currentCheckIn.dropzoneId,
            myJumper.ticketDeduction.purchaseId,
            myJumper.ticketDeduction.itemIndex
          );
        } else if (myJumper.ticketPurchaseId != null) {
          await refundTicketToPurchase(
            customerData.customerId,
            currentCheckIn.dropzoneId,
            myJumper.ticketPurchaseId,
            myJumper.ticketItemIndex
          );
        } else {
          await refundMostRecentTicketFromPurchase(customerData.customerId, currentCheckIn.dropzoneId);
        }
      } catch (err) {
        logger.error('External removal watcher: failed to restore ticket', err);
      }
    };

    const loadRef = doc(db, 'dropzones', currentCheckIn.dropzoneId, 'loads', manifestedLoad.id);
    const unsub = onSnapshot(loadRef, async (snap) => {
      // Skip if this change was triggered by the user intentionally leaving
      if (intentionalLeaveRef.current) return;

      if (!snap.exists()) {
        // Load deleted entirely — restore ticket
        await doRestore();
        logger.log('Load deleted — ticket restored');
        return;
      }
      const jumpers: any[] = snap.data().jumpers || [];
      const stillManifested = jumpers.some((j: any) =>
        j.customerId === customerData?.customerId || j.id === customerData?.customerId
      );
      if (!stillManifested) {
        // Externally removed — restore ticket
        await doRestore();
        logger.log('User removed from load externally — ticket restored');
      }
    });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loads, currentCustomerId, currentCheckIn?.dropzoneId, user?.uid]);

  const JUMP_TICKET_CATEGORIES = ['Tickets', 'jumping_tickets'];

  const checkMemberHasTickets = async (customerId: string, dropzoneId: string, ticketName: string): Promise<boolean> => {
    try {
      const custSnap = await getDocsFromServer(
        query(collection(db, 'dropzones', dropzoneId, 'customers'), where('customerId', '==', customerId))
      );
      if (custSnap.empty) return false;
      const docId = custSnap.docs[0].id;
      const purchasesSnap = await getDocsFromServer(
        collection(db, 'dropzones', dropzoneId, 'customers', docId, 'purchases')
      );
      for (const purchaseDoc of purchasesSnap.docs) {
        const data = purchaseDoc.data();
        if (data.canceled) continue;
        for (const item of (data.items || [])) {
          if (item.canceled) continue;
          if (!JUMP_TICKET_CATEGORIES.includes(item.category)) continue;
          if (item.name?.toLowerCase() !== ticketName.toLowerCase()) continue;
          const remaining = (item.quantity ?? 1) - (item.usedCount ?? 0);
          if (remaining > 0) return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const getAvailableTickets = (): AvailableTicket[] => {
    const grouped: Record<string, AvailableTicket> = {};
    for (const purchase of purchases) {
      if (purchase.canceled) continue;
      purchase.items.forEach((item: any, idx) => {
        if (item.canceled) return;
        if (!JUMP_TICKET_CATEGORIES.includes(item.category)) return;
        const usedCount = item.usedCount ?? 0;
        const remaining = item.quantity - usedCount;
        if (remaining <= 0) return;
        const key = item.name;
        if (grouped[key]) {
          grouped[key].quantity += remaining;
        } else {
          grouped[key] = {
            purchaseId: purchase.id,
            itemIndex: idx,
            name: item.name,
            quantity: remaining,
            category: item.category,
          };
        }
      });
    }
    return Object.values(grouped);
  };

  const openTicketModal = (loadId: string) => {
    const tickets = getAvailableTickets();
    setAvailableTickets(tickets);
    setSelectedTicket(null);
    setTicketModalLoadId(loadId);
  };

  const confirmJoinWithTicket = async () => {
    if (!ticketModalLoadId || !selectedTicket) return;
    setTicketModalLoadId(null);
    await handleJoinLoad(ticketModalLoadId, selectedTicket);
  };

  const handleJoinLoad = async (loadId: string, ticket: AvailableTicket) => {
    if (!user || !currentCheckIn?.dropzoneId || !customerData) {
      logger.log('No user logged in or not checked in');
      return;
    }

    setJoiningLoadId(loadId);
    try {
      const displayName = customerData.useNickname && customerData.nickname
        ? customerData.nickname
        : `${customerData.firstName} ${customerData.lastName}`.trim();

      // Read load fresh from server to get the current jumpers array (prevents stale overwrites)
      const loadRef = doc(db, 'dropzones', currentCheckIn.dropzoneId, 'loads', loadId);
      const freshLoadSnap = await getDocFromServer(loadRef);
      const existingJumpers: Jumper[] = freshLoadSnap.exists() ? (freshLoadSnap.data().jumpers || []) : [];

      const alreadyManifested = new Set<string>(
        existingJumpers.flatMap((j: any) => [j.id, j.customerId].filter(Boolean))
      );

      const jumpersToAdd: Jumper[] = [];

      const activeGroup = await getActiveGroupForCustomer(
        currentCheckIn.dropzoneId,
        customerData.customerId
      );

      if (activeGroup) {
        const dzCustomersSnap = await getDocs(
          collection(db, 'dropzones', currentCheckIn.dropzoneId, 'customers')
        );
        const checkedInSet = new Set<string>();
        dzCustomersSnap.forEach((d) => {
          const data = d.data();
          if (data.checkedIn === true && data.customerId) {
            checkedInSet.add(data.customerId);
          }
        });

        const missingMembers: { customerId: string; name: string }[] = [];
        const eligibleGroupMembers: { member: typeof activeGroup.members[0]; memberName: string }[] = [];

        for (const member of activeGroup.members) {
          if (member.customerId === customerData.customerId) continue; // self handled below
          if (alreadyManifested.has(member.customerId)) continue;
          if (!checkedInSet.has(member.customerId)) continue;
          const memberName = member.useNickname && member.nickname
            ? member.nickname
            : `${member.firstName} ${member.lastName}`.trim();
          const hasTickets = await checkMemberHasTickets(member.customerId, currentCheckIn.dropzoneId, ticket.name);
          if (!hasTickets) {
            missingMembers.push({ customerId: member.customerId, name: memberName });
            continue;
          }
          eligibleGroupMembers.push({ member, memberName });
        }

        if (missingMembers.length > 0) {
          // Show warning — do NOT deduct any tickets yet; deduction happens if user confirms
          const eligibleJumpers: Jumper[] = eligibleGroupMembers.map(({ member, memberName }) => ({
            id: member.customerId,
            customerId: member.customerId,
            name: memberName,
            firstName: member.firstName,
            lastName: member.lastName,
            nickname: member.nickname || '',
            useNickname: member.useNickname || false,
            ticketName: ticket.name,
            ticketDeduction: undefined,
          }));
          const selfPlaceholder: Jumper = {
            id: customerData.customerId,
            customerId: customerData.customerId,
            name: displayName,
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            nickname: customerData.nickname || '',
            useNickname: customerData.useNickname || false,
            ticketName: ticket.name,
            ticketDeduction: undefined,
          };
          if (!alreadyManifested.has(selfPlaceholder.customerId)) {
            eligibleJumpers.push(selfPlaceholder);
          }
          setMissingTicketModal({
            loadId,
            ticket,
            missingMembers,
            eligibleMembers: eligibleJumpers,
            selfJumper: selfPlaceholder,
            loadRef,
            existingJumpers,
          });
          setJoiningLoadId(null);
          return;
        }

        // No missing members — deduct tickets for each eligible group member
        for (const { member, memberName } of eligibleGroupMembers) {
          const memberDeduction = await deductTicketFromPurchase(
            member.customerId,
            currentCheckIn.dropzoneId,
            undefined,
            ticket.name,
          );
          jumpersToAdd.push({
            id: member.customerId,
            customerId: member.customerId,
            name: memberName,
            firstName: member.firstName,
            lastName: member.lastName,
            nickname: member.nickname || '',
            useNickname: member.useNickname || false,
            ticketName: ticket.name,
            ticketDeduction: memberDeduction ?? undefined,
          });
        }

        if (!alreadyManifested.has(customerData.customerId)) {
          jumpersToAdd.push({
            id: customerData.customerId,
            customerId: customerData.customerId,
            name: displayName,
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            nickname: customerData.nickname || '',
            useNickname: customerData.useNickname || false,
            ticketName: ticket.name,
          });
        }
      } else {
        if (!alreadyManifested.has(customerData.customerId)) {
          jumpersToAdd.push({
            id: customerData.customerId,
            customerId: customerData.customerId,
            name: displayName,
            firstName: customerData.firstName,
            lastName: customerData.lastName,
            nickname: customerData.nickname || '',
            useNickname: customerData.useNickname || false,
            ticketName: ticket.name,
          });
        }
      }

      if (jumpersToAdd.length > 0) {
        // Deduct ticket now — we've confirmed we're proceeding
        const deduction = await deductTicketFromPurchase(
          customerData.customerId,
          currentCheckIn.dropzoneId,
          ticket.purchaseId ? undefined : undefined,
          ticket.name,
        );

        if (!deduction) {
          logger.error('handleJoinLoad: ticket deduction failed — aborting manifest');
          return;
        }

        // Attach deduction to self entry
        const mergedJumpers = [...existingJumpers, ...jumpersToAdd.map((j) =>
          j.customerId === customerData.customerId ? { ...j, ticketDeduction: deduction } : j
        )];
        await updateDoc(loadRef, { jumpers: mergedJumpers });
        logger.log(`Successfully added ${jumpersToAdd.length} jumper(s) to load`);

        const load = loads.find(l => l.id === loadId);
        const minutesUntilDeparture = load?.time ? calculateMinutesUntilDeparture(load.time) : null;
        const loadNumber = load?.loadNumber ?? 0;
        const notifiedIds = jumpersToAdd.map((j) => j.customerId);
        const { notifyManifestedOnLoad } = await import('@/lib/notificationsService');
        await notifyManifestedOnLoad(notifiedIds, loadNumber, minutesUntilDeparture, currentCheckIn.dropzoneId);
      }
    } catch (error) {
      logger.error('Error joining load:', error);
    } finally {
      setJoiningLoadId(null);
    }
  };

  const confirmManifestWithoutMissing = async () => {
    if (!missingTicketModal || !currentCheckIn?.dropzoneId || !customerData) return;
    const { loadId, ticket, eligibleMembers, existingJumpers, loadRef } = missingTicketModal;
    setMissingTicketModal(null);
    if (eligibleMembers.length === 0) return;
    try {
      setJoiningLoadId(loadId);

      // Deduct a ticket for every eligible member (creator + group members with tickets)
      const jumpersWithDeductions: Jumper[] = [];
      for (const j of eligibleMembers) {
        const deduction = await deductTicketFromPurchase(
          j.customerId,
          currentCheckIn.dropzoneId,
          undefined,
          ticket.name,
        );
        if (!deduction) {
          logger.error('confirmManifestWithoutMissing: ticket deduction failed for', j.customerId, '— skipping');
          continue;
        }
        jumpersWithDeductions.push({ ...j, ticketDeduction: deduction });
      }

      if (jumpersWithDeductions.length === 0) return;

      const mergedJumpers = [...existingJumpers, ...jumpersWithDeductions];
      await updateDoc(loadRef, { jumpers: mergedJumpers });
      const load = loads.find(l => l.id === loadId);
      const minutesUntilDeparture = load?.time ? calculateMinutesUntilDeparture(load.time) : null;
      const loadNumber = load?.loadNumber ?? 0;
      const notifiedIds = jumpersWithDeductions.map((j) => j.customerId);
      const { notifyManifestedOnLoad } = await import('@/lib/notificationsService');
      await notifyManifestedOnLoad(notifiedIds, loadNumber, minutesUntilDeparture, currentCheckIn.dropzoneId);
    } catch (error) {
      logger.error('Error manifesting without missing members:', error);
    } finally {
      setJoiningLoadId(null);
    }
  };

  const handleLeaveLoad = async (loadId: string) => {
    if (!user || !currentCustomerId || !currentCheckIn?.dropzoneId || !customerData) {
      logger.log('No user logged in, customer ID not found, or not checked in');
      return;
    }

    intentionalLeaveRef.current = true;
    setJoiningLoadId(loadId);
    try {
      const loadRef = doc(db, 'dropzones', currentCheckIn.dropzoneId, 'loads', loadId);
      // Fresh read from server — guarantees we see current ticketDeduction fields
      const loadSnap = await getDocFromServer(loadRef);
      if (!loadSnap.exists()) return;

      const loadData = loadSnap.data();
      const currentJumpers: Jumper[] = loadData.jumpers || [];
      const loadNumber: number = loadData.loadNumber ?? 0;

      const activeGroup = await getActiveGroupForCustomer(
        currentCheckIn.dropzoneId,
        customerData.customerId
      );

      let removedIds: string[] = [];
      let removedJumpers: Jumper[] = [];

      if (activeGroup) {
        const myCustomerId = customerData.customerId;
        const isCreator = activeGroup.createdBy === myCustomerId;
        const groupMemberIds = new Set(activeGroup.members.map((m) => m.customerId));

        const manifestedGroupJumpers = currentJumpers.filter(
          (j: any) => groupMemberIds.has(j.id) || groupMemberIds.has(j.customerId)
        );
        const allMembersManifested = manifestedGroupJumpers.length === activeGroup.members.length;

        if (isCreator && allMembersManifested) {
          const remaining = currentJumpers.filter(
            (j: any) => !groupMemberIds.has(j.id) && !groupMemberIds.has(j.customerId)
          );
          removedIds = manifestedGroupJumpers.map((j: any) => j.customerId || j.id).filter(Boolean);
          removedJumpers = manifestedGroupJumpers;
          await updateDoc(loadRef, { jumpers: remaining });
          logger.log(`Creator left — removed all ${manifestedGroupJumpers.length} group member(s) from load`);
        } else {
          const remaining = currentJumpers.filter((j: any) => !isJumperCurrentUser(j));
          if (remaining.length < currentJumpers.length) {
            removedIds = [myCustomerId].filter(Boolean);
            removedJumpers = currentJumpers.filter((j: any) => isJumperCurrentUser(j));
            await updateDoc(loadRef, { jumpers: remaining });
            logger.log('Member left load individually — group unchanged');
          }
        }
      } else {
        const remaining = currentJumpers.filter((j: any) => !isJumperCurrentUser(j));
        if (remaining.length < currentJumpers.length) {
          removedIds = [currentCustomerId ?? user?.uid ?? ''].filter(Boolean);
          removedJumpers = currentJumpers.filter((j: any) => isJumperCurrentUser(j));
          await updateDoc(loadRef, { jumpers: remaining });
          logger.log('Successfully left load');
        }
      }

      // Restore tickets for all removed jumpers
      for (const jumper of removedJumpers) {
        const cid: string = (jumper as any).customerId || (jumper as any).id;
        try {
          if ((jumper as any).ticketDeduction?.purchaseId != null) {
            // New-style: precise refund to exact purchase item
            await refundTicketToPurchase(
              cid,
              currentCheckIn.dropzoneId,
              (jumper as any).ticketDeduction.purchaseId,
              (jumper as any).ticketDeduction.itemIndex
            );
          } else if ((jumper as any).ticketPurchaseId != null) {
            // Legacy-style: had old flat fields — use them directly
            await refundTicketToPurchase(
              cid,
              currentCheckIn.dropzoneId,
              (jumper as any).ticketPurchaseId,
              (jumper as any).ticketItemIndex
            );
          } else {
            // No ticket info at all — fall back to scanning purchases
            await refundMostRecentTicketFromPurchase(cid, currentCheckIn.dropzoneId);
          }
        } catch (err) {
          logger.error('handleLeaveLoad: failed to restore ticket for', cid, err);
        }
      }

      if (removedIds.length > 0) {
        const { notifyRemovedFromLoad } = await import('@/lib/notificationsService');
        await notifyRemovedFromLoad(removedIds, loadNumber, currentCheckIn.dropzoneId);
      }
    } catch (error) {
      logger.error('Error leaving load:', error);
    } finally {
      setJoiningLoadId(null);
      // Small delay before clearing so the snapshot triggered by our write is ignored
      setTimeout(() => { intentionalLeaveRef.current = false; }, 2000);
    }
  };

  const isJumperCurrentUser = (jumper: any): boolean => {
    if (!jumper) return false;
    const uid = user?.uid;
    const ids = [currentCustomerId, customerDocId, uid].filter(Boolean);
    return ids.some(id =>
      jumper.id === id ||
      jumper.customerId === id ||
      jumper.uid === id ||
      jumper.jumperId === id ||
      jumper.accountId === id
    );
  };

  const isUserManifested = (load: Load): boolean => {
    if (!load.jumpers) return false;
    return load.jumpers.some(isJumperCurrentUser);
  };

  const isUserManifestedOnAnyLoad = (): boolean => {
    if (!currentCustomerId) return false;
    return loads.some(load => isUserManifested(load));
  };

  const getUserManifestedLoadId = (): string | null => {
    if (!currentCustomerId) return null;
    const manifestedLoad = loads.find(load => isUserManifested(load));
    return manifestedLoad ? manifestedLoad.id : null;
  };

  const renderLoadCard = useCallback(({ item }: { item: Load }) => {
    const isManifested = isUserManifested(item);
    const isManifestedOnAnyLoad = isUserManifestedOnAnyLoad();
    const manifestedLoadId = getUserManifestedLoadId();

    // Use standby time if active, otherwise calculate real-time
    let minutesUntil: number;
    if (standbyState.isActive && standbyState.loadOffsets?.[item.id]) {
      minutesUntil = standbyState.loadOffsets[item.id].minutesUntilDeparture;
    } else {
      minutesUntil = calculateMinutesUntilDeparture(item.departureTime);
    }

    // User can only join if they're not manifested on any load, or this is the load they're on
    const canJoin = !isManifestedOnAnyLoad || isManifested;

    return (
      <View style={styles.loadCard}>
        <View style={styles.cardContent}>
          <View style={styles.leftSection}>
            <View style={styles.topRow}>
              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Load</Text>
                <Text style={styles.infoValue}>{item.aircraftName}</Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Number</Text>
                <Text style={styles.infoValue}>{item.loadNumber}</Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Slots</Text>
                <Text style={styles.infoValue}>{item.availableSlots}</Text>
              </View>
            </View>

            <View style={styles.bottomRow}>
              <View style={styles.loadMasterSection}>
                <Text style={styles.loadMasterLabel}>Load Master</Text>
                <Text style={styles.loadMasterName}>{item.loadMaster}</Text>
              </View>
            </View>
          </View>

          <View style={styles.dashedDivider} />

          <View style={styles.rightSection}>
            <View style={styles.departureSection}>
              <Text style={styles.infoLabel}>Departure</Text>
              <Text style={styles.infoValue}>{minutesUntil} min</Text>
            </View>

            <TouchableOpacity
              style={[
                styles.joinButton,
                isManifested && styles.leaveButton,
                !canJoin && styles.disabledButton
              ]}
              onPress={(e) => {
                e.stopPropagation();
                if (isManifested) {
                  handleLeaveLoad(item.id);
                } else if (canJoin) {
                  openTicketModal(item.id);
                }
              }}
              disabled={joiningLoadId === item.id || !canJoin}
            >
              {joiningLoadId === item.id ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.joinButtonText}>
                  {isManifested ? 'Leave' : 'Join'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [standbyState, currentCustomerId, customerDocId, user, loads, joiningLoadId, handleJoinLoad, handleLeaveLoad]);

  return (
    <View style={styles.container}>
      <Header title="Load List" showBack={false} showNotifications={true} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A78BFA" />
        </View>
      ) : (
        <FlatList
          data={loads}
          renderItem={renderLoadCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={FLATLIST_CONFIG.MAX_TO_RENDER_PER_BATCH}
          updateCellsBatchingPeriod={FLATLIST_CONFIG.UPDATE_CELLS_BATCHING_PERIOD}
          initialNumToRender={FLATLIST_CONFIG.INITIAL_NUM_TO_RENDER}
          windowSize={FLATLIST_CONFIG.WINDOW_SIZE}
          removeClippedSubviews={true}
        />
      )}

      {/* Ticket Selection Modal */}
      <Modal
        visible={ticketModalLoadId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTicketModalLoadId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Close button */}
            <TouchableOpacity style={styles.modalClose} onPress={() => setTicketModalLoadId(null)}>
              <X size={18} color="#9CA3AF" strokeWidth={2.5} />
            </TouchableOpacity>

            {/* Icon + title */}
            <View style={styles.modalIconWrap}>
              <Ticket size={28} color="#3B82F6" strokeWidth={1.8} />
            </View>
            <Text style={styles.modalTitle}>Select Ticket Type</Text>
            <Text style={styles.modalSubtitle}>Which ticket would you like to use for this jump?</Text>

            {availableTickets.length === 0 ? (
              <View style={styles.noTicketsWrap}>
                <Text style={styles.noTicketsTitle}>No Tickets Available</Text>
                <Text style={styles.noTicketsText}>Purchase jump tickets from the shop before manifesting on a load.</Text>
              </View>
            ) : (
              <ScrollView style={styles.ticketList} showsVerticalScrollIndicator={false}>
                {availableTickets.map((t) => {
                  const isSelected = selectedTicket?.purchaseId === t.purchaseId && selectedTicket?.itemIndex === t.itemIndex;
                  return (
                    <TouchableOpacity
                      key={`${t.purchaseId}-${t.itemIndex}`}
                      style={[styles.ticketRow, isSelected && styles.ticketRowSelected]}
                      onPress={() => setSelectedTicket(t)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.ticketRadio, isSelected && styles.ticketRadioSelected]}>
                        {isSelected && <View style={styles.ticketRadioDot} />}
                      </View>
                      <View style={styles.ticketRowInfo}>
                        <Text style={[styles.ticketRowName, isSelected && styles.ticketRowNameSelected]}>{t.name}</Text>
                        <Text style={styles.ticketRowQty}>{t.quantity}x remaining</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTicketModalLoadId(null)} activeOpacity={0.8}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              {availableTickets.length > 0 && (
                <TouchableOpacity
                  style={[styles.confirmBtn, !selectedTicket && styles.confirmBtnDisabled]}
                  onPress={confirmJoinWithTicket}
                  disabled={!selectedTicket}
                  activeOpacity={0.85}
                >
                  <Text style={styles.confirmBtnText}>Join Load</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
      {/* Missing Tickets Warning Modal */}
      <Modal
        visible={missingTicketModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setMissingTicketModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.missingModalCard}>
            {/* Header */}
            <View style={styles.missingModalHeader}>
              <View style={styles.missingModalTitleRow}>
                <View style={styles.missingModalIconWrap}>
                  <Ticket size={22} color="#D97706" strokeWidth={2} />
                </View>
                <Text style={styles.missingModalTitle}>Missing Tickets</Text>
              </View>
              <TouchableOpacity style={styles.missingModalClose} onPress={() => setMissingTicketModal(null)}>
                <X size={16} color="#9CA3AF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <Text style={styles.missingModalSubtitle}>
              {(missingTicketModal?.missingMembers.length ?? 0) > 1 ? 'These members' : 'This member'} {' '}
              <Text style={styles.missingModalTicketName}>don't have a "{missingTicketModal?.ticket.name}" ticket</Text>
              {' '}and cannot be manifested on this load.
            </Text>

            {/* Members list */}
            <View style={styles.missingMembersBox}>
              {missingTicketModal?.missingMembers.map((m) => (
                <View key={m.customerId} style={styles.missingMemberChip}>
                  <View style={styles.missingMemberAvatar}>
                    <Text style={styles.missingMemberAvatarText}>{m.name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.missingMemberChipName}>{m.name}</Text>
                  <View style={styles.missingMemberBadge}>
                    <Text style={styles.missingMemberBadgeText}>No ticket</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Info note */}
            <View style={styles.missingNoteBox}>
              <Text style={styles.missingNoteText}>
                {(missingTicketModal?.eligibleMembers.length ?? 0) > 1
                  ? `${missingTicketModal?.eligibleMembers.length} other members will still be manifested.`
                  : (missingTicketModal?.eligibleMembers.length ?? 0) === 1
                  ? 'The remaining member with a ticket will still be manifested.'
                  : 'Only you will be manifested on this load.'}
              </Text>
            </View>

            {/* Buttons — stacked to avoid wrap */}
            <TouchableOpacity
              style={styles.missingProceedBtn}
              onPress={confirmManifestWithoutMissing}
              activeOpacity={0.85}
            >
              <Text style={styles.missingProceedBtnText}>Manifest Without Them</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.missingCancelBtn} onPress={() => setMissingTicketModal(null)} activeOpacity={0.8}>
              <Text style={styles.missingCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 100,
    paddingTop: 8,
  },
  loadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
  },
  leftSection: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  infoBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#B0B0B0',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  dashedDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginLeft: 8,
    marginRight: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#D0D0D0',
    borderStyle: 'dotted',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  loadMasterSection: {},
  loadMasterLabel: {
    fontSize: 12,
    color: '#B0B0B0',
    marginBottom: 4,
  },
  loadMasterName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  rightSection: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  departureSection: {
    alignItems: 'center',
  },
  joinButton: {
    backgroundColor: '#9B7EDE',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  leaveButton: {
    backgroundColor: '#FF5A5F',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.6,
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  modalClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  ticketList: {
    maxHeight: 260,
    marginBottom: 4,
  },
  ticketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  ticketRowSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  ticketRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketRadioSelected: {
    borderColor: '#3B82F6',
  },
  ticketRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  ticketRowInfo: {
    flex: 1,
  },
  ticketRowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  ticketRowNameSelected: {
    color: '#1D4ED8',
  },
  ticketRowQty: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  noTicketsWrap: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  noTicketsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
  },
  noTicketsText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  missingMembersList: { display: 'none' },
  missingMemberRow: { display: 'none' },
  missingMemberDot: { display: 'none' },
  missingMemberName: { display: 'none' },
  missingMemberNote: { display: 'none' },

  // Missing tickets modal — redesigned
  missingModalCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 16,
  },
  missingModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  missingModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  missingModalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missingModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missingModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  missingModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 21,
    marginBottom: 20,
  },
  missingModalTicketName: {
    fontWeight: '700',
    color: '#B45309',
  },
  missingMembersBox: {
    gap: 8,
    marginBottom: 16,
  },
  missingMemberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  missingMemberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCD34D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missingMemberAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350F',
  },
  missingMemberChipName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#92400E',
  },
  missingMemberBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  missingMemberBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  missingNoteBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  missingNoteText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 19,
    textAlign: 'center',
  },
  missingProceedBtn: {
    backgroundColor: '#D97706',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  missingProceedBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.1,
  },
  missingCancelBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  missingCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
});
