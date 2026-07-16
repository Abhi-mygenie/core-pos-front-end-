// CR-053: StaffDashboard — Manager view (stub for Checkpoint 2, full in Checkpoint 3)
import React from 'react';
import { useTraining } from '../TrainingProvider';

export function StaffDashboard() {
  const { view, staffData, close, error } = useTraining();

  if (view !== 'staff' && view !== 'employee_detail') return null;

  return (
    <div data-testid="training-staff-dashboard" style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      backgroundColor: 'rgba(9,9,11,0.4)', backdropFilter: 'blur(2px)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      paddingTop: '60px', overflowY: 'auto',
      fontFamily: "'Poppins', 'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        backgroundColor: '#F7F7F7', borderRadius: '20px', width: '900px', maxWidth: '95vw',
        maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
        animation: 'trainingSlideUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '28px 32px 20px', backgroundColor: '#FFFFFF',
          borderRadius: '20px 20px 0 0', borderBottom: '1px solid #E5E5E5',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A' }}>Staff Training</h1>
          <button data-testid="training-close-staff" onClick={close} style={{
            padding: '8px', borderRadius: '8px', border: '1px solid #E5E5E5',
            backgroundColor: 'transparent', cursor: 'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div style={{ margin: '16px 32px', padding: '12px 16px', backgroundColor: '#FEE2E2', borderRadius: '10px', color: '#EF4444', fontSize: '13px' }}>{error}</div>
        )}

        {/* KPI strip */}
        {staffData?.summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', padding: '20px 32px' }}>
            {[
              { label: 'Total Staff', value: staffData.summary.total_employees, color: '#1A1A1A' },
              { label: 'Fully Trained', value: staffData.summary.fully_trained, color: '#329937' },
              { label: 'Avg Progress', value: `${staffData.summary.avg_progress}%`, color: '#1A1A1A' },
              { label: 'Needs Attention', value: staffData.summary.needs_attention, color: '#F26B33' },
            ].map((kpi, i) => (
              <div key={i} style={{
                backgroundColor: '#FFFFFF', borderRadius: '12px', padding: '16px', border: '1px solid #E5E5E5',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#666666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{kpi.label}</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Employee table */}
        <div style={{ padding: '0 32px 32px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E5E5E5', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E5E5' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#666666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Employee</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#666666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                  {staffData?.courses?.map(c => (
                    <th key={c.course_id} style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 600, color: '#666666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.title.split(' ')[0]}</th>
                  ))}
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: '#666666', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall</th>
                </tr>
              </thead>
              <tbody>
                {staffData?.employees?.map(emp => (
                  <tr key={emp.employee_id} style={{ borderBottom: '1px solid #F0F0F0' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1A1A1A' }}>{emp.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px',
                        backgroundColor: emp.role === 'owner' ? 'rgba(50,153,55,0.08)' : emp.role === 'manager' ? 'rgba(244,161,26,0.1)' : '#F7F7F7',
                        color: emp.role === 'owner' ? '#329937' : emp.role === 'manager' ? '#F4A11A' : '#666666',
                        textTransform: 'capitalize',
                      }}>{emp.role}</span>
                    </td>
                    {staffData?.courses?.map(c => {
                      const cp = emp.courses[c.course_id];
                      if (!cp) return <td key={c.course_id} style={{ padding: '12px 8px', textAlign: 'center', color: '#E5E5E5' }}>—</td>;
                      return (
                        <td key={c.course_id} style={{ padding: '12px 8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <div style={{ width: '50px', height: '4px', backgroundColor: '#E5E5E5', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${cp.progress}%`, height: '100%', backgroundColor: '#329937', borderRadius: '2px' }} />
                            </div>
                            <span style={{ fontSize: '11px', color: '#666666', minWidth: '28px' }}>{cp.completed}/{cp.total}</span>
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600, color: emp.overall_progress >= 80 ? '#329937' : emp.overall_progress >= 40 ? '#F4A11A' : '#F26B33' }}>
                      {emp.overall_progress}%
                    </td>
                  </tr>
                ))}
                {(!staffData?.employees || staffData.employees.length === 0) && (
                  <tr>
                    <td colSpan={99} style={{ padding: '32px', textAlign: 'center', color: '#666666' }}>
                      No training data yet. Staff progress will appear here as employees start their training.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
