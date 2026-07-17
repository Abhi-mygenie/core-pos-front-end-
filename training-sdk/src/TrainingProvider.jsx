// CR-053: Training Provider — Context with state machine for entire training flow
// CR-053-UX-01: Added stuck-detector state + Read-and-Explore semantics
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { trainingApi } from './api/trainingApi';

const TrainingContext = createContext(null);
export const useTraining = () => useContext(TrainingContext);

// Views: closed, home, staff, mission
// Mission states: idle, loading, step_active, validating, step_success, transitioning, mission_done, paused, stuck
const INITIAL_STATE = {
  view: 'closed',
  missionState: 'idle',
  courses: [],
  progress: null,
  missionStatus: {},        // CR-053-UX-01: { mission_id: status }
  activeCourse: null,
  activeMission: null,
  activeMissionSteps: [],
  currentStepIndex: 0,
  completedStepIds: [],
  employee: null,
  staffData: null,
  selectedEmployee: null,
  error: null,
  isStuck: false,           // CR-053-UX-01: true when target not in DOM > threshold
  missionsForCourse: [],    // CR-053-UX-01: list of missions for picker
};

export function TrainingProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);
  const stepTimerRef = useRef(null);

  const set = useCallback((partial) => setState(prev => ({ ...prev, ...partial })), []);

  // Open/close views
  const openHome = useCallback(async () => {
    set({ view: 'home', error: null, activeCourse: null, missionsForCourse: [] });
    try {
      const data = await trainingApi.getMyProgress();
      set({
        courses: data.courses,
        progress: data,
        employee: data.employee,
        missionStatus: data.mission_status || {},
      });
    } catch (e) {
      set({ error: 'Failed to load training data' });
    }
  }, [set]);

  // CR-053-UX-01: explicit mission picker — load missions for a course
  const openMissionPicker = useCallback(async (courseId) => {
    try {
      const data = await trainingApi.getMissions(courseId);
      set({
        activeCourse: data.course,
        missionsForCourse: data.missions || [],
      });
    } catch (e) {
      set({ error: 'Failed to load missions' });
    }
  }, [set]);

  const openStaffDashboard = useCallback(async () => {
    set({ view: 'staff', error: null });
    try {
      const data = await trainingApi.getStaffOverview();
      set({ staffData: data });
    } catch (e) {
      set({ error: 'Failed to load staff data' });
    }
  }, [set]);

  const openEmployeeDetail = useCallback(async (empId) => {
    set({ view: 'employee_detail', error: null });
    try {
      const data = await trainingApi.getEmployeeDetail(empId);
      set({ selectedEmployee: data });
    } catch (e) {
      set({ error: 'Failed to load employee data' });
    }
  }, [set]);

  const close = useCallback(() => {
    set({
      view: 'closed', missionState: 'idle',
      activeMission: null, activeCourse: null, activeMissionSteps: [],
      currentStepIndex: 0, completedStepIds: [], isStuck: false,
      missionsForCourse: [],
    });
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
  }, [set]);

  // Mission execution
  const startMission = useCallback(async (courseId, missionId) => {
    set({ missionState: 'loading', view: 'closed', isStuck: false });
    try {
      const courseData = await trainingApi.getMissions(courseId);
      const mission = courseData.missions.find(m => m.mission_id === missionId);
      if (!mission) throw new Error('Mission not found');

      const progress = await trainingApi.startMission(courseId, missionId);

      // CR-053-UX-01: completed missions can be re-toured from step 1
      const startIdx = (progress.status === 'resumed' && progress.current_step)
        ? Math.max(0, mission.steps.findIndex(s => s.step_id === progress.current_step))
        : 0;

      set({
        missionState: 'step_active',
        activeCourse: courseData.course,
        activeMission: mission,
        activeMissionSteps: mission.steps,
        currentStepIndex: startIdx,
        completedStepIds: progress.steps_completed || [],
        isStuck: false,
      });
    } catch (e) {
      console.error('[Training SDK] Failed to start mission:', e);
      set({ missionState: 'idle', error: 'Failed to start mission' });
    }
  }, [set]);

  // CR-053-UX-01: re-tour any completed mission (resets + starts)
  const retourMission = useCallback(async (courseId, missionId) => {
    try {
      await trainingApi.resetMission(courseId, missionId);
    } catch (e) { /* silent */ }
    return startMission(courseId, missionId);
  }, [startMission]);

  const completeCurrentStep = useCallback(async () => {
    const { activeMission, activeMissionSteps, currentStepIndex, completedStepIds } = state;
    if (!activeMission || !activeMissionSteps[currentStepIndex]) return;

    const step = activeMissionSteps[currentStepIndex];
    set({ missionState: 'step_success', isStuck: false });

    try {
      await trainingApi.completeStep(
        activeMission.course_id, activeMission.mission_id,
        step.step_id, 0
      );
    } catch (e) {
      console.warn('[Training SDK] Failed to save step progress:', e);
    }

    const newCompleted = [...completedStepIds, step.step_id];
    const nextIdx = currentStepIndex + 1;
    const isLastStep = nextIdx >= activeMissionSteps.length;

    setTimeout(() => {
      if (isLastStep) {
        set({ missionState: 'mission_done', completedStepIds: newCompleted });
      } else {
        set({
          missionState: 'step_active',
          currentStepIndex: nextIdx,
          completedStepIds: newCompleted,
          isStuck: false,
        });
      }
    }, 700);
  }, [state, set]);

  const skipMission = useCallback(async () => {
    const { activeMission } = state;
    if (!activeMission) return;
    try {
      await trainingApi.skipMission(activeMission.course_id, activeMission.mission_id, 'User skipped');
    } catch (e) { /* silent */ }
    set({ missionState: 'idle', activeMission: null, view: 'closed', isStuck: false });
  }, [state, set]);

  const exitMission = useCallback(() => {
    set({
      missionState: 'idle', activeMission: null, activeCourse: null,
      activeMissionSteps: [], currentStepIndex: 0, completedStepIds: [],
      view: 'closed', isStuck: false,
    });
  }, [set]);

  // CR-053-UX-01: finishMission — return to mission picker (not auto-chain)
  const finishMission = useCallback(() => {
    const { activeCourse } = state;
    set({
      missionState: 'idle', activeMission: null,
      activeMissionSteps: [], currentStepIndex: 0, completedStepIds: [],
      view: 'home', isStuck: false,
    });
    // Refresh progress + re-open picker for same course
    (async () => {
      const data = await trainingApi.getMyProgress();
      set({
        courses: data.courses, progress: data, employee: data.employee,
        missionStatus: data.mission_status || {},
      });
      if (activeCourse) {
        const missionsData = await trainingApi.getMissions(activeCourse.course_id);
        set({ missionsForCourse: missionsData.missions || [] });
      }
    })();
  }, [state, set]);

  // CR-053-UX-01: stuck-detector — called by MissionExecutor when target absent
  const reportStuck = useCallback((stuck) => {
    set({ isStuck: stuck });
  }, [set]);

  // CR-053-UX-01: recovery actions from stuck card
  const recoverGoToMenu = useCallback(() => {
    window.location.hash = '/menu';
    if (!window.location.pathname.includes('/menu')) {
      window.location.pathname = '/menu';
    }
    set({ isStuck: false });
  }, [set]);

  const currentStep = state.activeMissionSteps[state.currentStepIndex] || null;

  const value = {
    ...state,
    currentStep,
    openHome,
    openMissionPicker,
    openStaffDashboard,
    openEmployeeDetail,
    close,
    startMission,
    retourMission,
    completeCurrentStep,
    skipMission,
    exitMission,
    finishMission,
    reportStuck,
    recoverGoToMenu,
  };

  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  );
}
