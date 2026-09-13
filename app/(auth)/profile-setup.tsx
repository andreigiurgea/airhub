import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Camera, User, Phone, MapPin, Shield, Award, Mail } from 'lucide-react-native';
import { logger } from '@/lib/logger';

export default function ProfileSetupScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [useNickname, setUseNickname] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [licenseType, setLicenseType] = useState('USPA');
  const [licenseRating, setLicenseRating] = useState('A');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  const formatDateOfBirth = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length >= 2) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    if (cleaned.length >= 4) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
    }

    setDateOfBirth(formatted);
  };

  const formatLicenseExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let formatted = cleaned;

    if (cleaned.length >= 2) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    if (cleaned.length >= 4) {
      formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
    }

    setLicenseExpiry(formatted);
  };

  const handleComplete = async () => {
    if (!firstName || !lastName) {
      setError('Please enter your first and last name');
      return;
    }

    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const customersRef = collection(db, 'customers');
      const q = query(customersRef, where('accountId', '==', user.uid));
      const querySnapshot = await getDocs(q);

      let customerId = '';
      let customerDocId = '';
      let existingData: any = null;

      if (!querySnapshot.empty) {
        const customerDoc = querySnapshot.docs[0];
        customerId = customerDoc.data().customerId;
        customerDocId = customerDoc.id;
        existingData = customerDoc.data();
      } else {
        const timestamp = Date.now();
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        customerId = `C${timestamp.toString().slice(-4)}${randomSuffix}`;
        customerDocId = customerId;
      }

      await setDoc(doc(db, 'customers', customerDocId), {
        customerId: customerId,
        email: user.email || '',
        firstName: firstName,
        lastName: lastName,
        nickname: nickname || firstName,
        useNickname: useNickname,
        phone: phone || '',
        dateOfBirth: dateOfBirth || '',
        weight: weight ? parseFloat(weight) : 0,
        height: height ? parseFloat(height) : 0,
        address: address || '',
        license: licenseNumber ? `${licenseType}: ${licenseRating} - ${licenseNumber}` : '',
        licenseExpiry: licenseExpiry || '',
        type: 'fun_jumper',
        status: 'Active',
        role: null,
        lastJump: '',
        profileComplete: true,
        emergency: {
          name: emergencyContactName || '',
          phone: emergencyContactPhone || ''
        },
        stats: existingData?.stats || {
          totalJumps: 0,
          licenses: licenseRating ? [licenseRating] : [],
          jumpTypes: {
            belly: 0,
            freefly: 0,
            wingsuit: 0
          },
          certifications: []
        },
        accountId: user.uid,
        createdAt: existingData?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      router.replace('/(tabs)');
    } catch (err: any) {
      logger.error('Profile save error:', err);
      setError(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBackground}>
        <Text style={styles.headerTitle}>Complete Your Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImageWrapper}>
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.placeholderText}>📷</Text>
              </View>
              <TouchableOpacity style={styles.editImageButton}>
                <Camera size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color="#7C5FDC" />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor="#AAA"
                value={firstName}
                onChangeText={setFirstName}
                editable={!loading}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor="#AAA"
                value={lastName}
                onChangeText={setLastName}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nickname</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your nickname (optional)"
              placeholderTextColor="#AAA"
              value={nickname}
              onChangeText={setNickname}
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setUseNickname(!useNickname)}
            disabled={loading}
          >
            <View style={[styles.checkbox, useNickname && styles.checkboxChecked]}>
              {useNickname && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Display nickname instead of name</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Date of birth</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#AAA"
                value={dateOfBirth}
                onChangeText={formatDateOfBirth}
                editable={!loading}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
            <View style={styles.quarterInput}>
              <Text style={styles.label}>Height</Text>
              <TextInput
                style={styles.input}
                placeholder="cm"
                placeholderTextColor="#AAA"
                value={height}
                onChangeText={setHeight}
                editable={!loading}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.quarterInput}>
              <Text style={styles.label}>Weight</Text>
              <TextInput
                style={styles.input}
                placeholder="kg"
                placeholderTextColor="#AAA"
                value={weight}
                onChangeText={setWeight}
                editable={!loading}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={20} color="#5B8CDB" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWithIcon}>
              <Mail size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithPadding, styles.disabledInput]}
                placeholder="Email address"
                placeholderTextColor="#AAA"
                value={user?.email || ''}
                editable={false}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter your address"
              placeholderTextColor="#AAA"
              value={address}
              onChangeText={setAddress}
              editable={!loading}
              multiline
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone number</Text>
            <View style={styles.inputWithIcon}>
              <Phone size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithPadding]}
                placeholder="Enter your phone number"
                placeholderTextColor="#AAA"
                value={phone}
                onChangeText={setPhone}
                editable={!loading}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color="#E85D75" />
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contact name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter emergency contact name"
              placeholderTextColor="#AAA"
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contact phone</Text>
            <View style={styles.inputWithIcon}>
              <Phone size={18} color="#999" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.inputWithPadding]}
                placeholder="Enter emergency contact phone"
                placeholderTextColor="#AAA"
                value={emergencyContactPhone}
                onChangeText={setEmergencyContactPhone}
                editable={!loading}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>License Information</Text>
          </View>

          <View style={styles.licenseTypeContainer}>
            <TouchableOpacity
              style={[styles.licenseTypeButton, licenseType === 'USPA' && styles.licenseTypeButtonActive]}
              onPress={() => setLicenseType('USPA')}
              disabled={loading}
            >
              <Text style={[styles.licenseTypeText, licenseType === 'USPA' && styles.licenseTypeTextActive]}>
                USPA
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.licenseTypeButton, licenseType === 'Other' && styles.licenseTypeButtonActive]}
              onPress={() => setLicenseType('Other')}
              disabled={loading}
            >
              <Text style={[styles.licenseTypeText, licenseType === 'Other' && styles.licenseTypeTextActive]}>
                Other
              </Text>
            </TouchableOpacity>
          </View>

          {licenseType === 'USPA' ? (
            <>
              <Text style={styles.ratingLabel}>License Rating</Text>
              <View style={styles.ratingContainer}>
                {['A', 'B', 'C', 'D'].map((rating) => (
                  <TouchableOpacity
                    key={rating}
                    style={[styles.ratingButton, licenseRating === rating && styles.ratingButtonActive]}
                    onPress={() => setLicenseRating(rating)}
                    disabled={loading}
                  >
                    <Text style={[styles.ratingText, licenseRating === rating && styles.ratingTextActive]}>
                      {rating}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>License Rating</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your license rating"
                placeholderTextColor="#AAA"
                value={licenseRating}
                onChangeText={setLicenseRating}
                editable={!loading}
              />
            </View>
          )}

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.label}>License number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter number"
                placeholderTextColor="#AAA"
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                editable={!loading}
              />
            </View>
            <View style={styles.halfInput}>
              <Text style={styles.label}>Expiration date</Text>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#AAA"
                value={licenseExpiry}
                onChangeText={formatLicenseExpiry}
                editable={!loading}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleComplete}
          disabled={loading}
        >
          <LinearGradient
            colors={['#7C5FDC', '#5B8CDB']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Profile</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D4E8F0',
  },
  headerBackground: {
    backgroundColor: '#D4E8F0',
    paddingTop: 60,
    paddingBottom: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    marginTop: -120,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImageWrapper: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 5,
    borderColor: '#FFFFFF',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7C5FDC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 10,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 14,
    zIndex: 1,
  },
  inputWithPadding: {
    paddingLeft: 44,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  disabledInput: {
    backgroundColor: '#E8EAED',
    color: '#666',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  quarterInput: {
    flex: 0.5,
  },
  licenseTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  licenseTypeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8EAED',
  },
  licenseTypeButtonActive: {
    backgroundColor: '#F0EBFC',
    borderColor: '#7C5FDC',
  },
  licenseTypeText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  licenseTypeTextActive: {
    color: '#7C5FDC',
  },
  ratingLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  ratingButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8EAED',
  },
  ratingButtonActive: {
    backgroundColor: '#F0EBFC',
    borderColor: '#7C5FDC',
  },
  ratingText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#999',
  },
  ratingTextActive: {
    color: '#7C5FDC',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CCC',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#7C5FDC',
    borderColor: '#7C5FDC',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#444',
    fontWeight: '500',
  },
  errorText: {
    color: '#E53935',
    fontSize: 14,
    marginHorizontal: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  saveButton: {
    marginHorizontal: 20,
    marginVertical: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#7C5FDC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  skipButton: {
    alignItems: 'center',
    marginBottom: 40,
  },
  skipText: {
    color: '#666',
    fontSize: 14,
  },
});
