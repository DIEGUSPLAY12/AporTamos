/**
 * ScheduleEditor Component
 *
 * Form component for creating and editing weekly task schedules.
 *
 * Features:
 * - Add/remove tasks with validation
 * - Select day of week, effort weight, assignment type
 * - Form validation before submission
 * - Loading state during API call
 * - Error handling and user feedback
 * - Dark mode support
 * - Task management (add, remove, update individual task fields)
 *
 * Usage:
 * ```tsx
 * <ScheduleEditor
 *   householdId={householdId}
 *   householdMembers={members}
 *   existingSchedule={schedule}
 *   onSuccess={() => {
 *     // Refresh schedule list
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
  Alert,
  Keyboard,
  Platform,
  StyleSheet,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { createSchedule, addTaskToSchedule, ApiError } from '@/services/api';
import type {
  CreateWeeklyTaskScheduleRequest,
  TaskCreate,
  Household,
  User,
  WeeklyTaskScheduleResponse,
} from '@/types/models';

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS = {
  MON: 'L',
  TUE: 'M',
  WED: 'X',
  THU: 'J',
  FRI: 'V',
  SAT: 'S',
  SUN: 'D',
};

const EFFORT_WEIGHT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ASSIGNMENT_TYPES = ['explicit', 'random'];

interface ScheduleEditorProps {
  householdId: string;
  householdMembers: User[];
  existingSchedule?: WeeklyTaskScheduleResponse;
  onSuccess: (schedule: WeeklyTaskScheduleResponse) => void;
  onCancel: () => void;
}

interface FormTask extends Omit<TaskCreate, 'id'> {
  id: string; // Temporary local ID for form management
}

interface ValidationErrors {
  global?: string;
  tasks?: Record<string, Record<string, string>>;
}

export default function ScheduleEditor({
  householdId,
  householdMembers,
  existingSchedule,
  onSuccess,
  onCancel,
}: ScheduleEditorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Form state - initialize from existing schedule if provided
  const initialTasks: FormTask[] = useMemo(() => {
    if (!existingSchedule?.tasks) {
      return [];
    }
    return existingSchedule.tasks.map((task) => ({
      id: task.id || `temp-${Math.random()}`,
      name: task.name,
      description: task.description || '',
      day_of_week: task.day_of_week,
      effort_weight: task.effort_weight,
      assignment_type: task.assignment_type,
      assigned_user_id: task.assigned_user_id || null,
      frequency: task.frequency || 'daily',
    }));
  }, [existingSchedule]);

  const [tasks, setTasks] = useState<FormTask[]>(initialTasks);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [expandedTaskIndex, setExpandedTaskIndex] = useState<number | null>(0);

  /**
   * Validate individual task
   */
  const validateTask = useCallback(
    (task: FormTask): Record<string, string> => {
      const taskErrors: Record<string, string> = {};

      if (!task.name.trim()) {
        taskErrors.name = 'El nombre de la tarea es obligatorio';
      } else if (task.name.length > 100) {
        taskErrors.name = 'El nombre no puede superar 100 caracteres';
      }

      if (task.description && task.description.length > 1000) {
        taskErrors.description = 'La descripción no puede superar 1000 caracteres';
      }

      if (!DAYS_OF_WEEK.includes(task.day_of_week)) {
        taskErrors.day_of_week = 'Día no válido';
      }

      if (!Number.isInteger(task.effort_weight) || task.effort_weight < 1 || task.effort_weight > 10) {
        taskErrors.effort_weight = 'La dificultad debe estar entre 1 y 10';
      }

      if (!ASSIGNMENT_TYPES.includes(task.assignment_type)) {
        taskErrors.assignment_type = 'Tipo de asignación no válido';
      }

      if (task.assignment_type === 'explicit') {
        if (!task.assigned_user_id) {
          taskErrors.assigned_user_id = 'Debes seleccionar a quién se asigna';
        }
      } else if (task.assignment_type === 'random') {
        if (task.assigned_user_id) {
          taskErrors.assigned_user_id = 'No debe seleccionarse usuario en asignación aleatoria';
        }
      }

      return taskErrors;
    },
    [],
  );

  /**
   * Validate entire form
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    if (tasks.length === 0) {
      newErrors.global = 'Debes añadir al menos una tarea';
      setErrors(newErrors);
      return false;
    }

    const taskErrors: Record<string, Record<string, string>> = {};
    let hasErrors = false;

    tasks.forEach((task, index) => {
      const validationErrors = validateTask(task);
      if (Object.keys(validationErrors).length > 0) {
        taskErrors[index] = validationErrors;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      newErrors.tasks = taskErrors;
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  }, [tasks, validateTask]);

  /**
   * Handle add task
   */
  const handleAddTask = useCallback(() => {
    const newTask: FormTask = {
      id: `temp-${Date.now()}`,
      name: '',
      description: '',
      day_of_week: 'MON',
      effort_weight: 5,
      assignment_type: 'random',
      assigned_user_id: null,
      frequency: 'daily',
    };

    setTasks([...tasks, newTask]);
    setExpandedTaskIndex(tasks.length); // Expand the new task
  }, [tasks]);

  /**
   * Handle remove task
   */
  const handleRemoveTask = useCallback((index: number) => {
    Alert.alert('Eliminar tarea', '¿Seguro que quieres eliminar esta tarea?', [
      { text: 'Cancelar', onPress: () => {} },
      {
        text: 'Eliminar',
        onPress: () => {
          const newTasks = tasks.filter((_, i) => i !== index);
          setTasks(newTasks);
          if (expandedTaskIndex === index) {
            setExpandedTaskIndex(newTasks.length > 0 ? 0 : null);
          }
        },
      },
    ]);
  }, [tasks, expandedTaskIndex]);

  /**
   * Handle task field update
   */
  const handleUpdateTask = useCallback(
    (index: number, field: keyof FormTask, value: any) => {
      const newTasks = [...tasks];
      const updatedTask = { ...newTasks[index], [field]: value };

      // If switching to explicit assignment, auto-select first member
      if (field === 'assignment_type' && value === 'explicit' && !updatedTask.assigned_user_id) {
        updatedTask.assigned_user_id = householdMembers[0]?.id || null;
      }

      // If switching to random, clear assigned user
      if (field === 'assignment_type' && value === 'random') {
        updatedTask.assigned_user_id = null;
      }

      newTasks[index] = updatedTask;
      setTasks(newTasks);

      // Clear error for this field
      if (errors.tasks?.[index]) {
        const newTaskErrors = { ...errors.tasks };
        if (newTaskErrors[index]) {
          delete newTaskErrors[index][field];
          if (Object.keys(newTaskErrors[index]).length === 0) {
            delete newTaskErrors[index];
          }
          setErrors({ ...errors, tasks: newTaskErrors });
        }
      }
    },
    [tasks, householdMembers, errors],
  );

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setGlobalError('');

    try {
      if (existingSchedule) {
        // Add only the NEW tasks (temp IDs) to the existing schedule one by one
        const newTasks = tasks.filter(t => t.id.startsWith('temp-'));

        if (newTasks.length === 0) {
          Alert.alert('Sin cambios', 'No hay tareas nuevas para guardar.');
          setIsLoading(false);
          return;
        }

        for (const task of newTasks) {
          const { id, ...taskData } = task;
          await addTaskToSchedule(householdId, taskData);
        }

        // Return the existing schedule (with the count updated conceptually)
        onSuccess(existingSchedule);
      } else {
        // Create brand new schedule with all tasks
        const requestTasks = tasks.map(({ id, ...task }) => task);
        const result = await createSchedule(householdId, { tasks: requestTasks });
        onSuccess(result);
      }
    } catch (error) {
      const apiError = error as ApiError;
      const message =
        apiError?.detail || apiError?.message || 'No se pudo guardar la rutina. Inténtalo de nuevo.';

      setGlobalError(message);

      // Show alert for critical errors
      if (error instanceof Error) {
        Alert.alert('Error', message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [tasks, householdId, existingSchedule, onSuccess, validateForm]);

  /**
   * Render day selector dropdown
   */
  const renderDaySelector = (task: FormTask, index: number) => {
    const taskErrors = errors.tasks?.[index];
    const hasError = !!taskErrors?.day_of_week;

    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Día de la semana</Text>
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
                  backgroundColor:
                    task.day_of_week === day ? colors.tint : colors.secondaryBackground,
                  borderColor: hasError ? '#ef4444' : 'transparent',
                  borderWidth: hasError ? 1 : 0,
                },
              ]}
              onPress={() => handleUpdateTask(index, 'day_of_week', day)}
            >
              <Text
                style={[
                  styles.dayButtonText,
                  {
                    color: task.day_of_week === day ? '#fff' : colors.text,
                  },
                ]}
              >
                {DAY_LABELS[day as keyof typeof DAY_LABELS]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {hasError && <Text style={[styles.errorText, { color: '#ef4444' }]}>{taskErrors.day_of_week}</Text>}
      </View>
    );
  };

  /**
   * Render effort weight selector
   */
  const renderEffortWeightSelector = (task: FormTask, index: number) => {
    const taskErrors = errors.tasks?.[index];
    const hasError = !!taskErrors?.effort_weight;

    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Dificultad (1-10)</Text>
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
                  backgroundColor:
                    task.effort_weight === weight ? colors.tint : colors.secondaryBackground,
                  borderColor: hasError ? '#ef4444' : 'transparent',
                  borderWidth: hasError ? 1 : 0,
                },
              ]}
              onPress={() => handleUpdateTask(index, 'effort_weight', weight)}
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
        {hasError && (
          <Text style={[styles.errorText, { color: '#ef4444' }]}>
            {taskErrors.effort_weight}
          </Text>
        )}
      </View>
    );
  };

  /**
   * Render assignment type selector
   */
  const renderAssignmentTypeSelector = (task: FormTask, index: number) => {
    const taskErrors = errors.tasks?.[index];
    const hasError = !!taskErrors?.assignment_type;

    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Tipo de asignación</Text>
        <View style={styles.assignmentTypeContainer}>
          {ASSIGNMENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.assignmentTypeButton,
                {
                  backgroundColor:
                    task.assignment_type === type ? colors.tint : colors.secondaryBackground,
                  borderColor: hasError ? '#ef4444' : 'transparent',
                  borderWidth: hasError ? 1 : 0,
                },
              ]}
              onPress={() => handleUpdateTask(index, 'assignment_type', type)}
            >
              <Text
                style={[
                  styles.assignmentTypeText,
                  {
                    color: task.assignment_type === type ? '#fff' : colors.text,
                  },
                ]}
              >
                {type === 'explicit' ? 'Asignado' : 'Aleatorio'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {hasError && (
          <Text style={[styles.errorText, { color: '#ef4444' }]}>
            {taskErrors.assignment_type}
          </Text>
        )}
      </View>
    );
  };

  /**
   * Render user selector for explicit assignment
   */
  const renderUserSelector = (task: FormTask, index: number) => {
    if (task.assignment_type !== 'explicit') {
      return null;
    }

    const taskErrors = errors.tasks?.[index];
    const hasError = !!taskErrors?.assigned_user_id;

    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: colors.text }]}>Asignar a</Text>
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
                  backgroundColor:
                    task.assigned_user_id === member.id ? colors.tint : colors.secondaryBackground,
                  borderColor: hasError ? '#ef4444' : 'transparent',
                  borderWidth: hasError ? 1 : 0,
                },
              ]}
              onPress={() => handleUpdateTask(index, 'assigned_user_id', member.id)}
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
        {hasError && (
          <Text style={[styles.errorText, { color: '#ef4444' }]}>
            {taskErrors.assigned_user_id}
          </Text>
        )}
      </View>
    );
  };

  /**
   * Render a single task card
   */
  const renderTaskCard = (task: FormTask, index: number) => {
    const taskErrors = errors.tasks?.[index];
    const isExpanded = expandedTaskIndex === index;
    const nameError = taskErrors?.name;
    const descriptionError = taskErrors?.description;

    return (
      <View
        key={task.id}
        style={[
          styles.taskCard,
          {
            backgroundColor: colors.secondaryBackground,
            borderTopColor: nameError || descriptionError ? '#ef4444' : colors.tint,
          },
        ]}
      >
        {/* Task Header - Always visible */}
        <TouchableOpacity
          style={styles.taskCardHeader}
          onPress={() => setExpandedTaskIndex(isExpanded ? null : index)}
          activeOpacity={0.7}
        >
          <View style={styles.taskCardHeaderContent}>
            <Text
              style={[
                styles.taskCardTitle,
                {
                  color: task.name ? colors.text : '#999',
                  fontWeight: isExpanded ? '600' : '500',
                },
              ]}
            >
              {task.name || 'Nueva tarea'}
            </Text>
            <View style={styles.taskCardMeta}>
              <Text style={[styles.taskCardMetaText, { color: colors.lightText }]}>
                {DAY_LABELS[task.day_of_week as keyof typeof DAY_LABELS]} • Dificultad: {task.effort_weight}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.removeTaskButton}
            onPress={() => handleRemoveTask(index)}
          >
            <Text style={{ fontSize: 20, color: '#ef4444' }}>×</Text>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Task Details - Shown when expanded */}
        {isExpanded && (
          <View
            style={[
              styles.taskCardContent,
              {
                borderTopColor: colors.border,
                borderTopWidth: 1,
              },
            ]}
          >
            {/* Task Name */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Nombre de la tarea *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: nameError ? '#ef4444' : colors.border,
                  },
                ]}
                placeholder="ej. Fregar los platos"
                placeholderTextColor={colors.lightText}
                value={task.name}
                onChangeText={(text) => handleUpdateTask(index, 'name', text)}
                maxLength={100}
                editable={!isLoading}
              />
              <View style={styles.fieldFooter}>
                <Text style={[styles.characterCount, { color: colors.lightText }]}>
                  {task.name.length}/100
                </Text>
                {nameError && <Text style={[styles.errorText, { color: '#ef4444' }]}>{nameError}</Text>}
              </View>
            </View>

            {/* Task Description */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.label, { color: colors.text }]}>Descripción (opcional)</Text>
              <TextInput
                style={[
                  styles.textAreaInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: descriptionError ? '#ef4444' : colors.border,
                  },
                ]}
                placeholder="ej. Limpiar platos y sartenes"
                placeholderTextColor={colors.lightText}
                value={task.description}
                onChangeText={(text) => handleUpdateTask(index, 'description', text)}
                maxLength={1000}
                multiline
                numberOfLines={3}
                editable={!isLoading}
              />
              <View style={styles.fieldFooter}>
                <Text style={[styles.characterCount, { color: colors.lightText }]}>
                  {task.description.length}/1000
                </Text>
                {descriptionError && (
                  <Text style={[styles.errorText, { color: '#ef4444' }]}>{descriptionError}</Text>
                )}
              </View>
            </View>

            {/* Day of Week Selector */}
            {renderDaySelector(task, index)}

            {/* Effort Weight Selector */}
            {renderEffortWeightSelector(task, index)}

            {/* Assignment Type Selector */}
            {renderAssignmentTypeSelector(task, index)}

            {/* User Selector (if explicit) */}
            {renderUserSelector(task, index)}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {existingSchedule ? 'Editar Rutina' : 'Crear Rutina'}
        </Text>
      </View>

      {/* Global Error */}
      {globalError && (
        <View style={[styles.globalErrorContainer, { backgroundColor: '#fecaca' }]}>
          <Text style={[styles.globalErrorText, { color: '#991b1b' }]}>{globalError}</Text>
          <TouchableOpacity onPress={() => setGlobalError('')}>
            <Text style={{ fontSize: 18, color: '#991b1b' }}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Form Error */}
      {errors.global && (
        <View style={[styles.globalErrorContainer, { backgroundColor: '#fecaca' }]}>
          <Text style={[styles.globalErrorText, { color: '#991b1b' }]}>{errors.global}</Text>
        </View>
      )}

      {/* Tasks List */}
      <ScrollView
        style={styles.tasksList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.tasksListContent}
      >
        {tasks.map((task, index) => renderTaskCard(task, index))}

        {/* Add Task Button */}
        <TouchableOpacity
          style={[
            styles.addTaskButton,
            {
              backgroundColor: colors.tint,
            },
          ]}
          onPress={handleAddTask}
          disabled={isLoading}
        >
          <Text style={styles.addTaskButtonText}>+ Añadir tarea</Text>
        </TouchableOpacity>
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
          disabled={isLoading}
        >
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: colors.tint,
              opacity: isLoading ? 0.6 : 1,
            },
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {existingSchedule ? 'Guardar cambios' : 'Crear Rutina'}
            </Text>
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
  globalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 6,
  },
  globalErrorText: {
    fontSize: 14,
    flex: 1,
  },
  tasksList: {
    flex: 1,
  },
  tasksListContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 20,
  },
  taskCard: {
    borderTopWidth: 4,
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  taskCardHeaderContent: {
    flex: 1,
  },
  taskCardTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  taskCardMeta: {
    flexDirection: 'row',
  },
  taskCardMetaText: {
    fontSize: 12,
  },
  removeTaskButton: {
    padding: 4,
  },
  taskCardContent: {
    paddingHorizontal: 16,
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
    marginHorizontal: -16,
    paddingHorizontal: 16,
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
    marginHorizontal: -16,
    paddingHorizontal: 16,
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
    marginHorizontal: -16,
    paddingHorizontal: 16,
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
  addTaskButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  addTaskButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'web' ? 12 : 16 + (20 || 0), // Add space for safe area
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
