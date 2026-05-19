/**
 * InviteMembersModal Component
 *
 * Modal form for inviting members to a household by email.
 *
 * Features:
 * - Email input with validation (valid email format)
 * - Single member invitation
 * - Loading state during API call
 * - Error handling and user feedback
 * - Accessibility labels
 * - Dark mode support
 * - Owner-only access (enforced by parent component)
 *
 * Usage:
 * ```tsx
 * const [visible, setVisible] = useState(false);
 * 
 * <InviteMembersModal
 *   visible={visible}
 *   householdId="abc-123"
 *   onClose={() => setVisible(false)}
 *   onSuccess={() => {
 *     Alert.alert('Success', 'Invitation sent!');
 *     setVisible(false);
 *   }}
 * />
 * ```
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { inviteMember, ApiError } from '@/services/api';
import type { InviteMemberRequest } from '@/types/models';

/**
 * Email validation regex
 * Matches standard email format: user@example.com
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  visible: boolean;
  householdId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteMembersModal({
  visible,
  householdId,
  onClose,
  onSuccess,
}: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Form state
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Validate form fields
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate email
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    // Dismiss keyboard
    Keyboard.dismiss();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Prepare request
      const request: InviteMemberRequest = {
        email: email.trim().toLowerCase(),
      };

      // Send invitation
      await inviteMember(householdId, request);

      // Success - reset form and call callback
      setEmail('');
      setErrors({});
      onSuccess();
    } catch (error) {
      // Handle error
      if (error instanceof ApiError) {
        if (error.statusCode === 400) {
          setErrorMessage('This email is already a member of the household.');
        } else if (error.statusCode === 403) {
          setErrorMessage('Only the household owner can invite members.');
        } else if (error.statusCode === 404) {
          setErrorMessage('Household not found.');
        } else {
          setErrorMessage(error.message || 'Failed to send invitation. Please try again.');
        }
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
      console.error('[InviteMembersModal] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [email, householdId, validateForm, onSuccess]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    // Reset form
    setEmail('');
    setErrors({});
    setErrorMessage('');

    onClose();
  }, [onClose]);

  /**
   * Handle email input change
   */
  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    // Clear error when user starts typing
    if (errors.email) {
      setErrors({});
    }
  }, [errors]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent={false}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff' },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleClose}
            disabled={isLoading}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={[styles.cancelButton, { color: colors.tint }]}>Cancel</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>Invite Member</Text>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading || !email.trim()}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Send invitation"
          >
            <Text
              style={[
                styles.sendButton,
                {
                  color: isLoading || !email.trim() ? colors.icon : colors.tint,
                  opacity: isLoading || !email.trim() ? 0.5 : 1,
                },
              ]}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Error Message */}
        {errorMessage && (
          <View style={[styles.errorContainer, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.errorText, { color: '#dc2626' }]}>{errorMessage}</Text>
            <TouchableOpacity
              onPress={() => setErrorMessage('')}
              style={styles.errorDismiss}
            >
              <Text style={{ color: '#dc2626', fontSize: 18 }}>×</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Form */}
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Household Info Message */}
          <View style={styles.infoContainer}>
            <Text style={[styles.infoText, { color: colors.subtext }]}>
              Invite someone to this household by entering their email address.
            </Text>
          </View>

          {/* Email Input */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: errors.email ? '#dc2626' : colors.border,
                  backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f9fafb',
                  color: colors.text,
                },
              ]}
              placeholder="user@example.com"
              placeholderTextColor={colors.subtext}
              value={email}
              onChangeText={handleEmailChange}
              editable={!isLoading}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              accessible
              accessibilityLabel="Email address"
              accessibilityHint="Enter the email address of the person you want to invite"
            />
            {errors.email && (
              <Text style={[styles.errorField, { color: '#dc2626' }]}>
                {errors.email}
              </Text>
            )}
          </View>

          {/* Help Text */}
          <View style={styles.helpContainer}>
            <Text style={[styles.helpText, { color: colors.subtext }]}>
              💡 The invited user will need to accept the invitation in their profile.
            </Text>
          </View>
        </ScrollView>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  cancelButton: {
    fontSize: 16,
    fontWeight: '500',
  },
  sendButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  errorDismiss: {
    paddingLeft: 12,
  },
  formContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  infoContainer: {
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  errorField: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  helpContainer: {
    marginTop: 20,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fef3c720',
    borderRadius: 8,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
});
