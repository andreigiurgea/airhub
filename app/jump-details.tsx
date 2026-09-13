import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { updateJump, sendForSignature, Jump } from '@/lib/jumpsService';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export default function JumpDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [jump, setJump] = useState<Jump | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [jumpNumber, setJumpNumber] = useState('');
  const [freefallDelay, setFreefallDelay] = useState('');
  const [equipment, setEquipment] = useState('');
  const [aircraft, setAircraft] = useState('');
  const [exitAltitude, setExitAltitude] = useState('');
  const [totalTime, setTotalTime] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!id) return;

    let unsubscribeJump: (() => void) | null = null;

    const setupJumpListener = () => {
      try {
        const jumpRef = doc(db, 'logbook', id);

        console.log('Setting up real-time jump listener for:', id);

        unsubscribeJump = onSnapshot(jumpRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const fetchedJump = {
              id: docSnapshot.id,
              ...docSnapshot.data()
            } as Jump;

            setJump(fetchedJump);
            setJumpNumber(fetchedJump.jumpNumber?.toString() || '');
            setFreefallDelay(fetchedJump.freefallDelay || '');
            setEquipment(fetchedJump.equipment || '');
            setAircraft(fetchedJump.aircraft || '');
            setExitAltitude(fetchedJump.exitAltitude || '');
            setTotalTime(fetchedJump.totalTime?.toString() || '');
            setDescription(fetchedJump.description || '');
            setLoading(false);
            console.log('Jump details updated in real-time:', fetchedJump.status);
          } else {
            setJump(null);
            setLoading(false);
            console.log('Jump not found');
          }
        }, (error) => {
          console.error('Error in jump listener:', error);
          Alert.alert('Error', 'Failed to load jump details');
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up jump listener:', error);
        setLoading(false);
      }
    };

    setupJumpListener();

    return () => {
      if (unsubscribeJump) {
        console.log('Cleaning up jump listener');
        unsubscribeJump();
      }
    };
  }, [id]);

  const handleSave = async () => {
    if (!jump) return;

    try {
      setSaving(true);

      await updateJump(jump.id, {
        jumpNumber: jumpNumber ? parseInt(jumpNumber) : null,
        freefallDelay,
        equipment,
        aircraft,
        exitAltitude,
        totalTime: totalTime ? parseInt(totalTime) : null,
        description,
        status: 'draft',
      });

      Alert.alert('Success', 'Jump details saved successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving jump:', error);
      Alert.alert('Error', 'Failed to save jump details');
    } finally {
      setSaving(false);
    }
  };

  const handleSendForSignature = async () => {
    if (!jump) return;

    try {
      setSaving(true);

      await updateJump(jump.id, {
        jumpNumber: jumpNumber ? parseInt(jumpNumber) : null,
        freefallDelay,
        equipment,
        aircraft,
        exitAltitude,
        totalTime: totalTime ? parseInt(totalTime) : null,
        description,
      });

      await sendForSignature(jump.id);

      Alert.alert('Success', 'Jump sent for signature', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error sending for signature:', error);
      Alert.alert('Error', 'Failed to send for signature');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Jump Details" showBack={true} showNotifications={false} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7B96D9" />
          <Text style={styles.loadingText}>Loading jump details...</Text>
        </View>
      </View>
    );
  }

  if (!jump) {
    return (
      <View style={styles.container}>
        <Header title="Jump Details" showBack={true} showNotifications={false} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Jump not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Jump Details" showBack={true} showNotifications={false} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Read Only Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dropzone Name</Text>
            <View style={styles.readOnlyInput}>
              <Text style={styles.readOnlyText}>{jump.dropzoneName}</Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Load Name & Number</Text>
            <View style={styles.readOnlyInput}>
              <Text style={styles.readOnlyText}>
                {jump.loadName} - Load #{jump.loadNumber}
              </Text>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date & Time of Departure</Text>
            <View style={styles.readOnlyInput}>
              <Text style={styles.readOnlyText}>
                {jump.departureDate} at {jump.departureTime}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Editable Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Jump Number</Text>
            <TextInput
              style={styles.input}
              value={jumpNumber}
              onChangeText={setJumpNumber}
              placeholder="Enter jump number"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Freefall Delay</Text>
            <TextInput
              style={styles.input}
              value={freefallDelay}
              onChangeText={setFreefallDelay}
              placeholder="Enter freefall delay"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Equipment</Text>
            <TextInput
              style={styles.input}
              value={equipment}
              onChangeText={setEquipment}
              placeholder="Enter equipment details"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Aircraft</Text>
            <TextInput
              style={styles.input}
              value={aircraft}
              onChangeText={setAircraft}
              placeholder="Enter aircraft type"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Exit Altitude</Text>
            <TextInput
              style={styles.input}
              value={exitAltitude}
              onChangeText={setExitAltitude}
              placeholder="Enter exit altitude (ft)"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Time (minutes)</Text>
            <TextInput
              style={styles.input}
              value={totalTime}
              onChangeText={setTotalTime}
              placeholder="Enter total freefall time"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter jump description"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.signatureButton]}
            onPress={handleSendForSignature}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Sending...' : 'Send for Signature'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8F0',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#000000',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  readOnlyInput: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#666',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
  },
  button: {
    borderRadius: 100,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  signatureButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
