/**
 * CreateHouseholdModal Component
 *
 * Modal form for creating a new household.
 *
 * Features:
 * - Household name input with validation (1-100 characters)
 * - Timezone picker with common IANA timezone options
 * - Form validation before submission
 * - Loading state during API call
 * - Error handling and user feedback
 * - Accessibility labels
 * - Dark mode support
 *
 * Usage:
 * ```tsx
 * const [visible, setVisible] = useState(false);
 * 
 * <CreateHouseholdModal
 *   visible={visible}
 *   onClose={() => setVisible(false)}
 *   onSuccess={(household) => {
 *     // Refresh household list
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
  Platform,
  StyleSheet,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { createHousehold, ApiError } from '@/services/api';
import type { Household, CreateHouseholdRequest } from '@/types/models';

/**
 * Common IANA timezone options
 */
const TIMEZONE_OPTIONS = [
  // North America
  { label: 'Eastern (New York)', value: 'America/New_York' },
  { label: 'Central (Chicago)', value: 'America/Chicago' },
  { label: 'Mountain (Denver)', value: 'America/Denver' },
  { label: 'Pacific (Los Angeles)', value: 'America/Los_Angeles' },
  // Europe
  { label: 'London (GMT)', value: 'Europe/London' },
  { label: 'Europe (Berlin)', value: 'Europe/Berlin' },
  { label: 'Europe (Paris)', value: 'Europe/Paris' },
  { label: 'Europe (Madrid)', value: 'Europe/Madrid' },
  // Other
  { label: 'UTC', value: 'UTC' },
  { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
  { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
  { label: 'Asia/Singapore', value: 'Asia/Singapore' },
  { label: 'Australia/Sydney', value: 'Australia/Sydney' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: (household: Household) => void;
}

export default function CreateHouseholdModal({ visible, onClose, onSuccess }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Form state
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [showTimezoneDropdown, setShowTimezoneDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * Validate form fields
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = 'Household name is required';
    } else if (name.length < 1) {
      newErrors.name = 'Name must be at least 1 character';
    } else if (name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    // Validate timezone
    if (!timezone) {
      newErrors.timezone = 'Timezone is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, timezone]);

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
      const request: CreateHouseholdRequest = {
        name: name.trim(),
        timezone_id: timezone,
      };

      // Create household
      const household = await createHousehold(request);

      // Success - reset form and call callback
      setName('');
      setTimezone('America/New_York');
      setErrors({});
      onSuccess(household);
    } catch (error) {
      // Handle error
      if (error instanceof ApiError) {
        if (error.statusCode === 400) {
          setErrorMessage('Household name is invalid. Please try again.');
        } else if (error.statusCode === 409) {
          setErrorMessage('A household with this name already exists.');
        } else if (error.statusCode === 401) {
          setErrorMessage('You must be logged in to create a household.');
        } else {
          setErrorMessage(error.message || 'Failed to create household. Please try again.');
        }
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
      console.error('[CreateHouseholdModal] Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [name, timezone, validateForm, onSuccess]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    // Reset form
    setName('');
    setTimezone('America/New_York');
    setErrors({});
    setErrorMessage('');
    setShowTimezoneDropdown(false);

    onClose();
  }, [onClose]);

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
            <Text style={[styles.cancelButton, { color: colors.tint }]}>Cancelar</Text>
          </TouchableOpacity>

          <Text style={[styles.title, { color: colors.text }]}>Crear Hogar</Text>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Create household"
          >
            <Text
              style={[
                styles.createButton,
                {
                  color: isLoading ? colors.icon : colors.tint,
                  opacity: isLoading ? 0.5 : 1,
                },
              ]}
            >
              {isLoading ? 'Creando...' : 'Crear'}
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
          scrollEnabled={showTimezoneDropdown}
        >
          {/* Household Name Input */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Nombre del hogar</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: errors.name ? '#dc2626' : colors.icon,
                  backgroundColor: colorScheme === 'dark' ? '#262626' : '#f5f5f5',
                },
              ]}
              placeholder="ej. Mi piso, Casa familiar"
              placeholderTextColor={colors.icon}
              value={name}
              onChangeText={setName}
              maxLength={100}
              editable={!isLoading}
              accessibilityLabel="Household name input"
              accessibilityHint="Enter the name of the household (1-100 characters)"
            />
            {errors.name && (
              <Text style={[styles.errorHint, { color: '#dc2626' }]}>{errors.name}</Text>
            )}
            <Text style={[styles.characterCount, { color: colors.icon }]}>
              {name.length}/100
            </Text>
          </View>

          {/* Timezone Picker */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Zona horaria</Text>
            <TouchableOpacity
              onPress={() => setShowTimezoneDropdown(!showTimezoneDropdown)}
              disabled={isLoading}
              style={[
                styles.timezonePicker,
                {
                  borderColor: colors.icon,
                  backgroundColor: colorScheme === 'dark' ? '#262626' : '#f5f5f5',
                },
              ]}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Timezone picker"
              accessibilityHint={`Current selection: ${timezone}`}
              accessibilityState={{ expanded: showTimezoneDropdown }}
            >
              <Text style={[styles.timezoneValue, { color: colors.text }]}>
                {TIMEZONE_OPTIONS.find((tz) => tz.value === timezone)?.label || timezone}
              </Text>
              <Text style={[styles.dropdownIndicator, { color: colors.icon }]}>
                {showTimezoneDropdown ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {errors.timezone && (
              <Text style={[styles.errorHint, { color: '#dc2626' }]}>{errors.timezone}</Text>
            )}

            {/* Timezone Dropdown */}
            {showTimezoneDropdown && (
              <View
                style={[
                  styles.timezoneDropdown,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#fafafa',
                    borderColor: colors.icon,
                  },
                ]}
              >
                <ScrollView
                  nestedScrollEnabled
                  style={styles.timezoneList}
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <TouchableOpacity
                      key={tz.value}
                      onPress={() => {
                        setTimezone(tz.value);
                        setShowTimezoneDropdown(false);
                      }}
                      style={[
                        styles.timezoneOption,
                        timezone === tz.value && [
                          styles.timezoneOptionSelected,
                          { backgroundColor: colors.tint },
                        ],
                      ]}
                    >
                      <Text
                        style={[
                          styles.timezoneOptionText,
                          {
                            color: timezone === tz.value ? '#fff' : colors.text,
                          },
                        ]}
                      >
                        {tz.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Text style={[styles.infoText, { color: colors.icon }]}>
              The timezone is used to determine when daily task streaks reset (at midnight in
              the selected timezone).
            </Text>
          </View>
        </ScrollView>

        {/* Loading Indicator */}
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
    fontWeight: '600',
  },

  cancelButton: {
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  createButton: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  errorContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  errorDismiss: {
    padding: 4,
  },

  formContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },

  formGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },

  errorHint: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },

  characterCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },

  timezonePicker: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  timezoneValue: {
    fontSize: 16,
    flex: 1,
  },

  dropdownIndicator: {
    fontSize: 12,
    marginLeft: 8,
  },

  timezoneDropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 8,
    maxHeight: 300,
    overflow: 'hidden',
  },

  timezoneList: {
    maxHeight: 300,
  },

  timezoneOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  timezoneOptionSelected: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },

  timezoneOptionText: {
    fontSize: 14,
  },

  infoContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },

  infoText: {
    fontSize: 12,
    lineHeight: 16,
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
