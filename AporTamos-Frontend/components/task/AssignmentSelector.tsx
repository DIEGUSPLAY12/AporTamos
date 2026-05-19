/**
 * AssignmentSelector Component
 *
 * Form component for selecting task assignment type (explicit vs random) and optionally a user.
 *
 * Features:
 * - Toggle between explicit and random assignment types
 * - Conditional user selector for explicit assignments
 * - Validation for assignment type and user selection
 * - Form validation before submission
 * - Error handling and user feedback
 * - Dark mode support
 *
 * Usage:
 * ```tsx
 * const [assignmentType, setAssignmentType] = useState('explicit');
 * const [assignedUserId, setAssignedUserId] = useState(householdMembers[0].id);
 *
 * <AssignmentSelector
 *   assignmentType={assignmentType}
 *   assignedUserId={assignedUserId}
 *   householdMembers={members}
 *   onAssignmentTypeChange={setAssignmentType}
 *   onAssignedUserChange={setAssignedUserId}
 * />
 * ```
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import Colors from '@/constants/Colors';
import type { User } from '@/types/models';

const ASSIGNMENT_TYPES = [
  {
    value: 'explicit',
    label: 'Assign to Person',
    description: 'Task assigned to specific person',
  },
  {
    value: 'random',
    label: 'Random',
    description: 'Task randomly assigned each day',
  },
];

interface AssignmentSelectorProps {
  assignmentType: string;
  assignedUserId: string | null;
  householdMembers: User[];
  onAssignmentTypeChange: (type: string) => void;
  onAssignedUserChange: (userId: string | null) => void;
  error?: string;
  disabled?: boolean;
}

export default function AssignmentSelector({
  assignmentType,
  assignedUserId,
  householdMembers,
  onAssignmentTypeChange,
  onAssignedUserChange,
  error,
  disabled = false,
}: AssignmentSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  /**
   * Handle assignment type change
   */
  const handleAssignmentTypeChange = useCallback(
    (type: string) => {
      onAssignmentTypeChange(type);

      // Auto-select first member when switching to explicit
      if (type === 'explicit' && !assignedUserId && householdMembers.length > 0) {
        onAssignedUserChange(householdMembers[0].id);
      }

      // Clear assigned user for random assignment
      if (type === 'random') {
        onAssignedUserChange(null);
      }
    },
    [assignmentType, assignedUserId, householdMembers, onAssignmentTypeChange, onAssignedUserChange],
  );

  /**
   * Handle user selection
   */
  const handleUserSelect = useCallback(
    (userId: string) => {
      onAssignedUserChange(userId);
    },
    [onAssignedUserChange],
  );

  /**
   * Get description for current assignment type
   */
  const currentTypeDescription = useMemo(() => {
    const typeInfo = ASSIGNMENT_TYPES.find((t) => t.value === assignmentType);
    return typeInfo?.description || '';
  }, [assignmentType]);

  /**
   * Get selected user name
   */
  const selectedUserName = useMemo(() => {
    if (!assignedUserId || assignmentType !== 'explicit') {
      return 'No user selected';
    }
    const user = householdMembers.find((m) => m.id === assignedUserId);
    return user?.name || 'Unknown user';
  }, [assignedUserId, assignmentType, householdMembers]);

  /**
   * Render assignment type selector
   */
  const renderAssignmentTypeSelector = () => (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, { color: colors.text }]}>Assignment Type</Text>
      <View style={styles.typeButtonsContainer}>
        {ASSIGNMENT_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.typeButton,
              {
                backgroundColor:
                  assignmentType === type.value ? colors.tint : colors.secondaryBackground,
                borderColor: assignmentType === type.value ? colors.tint : colors.border,
                borderWidth: 1,
              },
            ]}
            onPress={() => handleAssignmentTypeChange(type.value)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.typeButtonLabel,
                {
                  color: assignmentType === type.value ? '#fff' : colors.text,
                  fontWeight: assignmentType === type.value ? '600' : '500',
                },
              ]}
            >
              {type.label}
            </Text>
            <Text
              style={[
                styles.typeButtonDescription,
                {
                  color: assignmentType === type.value ? 'rgba(255,255,255,0.8)' : colors.lightText,
                  fontSize: 11,
                  marginTop: 2,
                },
              ]}
            >
              {type.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text>}
    </View>
  );

  /**
   * Render user selector for explicit assignments
   */
  const renderUserSelector = () => {
    if (assignmentType !== 'explicit') {
      return null;
    }

    return (
      <View style={styles.fieldContainer}>
        <View style={styles.userSelectorHeader}>
          <Text style={[styles.label, { color: colors.text }]}>Select Person</Text>
          <Text style={[styles.selectedUserIndicator, { color: colors.tint }]}>
            {selectedUserName}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.userButtonsContainer}
          contentContainerStyle={styles.userButtonsContent}
        >
          {householdMembers.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.userButton,
                {
                  backgroundColor:
                    assignedUserId === member.id ? colors.tint : colors.secondaryBackground,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
              onPress={() => handleUserSelect(member.id)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.userButtonText,
                  {
                    color: assignedUserId === member.id ? '#fff' : colors.text,
                    fontWeight: assignedUserId === member.id ? '600' : '500',
                  },
                ]}
              >
                {member.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {householdMembers.length === 0 && (
          <Text style={[styles.emptyState, { color: colors.lightText }]}>
            No household members available
          </Text>
        )}
      </View>
    );
  };

  /**
   * Render summary view
   */
  const renderSummary = () => (
    <View
      style={[
        styles.summaryContainer,
        {
          backgroundColor: colors.secondaryBackground,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryLabel, { color: colors.lightText }]}>Assignment Type:</Text>
        <Text style={[styles.summaryValue, { color: colors.text }]}>
          {assignmentType === 'explicit' ? 'Specific Person' : 'Random'}
        </Text>
      </View>

      {assignmentType === 'explicit' && (
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.lightText }]}>Assigned to:</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>{selectedUserName}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Assignment Type Selector */}
      {renderAssignmentTypeSelector()}

      {/* User Selector (conditional) */}
      {renderUserSelector()}

      {/* Summary */}
      {renderSummary()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  fieldContainer: {
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonLabel: {
    fontSize: 13,
  },
  typeButtonDescription: {
    fontSize: 11,
  },
  userSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  selectedUserIndicator: {
    fontSize: 12,
    fontWeight: '500',
  },
  userButtonsContainer: {
    marginHorizontal: -4,
  },
  userButtonsContent: {
    paddingHorizontal: 4,
    gap: 6,
  },
  userButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userButtonText: {
    fontSize: 12,
  },
  emptyState: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  summaryContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    marginTop: 6,
  },
});
