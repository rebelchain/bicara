import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBicaraStore } from '../../src/context/BicaraStoreContext';
import { isValidSolanaAddress, truncateAddress } from '../../src/services/solana';
import { speakEyesFree } from '../../src/services/speech';
import type { VerifiedContact } from '../../src/services/supabase';

export default function ContactsScreen() {
  const {
    walletAddress,
    contacts,
    loadingContacts,
    storageMode,
    supabaseConfigured,
    syncWarning,
    addVerifiedContact,
    removeVerifiedContact,
    refreshAllData,
  } = useBicaraStore();

  const [nameInput, setNameInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

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
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Gate B · Verified Address Book</Text>
            <Text style={styles.title}>Contacts ({contacts.length})</Text>
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

        <Text style={styles.securityNote}>
          Voice alone can never add or alter saved addresses. Verify every Solana Devnet address
          manually below before saving — dynamic Scribe v2 keyterms update automatically.
        </Text>

        {!supabaseConfigured ? (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeText}>
              Supabase env not set in mobile/.env yet — running on local cache fallback. Add
              EXPO_PUBLIC_SUPABASE_URL &amp; EXPO_PUBLIC_SUPABASE_ANON_KEY to sync live to Supabase.
            </Text>
          </View>
        ) : null}

        {syncWarning ? (
          <View style={styles.noticeBox}>
            <Text style={styles.warnText}>Sync note: {syncWarning}</Text>
          </View>
        ) : null}

        {/* Add Verified Contact Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Add Verified Contact</Text>
            {walletAddress ? (
              <Pressable
                onPress={handleUseOwnWallet}
                accessibilityRole="button"
                accessibilityLabel="Fill with my connected Devnet wallet for self testing"
                style={styles.quickFillBtn}
              >
                <Text style={styles.quickFillText}>Self-Test Fill</Text>
              </Pressable>
            ) : null}
          </View>

          <TextInput
            value={nameInput}
            onChangeText={setNameInput}
            placeholder="Contact name (e.g. Ahmad)"
            placeholderTextColor="#64748B"
            style={styles.input}
            accessibilityLabel="Contact display name"
          />

          <TextInput
            value={addressInput}
            onChangeText={setAddressInput}
            placeholder="Solana Devnet Base58 address"
            placeholderTextColor="#64748B"
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
          {formSuccess ? <Text style={styles.okText}>{formSuccess}</Text> : null}
        </View>

        {/* Contact List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionLabel}>Saved Contacts</Text>
          {loadingContacts ? (
            <Text style={styles.emptyText}>Loading contacts...</Text>
          ) : contacts.length === 0 ? (
            <Text style={styles.emptyText}>
              No verified contacts yet. Add a contact above (or tap Self-Test Fill) so you can say
              &ldquo;Send 0.01 SOL to Ahmad&rdquo; on the Home screen.
            </Text>
          ) : (
            contacts.map((contact) => (
              <View key={contact.id} style={styles.contactRow}>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactAddr}>
                    {truncateAddress(contact.recipientAddress, 6, 4)} · ending{' '}
                    {contact.recipientAddress.slice(-4)}
                  </Text>
                </View>
                <View style={styles.contactActions}>
                  <Pressable
                    onPress={() => void handleHearContact(contact)}
                    accessibilityRole="button"
                    accessibilityLabel={`Hear details for ${contact.name}`}
                    style={styles.smallBtn}
                  >
                    <Text style={styles.smallBtnText}>Hear</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleDeleteContact(contact)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${contact.name}`}
                    style={styles.deleteBtn}
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
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
  safe: { flex: 1, backgroundColor: '#0B0D0E' },
  container: { padding: 20, gap: 14, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: { fontSize: 12, color: '#4ADE80', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: '#F8FAFC' },
  refreshBtn: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#14171A',
    borderWidth: 1,
    borderColor: '#262B30',
    justifyContent: 'center',
  },
  refreshBtnText: { color: '#4ADE80', fontSize: 12, fontWeight: '600' },
  securityNote: { fontSize: 12, color: '#94A3B8', lineHeight: 18 },
  noticeBox: {
    backgroundColor: '#1C1912',
    borderWidth: 1,
    borderColor: '#854D0E',
    borderRadius: 12,
    padding: 12,
  },
  noticeText: { color: '#FDE68A', fontSize: 12, lineHeight: 18 },
  warnText: { color: '#FCD34D', fontSize: 12, lineHeight: 18 },
  card: {
    backgroundColor: '#14171A',
    borderWidth: 1,
    borderColor: '#23282E',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  quickFillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  quickFillText: { color: '#93C5FD', fontSize: 11, fontWeight: '600' },
  input: {
    minHeight: 46,
    backgroundColor: '#0B0D0E',
    borderWidth: 1,
    borderColor: '#2A313A',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#F8FAFC',
    fontSize: 14,
  },
  monoInput: { fontFamily: 'monospace', fontSize: 12 },
  saveBtn: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#1F2937' },
  saveBtnText: { color: '#052E16', fontSize: 14, fontWeight: '700' },
  errorText: { color: '#FCA5A5', fontSize: 12 },
  okText: { color: '#86EFAC', fontSize: 12 },
  listSection: { gap: 10 },
  sectionLabel: { color: '#CBD5E1', fontSize: 13, fontWeight: '700' },
  emptyText: { color: '#64748B', fontSize: 13, lineHeight: 20 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#14171A',
    borderWidth: 1,
    borderColor: '#23282E',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  contactInfo: { flex: 1, gap: 4 },
  contactName: { color: '#F8FAFC', fontSize: 15, fontWeight: '700' },
  contactAddr: { color: '#94A3B8', fontSize: 12, fontFamily: 'monospace' },
  contactActions: { flexDirection: 'row', gap: 8 },
  smallBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
  },
  smallBtnText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
  deleteBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#2D161A',
    justifyContent: 'center',
  },
  deleteBtnText: { color: '#FCA5A5', fontSize: 12, fontWeight: '600' },
});
