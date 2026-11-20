import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useBicaraStore } from '../../src/context/BicaraStoreContext';
import { isValidSolanaAddress, truncateAddress } from '../../src/services/solana';
import { speakEyesFree } from '../../src/services/speech';
import type { VerifiedContact } from '../../src/services/supabase';

function getInitial(name: string): string {
  const clean = name.trim();
  return clean ? clean[0].toUpperCase() : '?';
}

export default function ContactsScreen() {
  const router = useRouter();
  const {
    walletAddress,
    contacts,
    loadingContacts,
    storageMode,
    supabaseConfigured,
    syncWarning,
    addVerifiedContact,
    removeVerifiedContact,
    setPendingSendRecipient,
    refreshAllData,
  } = useBicaraStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const filteredContacts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) || c.recipientAddress.toLowerCase().includes(q)
    );
  }, [contacts, searchQuery]);

  const handleUseOwnWallet = () => {
    if (!walletAddress) {
      setFormError('Connect your Solflare wallet on the Home tab first.');
      return;
    }
    if (!nameInput.trim()) {
      setNameInput('Ahmad');
    }
    setAddressInput(walletAddress);
    setFormError(null);
  };

  const handleSaveContact = async () => {
    setFormError(null);
    setFormSuccess(null);

    const cleanName = nameInput.trim();
    const cleanAddr = addressInput.trim();

    if (!walletAddress) {
      const msg = 'Connect your Solflare wallet first before saving contacts.';
      setFormError(msg);
      await speakEyesFree(msg, 'error', false);
      return;
    }
    if (!cleanName) {
      const msg = 'Enter a contact name first.';
      setFormError(msg);
      await speakEyesFree(msg, 'error', false);
      return;
    }
    if (!isValidSolanaAddress(cleanAddr)) {
      const msg = 'Invalid Solana Base58 address. Please check the recipient public key.';
      setFormError(msg);
      await speakEyesFree(msg, 'error', false);
      return;
    }

    setSaving(true);
    try {
      const saved = await addVerifiedContact(cleanName, cleanAddr);
      setNameInput('');
      setAddressInput('');
      setShowAddForm(false);
      const msg = `Verified contact ${saved.name} saved, wallet ending ${saved.recipientAddress.slice(-4)}.`;
      setFormSuccess(msg);
      await speakEyesFree(msg, 'success', true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save contact.';
      setFormError(msg);
      await speakEyesFree(msg, 'error', false);
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSend = async (contact: VerifiedContact) => {
    setPendingSendRecipient(contact);
    await speakEyesFree(
      `Selected ${contact.name}, wallet ending ${contact.recipientAddress.slice(-4)}. Enter amount to send.`,
      'tick',
      false
    );
    router.push('/(tabs)');
  };

  const handleHearContact = async (contact: VerifiedContact) => {
    const text = `Verified contact ${contact.name}. Solana address ending ${contact.recipientAddress.slice(-4)}.`;
    await speakEyesFree(text, 'tick', false);
  };

  const handleDeleteContact = async (contact: VerifiedContact) => {
    await removeVerifiedContact(contact);
    await speakEyesFree(`Removed contact ${contact.name}.`, 'tick', false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Verified Address Book</Text>
            <Text style={styles.title}>Contacts</Text>
          </View>
          <Pressable
            onPress={() => void refreshAllData()}
            accessibilityRole="button"
            accessibilityLabel="Refresh contacts"
            style={styles.refreshBtn}
          >
            <Text style={styles.refreshBtnText}>
              {storageMode === 'supabase' ? 'Supabase' : 'Local'} ↻
            </Text>
          </Pressable>
        </View>

        {/* Search Bar (Aligned to 02-select-recipient) */}
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search name or Solana address"
          placeholderTextColor="#71717A"
          style={styles.searchInput}
          accessibilityLabel="Search saved contacts by name or Solana address"
        />

        {/* Action Strip */}
        <View style={styles.actionRow}>
          <Pressable
            onPress={() => {
              setShowAddForm((prev) => !prev);
              setFormError(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={showAddForm ? 'Close new contact form' : 'Add a new verified contact'}
            style={styles.newContactBtn}
          >
            <Text style={styles.newContactBtnText}>
              {showAddForm ? 'Close Form' : '+ New Contact'}
            </Text>
          </Pressable>
          {walletAddress ? (
            <Pressable
              onPress={() => {
                setShowAddForm(true);
                handleUseOwnWallet();
              }}
              accessibilityRole="button"
              accessibilityLabel="Fill with connected wallet for self testing"
              style={styles.selfFillBtn}
            >
              <Text style={styles.selfFillBtnText}>Self-Test Fill</Text>
            </Pressable>
          ) : null}
        </View>

        <Text style={styles.securityNote}>
          Voice alone can never add or alter saved addresses. Verify every recipient manually
          before saving — spoken recognition keyterms update automatically.
        </Text>

        {!supabaseConfigured ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Running in local cache mode. Add EXPO_PUBLIC_SUPABASE_URL &amp;
              EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env to sync live to Supabase.
            </Text>
          </View>
        ) : null}

        {syncWarning ? (
          <View style={styles.noticeBox}>
            <Text style={styles.warnText}>Sync note: {syncWarning}</Text>
          </View>
        ) : null}

        {formSuccess ? (
          <View style={styles.successBanner}>
            <Text style={styles.okText}>{formSuccess}</Text>
          </View>
        ) : null}

        {/* Expandable Add Verified Contact Card */}
        {showAddForm ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Verify &amp; Add Contact</Text>

            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Contact name (e.g. Ahmad)"
              placeholderTextColor="#71717A"
              style={styles.input}
              accessibilityLabel="Contact display name"
            />

            <TextInput
              value={addressInput}
              onChangeText={setAddressInput}
              placeholder="Solana Devnet Base58 address"
              placeholderTextColor="#71717A"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, styles.monoInput]}
              accessibilityLabel="Solana Devnet recipient address"
            />

            <Pressable
              onPress={() => void handleSaveContact()}
              disabled={saving || !walletAddress}
              accessibilityRole="button"
              accessibilityLabel="Verify and save contact"
              style={[
                styles.saveBtn,
                (!walletAddress || saving) && styles.saveBtnDisabled,
              ]}
            >
              <Text style={styles.saveBtnText}>
                {saving
                  ? 'Saving...'
                  : walletAddress
                    ? 'Verify & Save Contact'
                    : 'Connect Wallet on Home First'}
              </Text>
            </Pressable>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          </View>
        ) : null}

        {/* Saved Contacts List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionLabel}>
            Saved Contacts ({filteredContacts.length})
          </Text>
          {loadingContacts ? (
            <Text style={styles.emptyText}>Loading contacts...</Text>
          ) : filteredContacts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {contacts.length === 0
                  ? 'No verified contacts yet. Tap "+ New Contact" (or "Self-Test Fill") so you can send by tap or say "Send 0.01 SOL to Ahmad".'
                  : 'No contacts match your search.'}
              </Text>
            </View>
          ) : (
            filteredContacts.map((contact) => (
              <View key={contact.id} style={styles.contactCard}>
                <Pressable
                  onPress={() => void handleQuickSend(contact)}
                  accessibilityRole="button"
                  accessibilityLabel={`Send to ${contact.name}, verified contact ending ${contact.recipientAddress.slice(-4)}`}
                  style={styles.contactTopRow}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{getInitial(contact.name)}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactAddr}>
                      Verified · {truncateAddress(contact.recipientAddress, 6, 4)}
                    </Text>
                  </View>
                  <View style={styles.sendPill}>
                    <Text style={styles.sendPillText}>Send →</Text>
                  </View>
                </Pressable>

                <View style={styles.contactFooter}>
                  <Pressable
                    onPress={() => void handleHearContact(contact)}
                    accessibilityRole="button"
                    accessibilityLabel={`Hear address details for ${contact.name}`}
                    style={styles.smallBtn}
                  >
                    <Text style={styles.smallBtnText}>Hear Address</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleDeleteContact(contact)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${contact.name}`}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F0F0F' },
  container: { padding: 20, gap: 14, paddingBottom: 36 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: { fontSize: 12, color: '#CCFF00', fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: '#F4F4F5', letterSpacing: -0.4 },
  refreshBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.25)',
    justifyContent: 'center',
  },
  refreshBtnText: { color: '#CCFF00', fontSize: 12, fontWeight: '700' },
  searchInput: {
    minHeight: 52,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    paddingHorizontal: 16,
    color: '#F4F4F5',
    fontSize: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  newContactBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(204, 255, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newContactBtnText: { color: '#CCFF00', fontSize: 14, fontWeight: '800' },
  selfFillBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selfFillBtnText: { color: '#F4F4F5', fontSize: 14, fontWeight: '700' },
  securityNote: { fontSize: 12, color: '#A1A1AA', lineHeight: 18 },
  noticeBox: {
    backgroundColor: '#1C1912',
    borderWidth: 1,
    borderColor: '#854D0E',
    borderRadius: 16,
    padding: 12,
  },
  noticeText: { color: '#FDE68A', fontSize: 12, lineHeight: 18 },
  warnText: { color: '#FCD34D', fontSize: 12, lineHeight: 18 },
  successBanner: {
    backgroundColor: '#161C12',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.35)',
    borderRadius: 16,
    padding: 12,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.28)',
    borderRadius: 22,
    padding: 16,
    gap: 10,
  },
  cardTitle: { color: '#F4F4F5', fontSize: 16, fontWeight: '800' },
  input: {
    minHeight: 50,
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    borderRadius: 14,
    paddingHorizontal: 14,
    color: '#F4F4F5',
    fontSize: 14,
  },
  monoInput: { fontFamily: 'monospace', fontSize: 12 },
  saveBtn: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: '#CCFF00',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  saveBtnDisabled: { backgroundColor: '#27272A' },
  saveBtnText: { color: '#0F0F0F', fontSize: 14, fontWeight: '800' },
  errorText: { color: '#FCA5A5', fontSize: 12 },
  okText: { color: '#CCFF00', fontSize: 12, fontWeight: '600' },
  listSection: { gap: 10 },
  sectionLabel: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  emptyCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    padding: 18,
  },
  emptyText: { color: '#A1A1AA', fontSize: 13, lineHeight: 20 },
  contactCard: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 20,
    padding: 14,
    gap: 12,
  },
  contactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#F4F4F5', fontSize: 18, fontWeight: '800' },
  contactInfo: { flex: 1, gap: 3 },
  contactName: { color: '#F4F4F5', fontSize: 16, fontWeight: '700' },
  contactAddr: { color: '#A1A1AA', fontSize: 12, fontFamily: 'monospace' },
  sendPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#CCFF00',
  },
  sendPillText: { color: '#0F0F0F', fontSize: 12, fontWeight: '800' },
  contactFooter: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  smallBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallBtnText: { color: '#F4F4F5', fontSize: 12, fontWeight: '600' },
  deleteBtn: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#241417',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: { color: '#FCA5A5', fontSize: 12, fontWeight: '600' },
});
