import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Svg, { Rect, Path, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Camera, Save, ChevronDown, Search } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import Header from '@/components/Header';

// ─── Country data ─────────────────────────────────────────────────────────────

type Country = {
  name: string;
  dialCode: string;
};

const COUNTRIES: Country[] = [
  { name: 'United States',        dialCode: '+1'   },
  { name: 'United Kingdom',       dialCode: '+44'  },
  { name: 'United Arab Emirates', dialCode: '+971' },
  { name: 'Australia',            dialCode: '+61'  },
  { name: 'Canada',               dialCode: '+1'   },
  { name: 'France',               dialCode: '+33'  },
  { name: 'Germany',              dialCode: '+49'  },
  { name: 'New Zealand',          dialCode: '+64'  },
  { name: 'Romania',              dialCode: '+40'  },
  { name: 'South Africa',         dialCode: '+27'  },
  { name: 'Spain',                dialCode: '+34'  },
  { name: 'Switzerland',          dialCode: '+41'  },
  { name: 'Other',                dialCode: '+0'   },
];

// Crisp SVG flag components — each 28×20 viewport
function Flag({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.flagBox}>
      <Svg width={28} height={20} viewBox="0 0 28 20">{children}</Svg>
    </View>
  );
}

function FlagUS() {
  const stripeH = 20 / 13;
  return (
    <Flag>
      {Array.from({ length: 13 }).map((_, i) => (
        <Rect key={i} x={0} y={i * stripeH} width={28} height={stripeH}
          fill={i % 2 === 0 ? '#B22234' : '#FFFFFF'} />
      ))}
      <Rect x={0} y={0} width={12} height={stripeH * 7} fill="#3C3B6E" />
    </Flag>
  );
}
function FlagGB() {
  return (
    <Flag>
      <Rect width={28} height={20} fill="#012169" />
      {/* diagonals white */}
      <Path d="M0,0 L28,20 M28,0 L0,20" stroke="#FFFFFF" strokeWidth={4} />
      {/* diagonals red */}
      <Path d="M0,0 L28,20 M28,0 L0,20" stroke="#C8102E" strokeWidth={2.4} />
      {/* cross white */}
      <Path d="M14,0 V20 M0,10 H28" stroke="#FFFFFF" strokeWidth={6} />
      {/* cross red */}
      <Path d="M14,0 V20 M0,10 H28" stroke="#C8102E" strokeWidth={3.6} />
    </Flag>
  );
}
function FlagAE() {
  return (
    <Flag>
      <Rect x={0} y={0} width={28} height={6.67} fill="#009A44" />
      <Rect x={0} y={6.67} width={28} height={6.67} fill="#FFFFFF" />
      <Rect x={0} y={13.33} width={28} height={6.67} fill="#000000" />
      <Rect x={0} y={0} width={8} height={20} fill="#EF3340" />
    </Flag>
  );
}
function FlagAU() {
  return (
    <Flag>
      <Rect width={28} height={20} fill="#00008B" />
      <Path d="M0,0 L13,10 M13,0 L0,10" stroke="#FFFFFF" strokeWidth={3} />
      <Path d="M0,0 L13,10 M13,0 L0,10" stroke="#FF0000" strokeWidth={1.8} />
      <Path d="M6.5,0 V10 M0,5 H13" stroke="#FFFFFF" strokeWidth={5} />
      <Path d="M6.5,0 V10 M0,5 H13" stroke="#FF0000" strokeWidth={3} />
    </Flag>
  );
}
function FlagCA() {
  return (
    <Flag>
      <Rect x={0}  y={0} width={7}  height={20} fill="#FF0000" />
      <Rect x={7}  y={0} width={14} height={20} fill="#FFFFFF" />
      <Rect x={21} y={0} width={7}  height={20} fill="#FF0000" />
      {/* maple leaf simplified */}
      <Path d="M14,3 L15.2,6.5 H19 L16,8.5 L17,12 L14,10 L11,12 L12,8.5 L9,6.5 H12.8 Z" fill="#FF0000" />
      <Rect x={13} y={12} width={2} height={4} fill="#FF0000" />
    </Flag>
  );
}
function FlagFR() {
  return (
    <Flag>
      <Rect x={0}       y={0} width={9.33} height={20} fill="#002395" />
      <Rect x={9.33}    y={0} width={9.33} height={20} fill="#EDEDED" />
      <Rect x={18.67}   y={0} width={9.33} height={20} fill="#ED2939" />
    </Flag>
  );
}
function FlagDE() {
  return (
    <Flag>
      <Rect y={0}     width={28} height={6.67} fill="#000000" />
      <Rect y={6.67}  width={28} height={6.67} fill="#DD0000" />
      <Rect y={13.33} width={28} height={6.67} fill="#FFCE00" />
    </Flag>
  );
}
function FlagNZ() {
  return (
    <Flag>
      <Rect width={28} height={20} fill="#00247D" />
      <Path d="M0,0 L13,10 M13,0 L0,10" stroke="#FFFFFF" strokeWidth={3} />
      <Path d="M6.5,0 V10 M0,5 H13" stroke="#FFFFFF" strokeWidth={5} />
      <Path d="M6.5,0 V10 M0,5 H13" stroke="#CC0000" strokeWidth={3} />
    </Flag>
  );
}
function FlagRO() {
  return (
    <Flag>
      <Rect x={0}     y={0} width={9.33} height={20} fill="#002B7F" />
      <Rect x={9.33}  y={0} width={9.33} height={20} fill="#FCD116" />
      <Rect x={18.67} y={0} width={9.33} height={20} fill="#CE1126" />
    </Flag>
  );
}
function FlagZA() {
  return (
    <Flag>
      <Rect width={28} height={20} fill="#FFFFFF" />
      <Rect y={0}  width={28} height={6.67} fill="#007A4D" />
      <Rect y={13.33} width={28} height={6.67} fill="#001489" />
      <Path d="M0,0 L11,10 L0,20 Z" fill="#000000" />
      <Path d="M0,2.2 L8.8,10 L0,17.8 Z" fill="#FFB81C" />
      <Path d="M0,5 L6,10 L0,15 Z" fill="#007A4D" />
      <Rect y={8} width={28} height={4} fill="#E03C31" />
    </Flag>
  );
}
function FlagES() {
  return (
    <Flag>
      <Rect y={0}    width={28} height={5}  fill="#AA151B" />
      <Rect y={5}    width={28} height={10} fill="#F1BF00" />
      <Rect y={15}   width={28} height={5}  fill="#AA151B" />
    </Flag>
  );
}
function FlagCH() {
  return (
    <Flag>
      <Rect width={28} height={20} fill="#D52B1E" />
      <Rect x={11} y={4}  width={6} height={12} fill="#FFFFFF" />
      <Rect x={5}  y={8}  width={18} height={4}  fill="#FFFFFF" />
    </Flag>
  );
}
function FlagWorld() {
  return (
    <Flag>
      <Rect width={28} height={20} fill="#E8F4FD" />
      <Circle cx={14} cy={10} r={7} fill="none" stroke="#4A90D9" strokeWidth={1.2} />
      <Path d="M14,3 Q17,10 14,17 Q11,10 14,3Z" fill="none" stroke="#4A90D9" strokeWidth={0.8} />
      <Path d="M7,10 H21 M8,6.5 Q14,8 20,6.5 M8,13.5 Q14,12 20,13.5" stroke="#4A90D9" strokeWidth={0.8} />
    </Flag>
  );
}

const FLAG_COMPONENTS: Record<string, React.ReactNode> = {
  'United States': <FlagUS />,
  'United Kingdom': <FlagGB />,
  'United Arab Emirates': <FlagAE />,
  'Australia': <FlagAU />,
  'Canada': <FlagCA />,
  'France': <FlagFR />,
  'Germany': <FlagDE />,
  'New Zealand': <FlagNZ />,
  'Romania': <FlagRO />,
  'South Africa': <FlagZA />,
  'Spain': <FlagES />,
  'Switzerland': <FlagCH />,
  'Other': <FlagWorld />,
};

function CountryFlag({ name }: { name: string }) {
  return FLAG_COMPONENTS[name] ?? <FlagWorld />;
}

// ─── Inline country dropdown ──────────────────────────────────────────────────

function CountryDropdown({
  selected,
  onSelect,
  showDialCode = false,
}: {
  selected: Country;
  onSelect: (c: Country) => void;
  showDialCode?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dialCode.includes(search)
  );

  return (
    <View>
      <TouchableOpacity
        style={styles.inputBox}
        onPress={() => { setOpen(!open); setSearch(''); }}
        activeOpacity={0.7}
      >
        <CountryFlag name={selected.name} />
        {showDialCode ? (
          <Text style={styles.dialCodeText}>{selected.dialCode}</Text>
        ) : (
          <Text style={[styles.input, { color: '#666' }]}>{selected.name}</Text>
        )}
        <ChevronDown
          size={15}
          color="#888"
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          {/* search bar */}
          <View style={styles.dropdownSearch}>
            <Search size={15} color="#AAA" />
            <TextInput
              style={styles.dropdownSearchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search…"
              placeholderTextColor="#C0C0C0"
              autoFocus
            />
          </View>
          {/* list */}
          {filtered.map((c) => (
            <TouchableOpacity
              key={c.name}
              style={[styles.dropdownRow, selected.name === c.name && styles.dropdownRowActive]}
              onPress={() => { onSelect(c); setOpen(false); setSearch(''); }}
            >
              <CountryFlag name={c.name} />
              <Text style={styles.dropdownRowName}>{c.name}</Text>
              <Text style={styles.dropdownRowDial}>{c.dialCode}</Text>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <Text style={styles.dropdownEmpty}>No results</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Phone field with inline dial-code picker ─────────────────────────────────

function PhoneField({
  label,
  country,
  phone,
  onCountrySelect,
  onPhoneChange,
}: {
  label: string;
  country: Country;
  phone: string;
  onCountrySelect: (c: Country) => void;
  onPhoneChange: (t: string) => void;
}) {
  const [dialOpen, setDialOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dialCode.includes(search)
  );

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputBox}>
        <TouchableOpacity
          style={styles.dialCodeBtn}
          onPress={() => { setDialOpen(!dialOpen); setSearch(''); }}
        >
          <CountryFlag name={country.name} />
          <Text style={styles.dialCodeText}>{country.dialCode}</Text>
          <ChevronDown size={13} color="#888" />
        </TouchableOpacity>
        <View style={styles.phoneDivider} />
        <TextInput
          style={[styles.input, styles.phoneInput]}
          value={phone}
          onChangeText={onPhoneChange}
          placeholder="123456780"
          placeholderTextColor="#C0C0C0"
          keyboardType="phone-pad"
        />
      </View>

      {dialOpen && (
        <View style={styles.dropdown}>
          <View style={styles.dropdownSearch}>
            <Search size={15} color="#AAA" />
            <TextInput
              style={styles.dropdownSearchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search…"
              placeholderTextColor="#C0C0C0"
              autoFocus
            />
          </View>
          {filtered.map((c) => (
            <TouchableOpacity
              key={c.name}
              style={[styles.dropdownRow, country.name === c.name && styles.dropdownRowActive]}
              onPress={() => { onCountrySelect(c); setDialOpen(false); setSearch(''); }}
            >
              <CountryFlag name={c.name} />
              <Text style={styles.dropdownRowName}>{c.name}</Text>
              <Text style={styles.dropdownRowDial}>{c.dialCode}</Text>
            </TouchableOpacity>
          ))}
          {filtered.length === 0 && (
            <Text style={styles.dropdownEmpty}>No results</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Small reusable field ─────────────────────────────────────────────────────

function FieldLabel({ label }: { label: string }) {
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function PlainField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
  suffix,
  rightIcon,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  editable?: boolean;
  suffix?: string;
  rightIcon?: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <FieldLabel label={label} />
      <View style={[styles.inputBox, !editable && styles.inputBoxDisabled]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C0C0C0"
          keyboardType={keyboardType}
          editable={editable}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
        {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
        {rightIcon ? <View style={styles.inputRightIcon}>{rightIcon}</View> : null}
      </View>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string>('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nickname, setNickname] = useState('');
  const [useNickname, setUseNickname] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [country, setCountry] = useState<Country>(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactEmail, setEmergencyContactEmail] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [emergencyCountry, setEmergencyCountry] = useState<Country>(COUNTRIES[0]);
  const [licenseType, setLicenseType] = useState('USPA');
  const [licenseRating, setLicenseRating] = useState('A');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [customerDocId, setCustomerDocId] = useState('');

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'customers'), where('accountId', '==', user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0].data();
        setCustomerDocId(snap.docs[0].id);
        setFirstName(d.firstName || '');
        setLastName(d.lastName || '');
        setNickname(d.nickname || '');
        setUseNickname(d.useNickname || false);
        setDateOfBirth(d.dateOfBirth || '');
        setHeight(d.height?.toString() || '');
        setWeight(d.weight?.toString() || '');

        if (d.country) {
          const found = COUNTRIES.find((c) => c.name === d.country);
          if (found) setCountry(found);
        }
        setPhone(d.phone || '');
        setEmergencyContactName(d.emergency?.name || '');
        setEmergencyContactEmail(d.emergency?.email || '');
        setEmergencyContactPhone(d.emergency?.phone || '');
        if (d.emergency?.dialCode) {
          const found = COUNTRIES.find((c) => c.dialCode === d.emergency.dialCode);
          if (found) setEmergencyCountry(found);
        }

        if (d.license) {
          const m = d.license.match(/^([^:]+):\s*([A-D])\s*-\s*(.+)$/);
          if (m) {
            setLicenseType(m[1].trim());
            setLicenseRating(m[2].trim());
            setLicenseNumber(m[3].trim());
          } else {
            const parts = d.license.split('-');
            if (parts.length > 1) {
              setLicenseType(parts[0].trim());
              setLicenseNumber(parts.slice(1).join('-').trim());
            }
          }
        }
        if (d.stats?.licenses?.length > 0 && !d.license) {
          setLicenseRating(d.stats.licenses[0]);
        }
        setLicenseExpiry(d.licenseExpiry || '');
        setSavedSnapshot(JSON.stringify({
          firstName: d.firstName || '',
          lastName: d.lastName || '',
          nickname: d.nickname || '',
          useNickname: d.useNickname || false,
          dateOfBirth: d.dateOfBirth || '',
          height: d.height?.toString() || '',
          weight: d.weight?.toString() || '',
          country: d.country || COUNTRIES[0].name,
          phone: d.phone || '',
          emergencyContactName: d.emergency?.name || '',
          emergencyContactPhone: d.emergency?.phone || '',
          emergencyCountry: d.emergency?.dialCode || COUNTRIES[0].dialCode,
          licenseType: (() => { const m = (d.license||'').match(/^([^:]+):/); return m ? m[1].trim() : 'USPA'; })(),
          licenseRating: (() => { const m = (d.license||'').match(/:\s*([A-D])\s*-/); return m ? m[1].trim() : 'A'; })(),
          licenseNumber: (() => { const m = (d.license||'').match(/[A-D]\s*-\s*(.+)$/); return m ? m[1].trim() : ''; })(),
          licenseExpiry: d.licenseExpiry || '',
        }));
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const currentSnapshot = () => JSON.stringify({
    firstName, lastName, nickname, useNickname, dateOfBirth,
    height, weight, country: country.name, phone,
    emergencyContactName, emergencyContactPhone,
    emergencyCountry: emergencyCountry.dialCode,
    licenseType, licenseRating, licenseNumber, licenseExpiry,
  });

  const hasChanges = savedSnapshot !== '' && currentSnapshot() !== savedSnapshot;

  const formatDob = (text: string) => {
    const c = text.replace(/\D/g, '').slice(0, 8);
    // Only insert slashes after the user has typed enough digits, never append a trailing slash
    let f = c;
    if (c.length > 4) f = c.slice(0, 2) + '/' + c.slice(2, 4) + '/' + c.slice(4);
    else if (c.length > 2) f = c.slice(0, 2) + '/' + c.slice(2);
    setDateOfBirth(f);
  };

  const formatExpiry = (text: string) => {
    const c = text.replace(/\D/g, '').slice(0, 8);
    let f = c;
    if (c.length > 4) f = c.slice(0, 2) + '/' + c.slice(2, 4) + '/' + c.slice(4);
    else if (c.length > 2) f = c.slice(0, 2) + '/' + c.slice(2);
    setLicenseExpiry(f);
  };

  const handleSave = async () => {
    if (!customerDocId || !user) return;
    setSaving(true);
    try {
      const payload = {
        firstName, lastName,
        nickname: nickname || firstName,
        useNickname, dateOfBirth,
        height: height ? parseFloat(height) : 0,
        weight: weight ? parseFloat(weight) : 0,
        country: country.name,
        dialCode: country.dialCode,
        phone,
        profileComplete: true,
        emergency: {
          name: emergencyContactName,
          email: emergencyContactEmail,
          phone: emergencyContactPhone,
          dialCode: emergencyCountry.dialCode,
          country: emergencyCountry.name,
        },
        license: licenseNumber ? `${licenseType}: ${licenseRating} - ${licenseNumber}` : '',
        licenseExpiry,
        'stats.licenses': [licenseRating],
      };

      await updateDoc(doc(db, 'customers', customerDocId), payload);

      const snap = await getDocs(query(collection(db, 'customers'), where('accountId', '==', user.uid)));
      if (!snap.empty) {
        const customerId = snap.docs[0].data().customerId;
        const dzSnap = await getDocs(collection(db, 'dropzones'));
        for (const dzDoc of dzSnap.docs) {
          const cq = query(
            collection(db, 'dropzones', dzDoc.id, 'customers'),
            where('customerId', '==', customerId)
          );
          const cSnap = await getDocs(cq);
          if (!cSnap.empty) {
            await updateDoc(
              doc(db, 'dropzones', dzDoc.id, 'customers', cSnap.docs[0].id),
              {
                firstName, lastName,
                nickname: nickname || firstName,
                useNickname, dateOfBirth,
                height: height ? parseFloat(height) : 0,
                weight: weight ? parseFloat(weight) : 0,
                country: country.name,
                phone,
                license: licenseNumber ? `${licenseType}: ${licenseRating} - ${licenseNumber}` : '',
                licenseExpiry,
                updatedAt: new Date().toISOString(),
              }
            );
          }
        }
      }
      setSavedSnapshot(currentSnapshot());
      router.back();
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const displayName = useNickname && nickname ? nickname : `${firstName} ${lastName}`.trim();
  const handle = nickname ? `@${nickname}` : (firstName ? `@${firstName.toLowerCase()}` : '@—');

  if (loading) {
    return (
      <View style={styles.screen}>
        <Header title="Profile" showBack showNotifications />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header title="Profile" showBack showNotifications />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── avatar + name ── */}
        <View style={styles.hero}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {(firstName[0] || '?').toUpperCase()}{(lastName[0] || '').toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity style={styles.cameraBtn}>
              <Camera size={15} color="#FFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroName}>{displayName || 'Your Name'}</Text>
          <View style={styles.handlePill}>
            <Text style={styles.handleText}>{handle}</Text>
          </View>
        </View>

        {/* ── Personal Information ── */}
        <SectionCard title="Personal Information">
          <View style={styles.rowGap}>
            <View style={styles.halfField}>
              <FieldLabel label="First Name" />
              <View style={styles.inputBox}>
                <TextInput style={styles.input} value={firstName} onChangeText={setFirstName}
                  placeholder="Charles" placeholderTextColor="#C0C0C0" />
              </View>
            </View>
            <View style={styles.halfField}>
              <FieldLabel label="Last Name" />
              <View style={styles.inputBox}>
                <TextInput style={styles.input} value={lastName} onChangeText={setLastName}
                  placeholder="Xavier" placeholderTextColor="#C0C0C0" />
              </View>
            </View>
          </View>

          <PlainField label="Nickname" value={nickname} onChangeText={setNickname} placeholder="thecharles" />

          <TouchableOpacity style={styles.checkRow} onPress={() => setUseNickname(!useNickname)}>
            <View style={[styles.checkbox, useNickname && styles.checkboxOn]}>
              {useNickname && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkLabel}>Display nickname only</Text>
          </TouchableOpacity>

          <PlainField
            label="Date Of Birth"
            value={dateOfBirth}
            onChangeText={formatDob}
            placeholder="DD/MM/YYYY"
            keyboardType="numeric"
          />

          <View style={[styles.rowGap, { marginBottom: 0 }]}>
            <View style={styles.halfField}>
              <FieldLabel label="Height" />
              <View style={styles.inputBox}>
                <TextInput style={[styles.input, { flex: 1 }]} value={height}
                  onChangeText={(t) => setHeight(t.replace(/\D/g, '').slice(0, 5))}
                  placeholder="170" placeholderTextColor="#C0C0C0" keyboardType="numeric" maxLength={5} />
                <Text style={styles.inputSuffix}>CM</Text>
              </View>
            </View>
            <View style={styles.halfField}>
              <FieldLabel label="Weight" />
              <View style={styles.inputBox}>
                <TextInput style={[styles.input, { flex: 1 }]} value={weight}
                  onChangeText={(t) => setWeight(t.replace(/\D/g, '').slice(0, 5))}
                  placeholder="70" placeholderTextColor="#C0C0C0" keyboardType="numeric" maxLength={5} />
                <Text style={styles.inputSuffix}>KG</Text>
              </View>
            </View>
          </View>
        </SectionCard>

        {/* ── Contact Information ── */}
        <SectionCard title="Contact Information">
          <PlainField label="Email" value={user?.email || ''} editable={false} placeholder="email@example.com" />

          <View style={styles.fieldWrap}>
            <FieldLabel label="Country" />
            <CountryDropdown selected={country} onSelect={setCountry} />
          </View>

          <PhoneField
            label="Phone"
            country={country}
            phone={phone}
            onCountrySelect={setCountry}
            onPhoneChange={setPhone}
          />
        </SectionCard>

        {/* ── Emergency Contact ── */}
        <SectionCard title="Emergency Contact form">
          <PlainField label="Contact Name" value={emergencyContactName} onChangeText={setEmergencyContactName} placeholder="Sajal Jahan" />
          <PhoneField
            label="Phone"
            country={emergencyCountry}
            phone={emergencyContactPhone}
            onCountrySelect={setEmergencyCountry}
            onPhoneChange={setEmergencyContactPhone}
          />
        </SectionCard>

        {/* ── License Information ── */}
        <SectionCard title="License Information">
          <View style={styles.segmentWrap}>
            {['USPA', 'Other'].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.segmentBtn, licenseType === t && styles.segmentBtnActive]}
                onPress={() => setLicenseType(t)}
              >
                <Text style={[styles.segmentText, licenseType === t && styles.segmentTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <PlainField label="License Number" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="AET045AFEA" />

          <View style={[styles.rowGap, { marginBottom: 0 }]}>
            <View style={styles.halfField}>
              <FieldLabel label="License Rating" />
              <View style={styles.inputBox}>
                <TextInput style={styles.input} value={licenseRating} onChangeText={setLicenseRating}
                  placeholder="A" placeholderTextColor="#C0C0C0" maxLength={4} />
              </View>
            </View>
            <View style={styles.halfField}>
              <FieldLabel label="Expiration Date" />
              <View style={styles.inputBox}>
                <TextInput style={styles.input} value={licenseExpiry} onChangeText={formatExpiry}
                  placeholder="DD/MM/YYYY" placeholderTextColor="#C0C0C0" keyboardType="numeric" maxLength={10} />
              </View>
            </View>
          </View>
        </SectionCard>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.saveBtn, (!hasChanges || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!hasChanges || saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Update Profile</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#D4E8F0' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  hero: { alignItems: 'center', paddingTop: 12, paddingBottom: 28 },
  avatarWrap: { position: 'relative', marginBottom: 14 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 22,
    backgroundColor: '#B0C8D8', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#FFF',
  },
  avatarInitials: { fontSize: 32, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  cameraBtn: {
    position: 'absolute', bottom: -4, right: -4,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  heroName: { fontSize: 26, fontWeight: '800', color: '#1A1A1A', marginBottom: 8 },
  handlePill: { backgroundColor: '#3B82F6', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 6 },
  handleText: { color: '#FFF', fontSize: 14, fontWeight: '600' },

  card: {
    backgroundColor: '#FFF', borderRadius: 22,
    marginHorizontal: 16, marginBottom: 14, padding: 22,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 10, elevation: 2,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },

  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, color: '#1A1A1A', fontWeight: '400', marginBottom: 8 },

  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#D8D8D8',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 0,
    minHeight: 54, overflow: 'hidden',
  },
  inputBoxDisabled: { backgroundColor: '#EAEBEC', borderColor: '#E2E2E2' },
  input: { fontSize: 15, color: '#1A1A1A', flex: 1, paddingVertical: Platform.OS === 'android' ? 14 : 0 },
  inputSuffix: { fontSize: 14, color: '#C0C0C0', fontWeight: '500', marginLeft: 8, flexShrink: 0 },
  inputRightIcon: { marginLeft: 8, flexShrink: 0 },
  inputMultiline: { minHeight: 72, paddingTop: 12 },

  rowGap: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  halfField: { flex: 1, minWidth: 0 },

  // date picker modal
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    borderColor: '#D0D0D0', backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxOn: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  checkmark: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  checkLabel: { fontSize: 16, color: '#1A1A1A', fontWeight: '400' },

  // square flag wrapper — clips the emoji to a neat rectangle
  flagBox: {
    width: 28,
    height: 20,
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
  },
  // phone / dial-code
  dialCodeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 10 },
  dialCodeText: { fontSize: 14, color: '#555', fontWeight: '500' },
  phoneDivider: { width: 1, height: 24, backgroundColor: '#D8D8D8', marginRight: 12 },
  phoneInput: { flex: 1 },

  // inline dropdown
  dropdown: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 999,
    maxHeight: 280,
    overflow: 'hidden',
  },
  dropdownSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  dropdownSearchInput: { flex: 1, fontSize: 14, color: '#1A1A1A' },
  dropdownRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
  },
  dropdownRowActive: { backgroundColor: '#F5F9FF' },
  dropdownRowName: { flex: 1, fontSize: 14, color: '#1A1A1A' },
  dropdownRowDial: { fontSize: 13, color: '#AAA' },
  dropdownEmpty: { padding: 16, textAlign: 'center', color: '#AAA', fontSize: 14 },

  // segmented
  segmentWrap: {
    flexDirection: 'row', backgroundColor: '#F0F1F3',
    borderRadius: 16, padding: 4, marginBottom: 18,
  },
  segmentBtn: { flex: 1, paddingVertical: 13, borderRadius: 13, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#1A1A1A' },
  segmentText: { fontSize: 15, fontWeight: '600', color: '#B0B0B0' },
  segmentTextActive: { color: '#FFF' },

  // bottom bar
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#7C5CBF', borderRadius: 50, paddingVertical: 17,
    shadowColor: '#7C5CBF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  saveBtnDisabled: { backgroundColor: '#C4B3DF', shadowOpacity: 0, elevation: 0 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
});
