// CR-053: MissionExecutor — Orchestrates the overlay experience
// CR-053-UX-01: Added stuck-detector + tutorial banner + RecoveryCard
import React, { useCallback, useEffect, useState } from 'react';
import { useTraining } from '../TrainingProvider';
import { Spotlight } from './Spotlight';
import { PulseRing } from './PulseRing';
import { InstructionTooltip } from './InstructionTooltip';
import { TrainingTopBar } from './TrainingTopBar';
import { CompletionScreen } from './CompletionScreen';
import { RecoveryCard } from './RecoveryCard';
import { useStepValidation } from '../validator/StepValidator';

const STUCK_THRESHOLD_MS = 3500;

export function MissionExecutor() {
  const {
    missionState, activeCourse, activeMission, activeMissionSteps,
    currentStepIndex, currentStep, completedStepIds,
    completeCurrentStep, skipMission, exitMission, finishMission,
    isStuck, reportStuck, recoverGoToMenu,
  } = useTraining();

  const [showStuckCard, setShowStuckCard] = useState(false);

  // Step validation — watches DOM for correct user action
  const onStepValidated = useCallback(() => {
    completeCurrentStep();
  }, [completeCurrentStep]);

  useStepValidation(currentStep, missionState, onStepValidated);

  // CR-053-UX-01: stuck-detector — if target absent for STUCK_THRESHOLD_MS, surface recovery
  useEffect(() => {
    if (!currentStep || missionState !== 'step_active') {
      setShowStuckCard(false);
      reportStuck(false);
      return;
    }
    if (!currentStep.target) {
      setShowStuckCard(false);
      return;
    }
    let stuckTimer = null;
    const checkTarget = () => {
      const el = document.querySelector(currentStep.target);
      if (!el || el.offsetParent === null) {
        if (!stuckTimer) {
          stuckTimer = setTimeout(() => {
            setShowStuckCard(true);
            reportStuck(true);
          }, STUCK_THRESHOLD_MS);
        }
      } else {
        if (stuckTimer) { clearTimeout(stuckTimer); stuckTimer = null; }
        setShowStuckCard(false);
        reportStuck(false);
      }
    };
    checkTarget();
    const interval = setInterval(checkTarget, 600);
    return () => {
      if (stuckTimer) clearTimeout(stuckTimer);
      clearInterval(interval);
    };
  }, [currentStep, missionState, reportStuck]);

  // Manual "I'm stuck" trigger from TopBar
  const onUserSaysStuck = useCallback(() => {
    setShowStuckCard(true);
  }, []);

  // Recovery card actions
  const dismissStuckCard = useCallback(() => {
    setShowStuckCard(false);
    reportStuck(false);
  }, [reportStuck]);

  if (missionState === 'idle') return null;

  if (missionState === 'loading') {
    return (
      <div data-testid="training-loading" style={{
        position: 'fixed', inset: 0, zIndex: 10010,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(9,9,11,0.5)',
        fontFamily: "'Poppins', 'Inter', -apple-system, sans-serif",
      }}>
        <div style={{
          backgroundColor: '#FFF', borderRadius: '16px', padding: '32px 40px',
          textAlign: 'center', boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
        }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid #E5E5E5',
            borderTopColor: '#329937', borderRadius: '50%',
            animation: 'trainingSpin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <div style={{ fontSize: '14px', color: '#666666', fontWeight: 500 }}>Loading mission...</div>
        </div>
      </div>
    );
  }

  if (missionState === 'mission_done') {
    return (
      <CompletionScreen
        mission={activeMission}
        course={activeCourse}
        onFinish={finishMission}
      />
    );
  }

  if (!currentStep) return null;
  const isSuccess = missionState === 'step_success';
  const stepType = currentStep.step_type || 'highlight';

  return (
    <>
      {/* Top bar */}
      <TrainingTopBar
        courseName={activeCourse?.title || ''}
        missionTitle={activeMission?.title || ''}
        stepIndex={currentStepIndex}
        totalSteps={activeMissionSteps.length}
        onExit={exitMission}
        onUserSaysStuck={onUserSaysStuck}
      />

      {/* CR-053-UX-01: Persistent tutorial banner under the top bar */}
      <div data-testid="training-tutorial-banner" style={{
        position: 'fixed', top: '48px', left: 0, right: 0,
        backgroundColor: 'rgba(244,161,26,0.95)',
        color: '#1A1A1A',
        padding: '6px 20px', fontSize: '12px', fontWeight: 600,
        textAlign: 'center', zIndex: 10005,
        fontFamily: "'Poppins', 'Inter', -apple-system, sans-serif",
        boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
      }}>
        🎓 Tutorial mode — for learning only. Nothing here saves to your menu.
      </div>

      {/* Spotlight with dark backdrop */}
      <Spotlight targetSelector={currentStep.target}>
        <InstructionTooltip
          step={currentStep}
          stepIndex={currentStepIndex}
          totalSteps={activeMissionSteps.length}
          onNext={completeCurrentStep}
          onSkip={skipMission}
          autoAdvanceSeconds={currentStep.auto_advance_seconds}
          missionState={missionState}
          stepType={stepType}
        />
      </Spotlight>

      {/* Pulse ring around target — green for highlight/explore, amber for for_real */}
      <PulseRing
        targetSelector={currentStep.target}
        color={stepType === 'for_real' ? '#F4A11A' : '#329937'}
      />

      {/* Success checkmark flash */}
      {isSuccess && currentStep.target && (
        <div data-testid="training-step-success" style={{
          position: 'fixed', inset: 0, zIndex: 10008,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            backgroundColor: '#329937', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            animation: 'trainingCheckPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 8px 32px rgba(50,153,55,0.4)',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      )}

      {/* Recovery card on stuck */}
      {showStuckCard && (
        <RecoveryCard
          step={currentStep}
          onTakeMeToMenu={recoverGoToMenu}
          onDismiss={dismissStuckCard}
          onSkipStep={completeCurrentStep}
          onEndMission={exitMission}
        />
      )}
    </>
  );
}
