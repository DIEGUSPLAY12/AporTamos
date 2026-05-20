/**
 * TaskForm Component
 *
 * Form component for adding or editing a single task.
 *
 * Features:
 * - Task name input with validation (1-100 characters)
 * - Task description input (optional, <1000 characters)
 * - Day of week selector (MON-SUN)
 * - Effort weight selector (1-10)
 * - Assignment type selector (explicit vs random)
 * - Conditional user selector for explicit assignments
 * - Form validation before submission
 * - Loading state during submission
 * - Error handling and user feedback
 * - Dark mode support
 *
 * Usage:
 * ```tsx
 * const [task, setTask] = useState({
 *   name: 'Wash dishes',
 *   description: 'Clean all dishes and pans',
 *   day_of_week: 'MON',
 *   effort_weight: 3,
 *   assignment_type: 'explicit',
 *   assigned_user_id: userId,
 * });
 *
 * <TaskForm
 *   task={task}
 *   householdMembers={members}
 *   onSubmit={(updatedTask) => {
 *     // Save task
 *   }}
 *   onCancel={() => {
 *     // Close form
 *   }}
 * />
 * ```
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import type { TaskCreate, User } from '@/types/models';

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
};

const EFFORT_WEIGHT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ASSIGNMENT_TYPES = ['explicit', 'random'];

interface TaskFormProps {
  task: Partial<TaskCreate>;
  householdMembers: User[];
  onSubmit: (task: Partial<TaskCreate>) => Promise<void> | void;
  onCancel: () => void;
  isLoading?: boolean;
  title?: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  day_of_week?: string;
  effort_weight?: string;
  assignment_type?: string;
  assigned_user_id?: string;
  global?: string;
}

export default function TaskForm({
  task: initialTask,
  householdMembers,
  onSubmit,
  onCancel,
  isLoading = false,
  title = 'Task Details',
}: TaskFormProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Form state
  const [task, setTask] = useState<Partial<TaskCreate>>(initialTask);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  /**
   * Validate form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validate name
    if (!task.name?.trim()) {
      newErrors.name = 'Task name is required';
    } else if (task.name.length < 1) {
      newErrors.name = 'Name must be at least 1 character';
    } else if (task.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
    }

    // Validate description
    if (task.description && task.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }

    // Validate day of week
    if (!task.day_of_week || !DAYS_OF_WEEK.includes(task.day_of_week)) {
      newErrors.day_of_week = 'Valid day of week is required';
    }

    // Validate effort weight
    if (
      task.effort_weight === undefined ||
      !Number.isInteger(task.effort_weight) ||
      task.effort_weight < 1 ||
      task.effort_weight > 10
    ) {
      newErrors.effort_weight = 'Effort weight must be between 1 and 10';
    }

    // Validate assignment type
    if (!task.assignment_type || !ASSIGNMENT_TYPES.includes(task.assignment_type)) {
      newErrors.assignment_type = 'Valid assignment type is required';
    }

    // Validate explicit assignment requires a user
    if (task.assignment_type === 'explicit') {
      if (!task.assigned_user_id) {
        newErrors.assigned_user_id = 'User must be selected for explicit assignment';
      }
    } else if (task.assignment_type === 'random') {
      // Random assignment should not have a user
      if (task.assigned_user_id) {
        newErrors.assigned_user_id = 'No user should be selected for random assignment';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [task]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      await onSubmit(task);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save task';
      setErrors((prev) => ({
        ...prev,
        global: errorMessage,
      }));
    } finally {
      setSubmitting(false);
    }
  }, [task, validateForm, onSubmit]);

  /**
   * Update task field
   */
  const handleUpdateField = useCallback((field: keyof TaskCreate, value: any) => {
    setTask((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-select first member when switching to explicit
      if (field === 'assignment_type' && value === 'explicit' && !updated.assigned_user_id) {
        updated.assigned_user_id = householdMembers[0]?.id;
      }

      // Clear assigned user for random assignment
      if (field === 'assignment_type' && value === 'random') {
        updated.assigned_user_id = null;
      }

      return updated;
    });

    // Clear error for this field
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  }, [errors, householdMembers]);

  /**
   * Render day selector
   */
  const renderDaySelector = () => {
    const hasError = !!errors.day_of_week;

    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Day of Week *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dayButtonContainer}
        >
          {DAYS_OF_WEEK.map((day) => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayButton,
                {
                  backgroundColor: task.day_of_week === day ? colors.tint : colors.secondaryBackground,
                  borderColor: hasError ? '#ef4444' : 'transparent',
                  borderWidth: hasError ? 1 : 0,
                },
              ]}
              onPress={() => handleUpdateField('day_of_week', day)}
              disabled={submitting || isLoading}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  {
                    color: task.day_of_week === day ? '#fff' : colors.text,
                  },
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {hasError && <Text style={[styles.errorText, { color: '#ef4444' }]}>{errors.day_of_week}</Text>}
      </View>
    );
  };

  /**
   * Render effort weight selector
   */
  const renderEffortWeightSelector = () => {
    const hasError = !!errors.effort_weight;

    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Effort Weight (1-10) *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.weightButtonContainer}
        >
          {EFFORT_WEIGHT_OPTIONS.map((weight) => (
            <TouchableOpacity
              key={weight}
              style={[
                styles.weightButton,
                {
                  backgroundColor: task.effort_weight === weight ? colors.tint : colors.secondaryBackground,
                  borderColor: hasError ? '#ef4444' : 'transparent',
                  borderWidth: hasError ? 1 : 0,
                },
              ]}
              onPress={() => handleUpdateField('effort_weight', weight)}
              disabled={submitting || isLoading}
            >
              <Text
                style={[
                  styles.weightButtonText,
                  {
                    color: task.effort_weight === weight ? '#fff' : colors.text,
                  },
                ]}
              >
                {weight}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {hasError && <Text style={[styles.errorText, { color: '#ef4444' }]}>{errors.effort_weight}</Text>}
      </View>
    );
  };

  /**
   * Render assignment type selector
   */
  const renderAssignmentTypeSelector = () => {
    const hasError = !!errors.assignment_type;

    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Assignment Type *</Text>
        <View style={styles.assignmentTypeContainer}>
          {ASSIGNMENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.assignmentTypeButton,
                {
                  backgroundColor: task.assignment_type === type ? colors.tint : colors.secondaryBackground,
                  borderColor: hasError ? '#ef4444' : 'transparent',
                  borderWidth: hasError ? 1 : 0,
                },
              ]}
              onPress={() => handleUpdateField('assignment_type', type)}
              disabled={submitting || isLoading}
            >
              <Text
                style={[
                  styles.assignmentTypeText,
                  {
                    color: task.assignment_type === type ? '#fff' : colors.text,
                  },
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {hasError && <Text style={[styles.errorText, { color: '#ef4444' }]}>{errors.assignment_type}</Text>}
      </View>
    );
  };

  /**
   * Render user selector for explicit assignments
   */
  const renderUserSelector = () => {
    if (task.assignment_type !== 'explicit') {
      return null;
    }

    const hasError = !!errors.assigned_user_id;

    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Assign to *</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.userButtonContainer}
        >
          {householdMembers.map((member) => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.userButton,
                {
                  backgroundColor: task.assigned_user_id === member.id ? colors.tint : colors.secondaryBackground,
                  borderColor: hasError ? '#ef4444' : 'transparent',
                  borderWidth: hasError ? 1 : 0,
                },
              ]}
              onPress={() => handleUpdateField('assigned_user_id', member.id)}
              disabled={submitting || isLoading}
            >
              <Text
                style={[
                  styles.userButtonText,
                  {
                    color: task.assigned_user_id === member.id ? '#fff' : colors.text,
                  },
                ]}
              >
                {member.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {hasError && <Text style={[styles.errorText, { color: '#ef4444' }]}>{errors.assigned_user_id}</Text>}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>

      {/* Global Error */}
      {errors.global && (
        <View style={[styles.errorContainer, { backgroundColor: '#fecaca' }]}>
          <Text style={[styles.errorMessage, { color: '#991b1b' }]}>{errors.global}</Text>
        </View>
      )}

      {/* Form Fields */}
      <ScrollView
        style={styles.formContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formContentContainer}
      >
        {/* Task Name */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Task Name *</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.secondaryBackground,
                color: colors.text,
                borderColor: errors.name ? '#ef4444' : colors.border,
              },
            ]}
            placeholder="e.g., Wash dishes"
            placeholderTextColor={colors.lightText}
            value={task.name || ''}
            onChangeText={(text) => handleUpdateField('name', text)}
            maxLength={100}
            editable={!submitting && !isLoading}
          />
          <View style={styles.fieldFooter}>
            <Text style={[styles.characterCount, { color: colors.lightText }]}>
              {(task.name || '').length}/100
            </Text>
            {errors.name && <Text style={[styles.errorText, { color: '#ef4444' }]}>{errors.name}</Text>}
          </View>
        </View>

        {/* Task Description */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Description (optional)</Text>
          <TextInput
            style={[
              styles.textAreaInput,
              {
                backgroundColor: colors.secondaryBackground,
                color: colors.text,
                borderColor: errors.description ? '#ef4444' : colors.border,
              },
            ]}
            placeholder="e.g., Clean all dishes and pans"
            placeholderTextColor={colors.lightText}
            value={task.description || ''}
            onChangeText={(text) => handleUpdateField('description', text)}
            maxLength={1000}
            multiline
            numberOfLines={3}
            editable={!submitting && !isLoading}
          />
          <View style={styles.fieldFooter}>
            <Text style={[styles.characterCount, { color: colors.lightText }]}>
              {(task.description || '').length}/1000
            </Text>
            {errors.description && (
              <Text style={[styles.errorText, { color: '#ef4444' }]}>{errors.description}</Text>
            )}
          </View>
        </View>

        {/* Day of Week */}
        {renderDaySelector()}

        {/* Effort Weight */}
        {renderEffortWeightSelector()}

        {/* Assignment Type */}
        {renderAssignmentTypeSelector()}

        {/* User Selector */}
        {renderUserSelector()}
      </ScrollView>

      {/* Action Buttons */}
      <View
        style={[
          styles.footer,
          {
            backgroundColor: colors.secondaryBackground,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.cancelButton,
            {
              backgroundColor: colors.border,
            },
          ]}
          onPress={onCancel}
          disabled={submitting || isLoading}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.tint,
              opacity: submitting || isLoading ? 0.6 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={submitting || isLoading}
        >
          {submitting || isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Save Task</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'web' ? 12 : 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  errorContainer: {
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  errorMessage: {
    fontSize: 14,
  },
  formContent: {
    flex: 1,
  },
  formContentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  textAreaInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
  },
  fieldFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
  },
  errorText: {
    fontSize: 12,
  },
  dayButtonContainer: {
    flexDirection: 'row',
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  weightButtonContainer: {
    flexDirection: 'row',
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  weightButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 6,
    minWidth: 44,
    alignItems: 'center',
  },
  weightButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  assignmentTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  assignmentTypeButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  assignmentTypeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  userButtonContainer: {
    flexDirection: 'row',
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  userButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  userButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'web' ? 12 : 16 + (20 || 0),
    gap: 8,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
