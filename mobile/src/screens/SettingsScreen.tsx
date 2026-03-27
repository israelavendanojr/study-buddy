import React, { useState } from 'react'
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { useUser, useAuth } from '@clerk/clerk-expo'
import { colors, radius } from '../theme'

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M15 18l-6-6 6-6" stroke={colors.foreground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  )
}

function PersonIcon() {
  return (
    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={colors.muted} strokeWidth={1.5} />
      <Path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={colors.muted} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  )
}

function EyeIcon({ visible }: { visible: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      {visible ? (
        <>
          <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke={colors.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="12" cy="12" r="3" stroke={colors.muted} strokeWidth={1.8} />
        </>
      ) : (
        <>
          <Path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" stroke={colors.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </Svg>
  )
}

export default function SettingsScreen() {
  const navigation = useNavigation<StackNavigationProp<any>>()
  const { user } = useUser()
  const { signOut } = useAuth()

  const displayName = user?.username ?? user?.firstName ?? 'User'
  const email = user?.primaryEmailAddress?.emailAddress ?? '—'
  const initials = displayName.slice(0, 2).toUpperCase()

  // Password modal state
  const [pwModalVisible, setPwModalVisible] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  function openPasswordModal() {
    setCurrentPw('')
    setNewPw('')
    setConfirmPw('')
    setPwError('')
    setPwSuccess(false)
    setPwModalVisible(true)
  }

  async function handleChangePassword() {
    setPwError('')
    if (!currentPw || !newPw || !confirmPw) {
      setPwError('All fields are required.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match.')
      return
    }
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.')
      return
    }
    setPwLoading(true)
    try {
      await user?.updatePassword({ currentPassword: currentPw, newPassword: newPw })
      setPwSuccess(true)
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage ?? err?.message ?? 'Failed to update password.'
      setPwError(msg)
    } finally {
      setPwLoading(false)
    }
  }

  async function handleSignOut() {
    await signOut()
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <BackIcon />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          {initials ? (
            <Text style={styles.initials}>{initials}</Text>
          ) : (
            <PersonIcon />
          )}
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
      </View>

      {/* Info card */}
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Username</Text>
          <Text style={styles.rowValue}>{displayName}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Email</Text>
          <Text style={styles.rowValue} numberOfLines={1}>{email}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.resetBtn} onPress={openPasswordModal}>
          <Text style={styles.resetBtnText}>Change Password</Text>
        </Pressable>

        <Pressable style={styles.logoutBtn} onPress={handleSignOut}>
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </Pressable>
      </View>

      {/* Change password modal */}
      <Modal visible={pwModalVisible} transparent animationType="slide" onRequestClose={() => setPwModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPwModalVisible(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Change Password</Text>

            {pwSuccess ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>Password updated successfully!</Text>
                <Pressable style={styles.doneBtn} onPress={() => setPwModalVisible(false)}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Current Password</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={currentPw}
                    onChangeText={setCurrentPw}
                    secureTextEntry={!showCurrent}
                    placeholder="Enter current password"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowCurrent(v => !v)} style={styles.eyeBtn}>
                    <EyeIcon visible={showCurrent} />
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>New Password</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={newPw}
                    onChangeText={setNewPw}
                    secureTextEntry={!showNew}
                    placeholder="At least 8 characters"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
                    <EyeIcon visible={showNew} />
                  </Pressable>
                </View>

                <Text style={styles.fieldLabel}>Confirm New Password</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                    secureTextEntry={!showConfirm}
                    placeholder="Repeat new password"
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                    <EyeIcon visible={showConfirm} />
                  </Pressable>
                </View>

                {!!pwError && <Text style={styles.errorText}>{pwError}</Text>}

                <Pressable style={styles.submitBtn} onPress={handleChangePassword} disabled={pwLoading}>
                  {pwLoading ? (
                    <ActivityIndicator color={colors.foreground} />
                  ) : (
                    <Text style={styles.submitBtnText}>Update Password</Text>
                  )}
                </Pressable>

                <Pressable style={styles.cancelBtn} onPress={() => setPwModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backButton: { padding: 6 },
  headerTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 20,
    color: colors.foreground,
  },

  avatarSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 32,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  initials: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 32,
    color: colors.muted,
  },
  displayName: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 22,
    color: colors.foreground,
  },

  card: {
    marginHorizontal: 24,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  rowLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.muted,
  },
  rowValue: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.foreground,
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: colors.border },

  actions: {
    marginHorizontal: 24,
    marginTop: 24,
    gap: 12,
  },
  resetBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.foreground,
  },
  logoutBtn: {
    backgroundColor: '#FFE5E5',
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFBDBD',
  },
  logoutBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: '#C0392B',
  },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1 },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  sheetTitle: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 22,
    color: colors.foreground,
    marginBottom: 20,
    textAlign: 'center',
  },
  fieldLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.muted,
    marginBottom: 6,
    marginTop: 14,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.foreground,
    paddingVertical: 14,
  },
  eyeBtn: { padding: 4 },
  errorText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: '#C0392B',
    marginTop: 10,
    textAlign: 'center',
  },
  submitBtn: {
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  submitBtnText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 17,
    color: colors.foreground,
  },
  cancelBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 6 },
  cancelBtnText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.muted,
  },

  // Success state
  successBox: { alignItems: 'center', paddingVertical: 20, gap: 20 },
  successText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: colors.foreground,
    textAlign: 'center',
  },
  doneBtn: {
    backgroundColor: colors.mint,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  doneBtnText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: 17,
    color: colors.foreground,
  },
})
