// CR-053: TrainingHome — Employee dashboard with explicit mission picker
// CR-053-UX-01: Removed silent auto-chain. Each mission shows its own status + action button.
import React from 'react';
import { useTraining } from '../TrainingProvider';

export function TrainingHome() {
  const {
    view, courses, progress, employee, error,
    activeCourse, missionsForCourse, missionStatus,
    close, openHome, openMissionPicker, startMission, retourMission,
  } = useTraining();

  if (view !== 'home') return null;

  // Detail view: a course is expanded → show mission picker
  const isDetailView = !!activeCourse;

  return (
    <div data-testid="training-home" style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      backgroundColor: 'rgba(9,9,11,0.4)', backdropFilter: 'blur(2px)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      paddingTop: '60px', overflowY: 'auto',
      fontFamily: "'Poppins', 'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        backgroundColor: '#F7F7F7', borderRadius: '20px', width: '720px', maxWidth: '95vw',
        maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
        animation: 'trainingSlideUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '28px 32px 20px', backgroundColor: '#FFFFFF',
          borderRadius: '20px 20px 0 0', borderBottom: '1px solid #E5E5E5',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        }}>
          <div>
            {isDetailView && (
              <button
                data-testid="training-back-to-courses"
                onClick={() => openHome()}
                style={{
                  marginBottom: '8px', background: 'none', border: 'none',
                  color: '#329937', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: '4px',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Back to courses
              </button>
            )}
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A', marginBottom: '4px' }}>
              {isDetailView ? activeCourse.title : 'Training Academy'}
            </h1>
            <p style={{ fontSize: '14px', color: '#666666' }}>
              {isDetailView
                ? activeCourse.description
                : `Welcome back${employee?.name ? `, ${employee.name}` : ''}. Pick a course to start.`}
            </p>
            {progress && !isDetailView && (
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '200px', height: '6px', backgroundColor: '#E5E5E5', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress.overall_progress}%`, height: '100%', backgroundColor: '#329937', borderRadius: '3px', transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#329937' }}>
                  {progress.overall_progress}% complete
                </span>
                <span style={{ fontSize: '12px', color: '#666666' }}>
                  ({progress.total_completed}/{progress.total_missions} missions)
                </span>
              </div>
            )}
          </div>
          <button data-testid="training-close-home" onClick={close} style={{
            padding: '8px', borderRadius: '8px', border: '1px solid #E5E5E5',
            backgroundColor: 'transparent', cursor: 'pointer', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ margin: '16px 32px', padding: '12px 16px', backgroundColor: '#FEE2E2', borderRadius: '10px', color: '#EF4444', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {/* Body */}
        {isDetailView ? (
          <MissionPicker
            missions={missionsForCourse}
            missionStatus={missionStatus}
            courseId={activeCourse.course_id}
            startMission={startMission}
            retourMission={retourMission}
          />
        ) : (
          <CourseGrid
            courses={courses}
            openMissionPicker={openMissionPicker}
          />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
function CourseGrid({ courses, openMissionPicker }) {
  return (
    <div style={{ padding: '24px 32px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
      {courses.map(course => {
        const isCompleted = course.status === 'completed';
        const hasProgress = course.completed > 0 || course.in_progress > 0;

        return (
          <div key={course.course_id} data-testid={`course-card-${course.course_id}`} style={{
            backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E5E5E5',
            overflow: 'hidden', transition: 'all 0.2s',
          }}>
            <div style={{ height: '6px', backgroundColor: isCompleted ? '#329937' : course.cover_color || '#329937' }} />
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1A1A1A' }}>{course.title}</h3>
                {isCompleted && (
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#329937', backgroundColor: 'rgba(50,153,55,0.08)', padding: '3px 8px', borderRadius: '20px' }}>
                    Completed
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', fontSize: '12px', color: '#666666' }}>
                <span>{course.total_missions} missions</span>
                <span style={{ color: '#E5E5E5' }}>|</span>
                <span>~{course.estimated_time_minutes} min</span>
                <span style={{ color: '#E5E5E5' }}>|</span>
                <span style={{
                  color: course.difficulty === 'advanced' ? '#F26B33' : course.difficulty === 'intermediate' ? '#F4A11A' : '#329937',
                  fontWeight: 500, textTransform: 'capitalize',
                }}>{course.difficulty}</span>
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ width: '100%', height: '4px', backgroundColor: '#E5E5E5', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${course.progress}%`, height: '100%',
                    backgroundColor: '#329937', borderRadius: '2px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <div style={{ fontSize: '11px', color: '#666666', marginTop: '4px' }}>
                  {course.completed}/{course.total_missions} completed
                </div>
              </div>
              <button
                data-testid={`open-course-${course.course_id}`}
                onClick={() => openMissionPicker(course.course_id)}
                style={{
                  width: '100%', padding: '10px', borderRadius: '10px',
                  backgroundColor: hasProgress ? '#329937' : 'transparent',
                  color: hasProgress ? '#FFFFFF' : '#329937',
                  border: hasProgress ? 'none' : '1.5px solid #329937',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.2s',
                }}
              >
                {isCompleted ? 'Re-tour missions' : (hasProgress ? 'Continue Course' : 'Start Course')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
function MissionPicker({ missions, missionStatus, courseId, startMission, retourMission }) {
  // Determine which mission is "next" — first non-completed, non-optional
  const firstUncompleted = missions.findIndex(m =>
    !m.is_optional && missionStatus[m.mission_id] !== 'completed'
  );

  return (
    <div style={{ padding: '20px 32px 32px' }}>
      {missions.map((m, idx) => {
        const status = missionStatus[m.mission_id] || 'not_started';
        const isCompleted = status === 'completed';
        const isInProgress = status === 'in_progress';
        const isNext = idx === firstUncompleted;
        // CR-053-UX-01: enforce ordering on first pass — lock missions after the next one
        // (optional missions are never locked)
        const isLocked = !m.is_optional && !isCompleted && !isInProgress && firstUncompleted >= 0 && idx > firstUncompleted;

        const badge = isCompleted ? { text: 'Completed', color: '#329937', bg: 'rgba(50,153,55,0.10)' }
                    : isInProgress ? { text: 'In progress', color: '#F4A11A', bg: 'rgba(244,161,26,0.10)' }
                    : isNext       ? { text: 'Next', color: '#F26B33', bg: 'rgba(242,107,51,0.10)' }
                    : m.is_optional ? { text: 'Optional', color: '#666666', bg: '#F0F0F0' }
                    : isLocked     ? { text: 'Locked', color: '#999999', bg: '#F0F0F0' }
                    : { text: 'Not started', color: '#666666', bg: '#F0F0F0' };

        return (
          <div
            key={m.mission_id}
            data-testid={`mission-row-${m.mission_id}`}
            style={{
              backgroundColor: '#FFFFFF', borderRadius: '12px', border: isNext ? '2px solid #F26B33' : '1px solid #E5E5E5',
              padding: '16px 18px', marginBottom: '10px',
              display: 'flex', alignItems: 'center', gap: '14px',
              opacity: isLocked ? 0.55 : 1,
              transition: 'all 0.2s',
            }}
          >
            {/* Index */}
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              backgroundColor: isCompleted ? '#329937' : isNext ? '#F26B33' : '#F0F0F0',
              color: (isCompleted || isNext) ? '#FFFFFF' : '#999999',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, flexShrink: 0,
            }}>
              {isCompleted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ) : (m.display_order || (idx + 1))}
            </div>

            {/* Title + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1A1A1A', margin: 0 }}>
                  {m.title}
                </h4>
                <span style={{
                  fontSize: '10px', fontWeight: 600, color: badge.color, backgroundColor: badge.bg,
                  padding: '2px 8px', borderRadius: '20px', letterSpacing: '0.02em',
                }}>
                  {badge.text}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#666666', lineHeight: 1.4 }}>
                {m.description}
              </div>
              <div style={{ fontSize: '11px', color: '#999999', marginTop: '4px' }}>
                {m.step_count} steps · ~{m.estimated_time_minutes} min
              </div>
            </div>

            {/* Action */}
            <div style={{ flexShrink: 0 }}>
              {isLocked ? (
                <div style={{ fontSize: '11px', color: '#999999', fontWeight: 500 }}>
                  Locked
                </div>
              ) : isCompleted ? (
                <button
                  data-testid={`retour-mission-${m.mission_id}`}
                  onClick={() => retourMission(courseId, m.mission_id)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', backgroundColor: 'transparent',
                    color: '#329937', border: '1px solid #329937', cursor: 'pointer',
                    fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
                  }}
                >
                  Re-tour
                </button>
              ) : (
                <button
                  data-testid={`start-mission-${m.mission_id}`}
                  onClick={() => startMission(courseId, m.mission_id)}
                  style={{
                    padding: '8px 18px', borderRadius: '8px',
                    backgroundColor: isNext ? '#F26B33' : '#329937',
                    color: '#FFFFFF', border: 'none', cursor: 'pointer',
                    fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
                  }}
                >
                  {isInProgress ? 'Resume' : 'Start'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
