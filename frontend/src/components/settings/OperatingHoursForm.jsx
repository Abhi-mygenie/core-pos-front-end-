import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Save, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const OperatingHoursForm = ({ onBack }) => {
  const { restaurant } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [schedules, setSchedules] = useState([]);

  useEffect(() => {
    if (restaurant?.schedules) {
      // Sort schedules by day
      const sorted = [...restaurant.schedules].sort((a, b) => a.day - b.day);
      setSchedules(sorted.map(s => ({
        ...s,
        isOpen: s.opening_time !== s.closing_time,
      })));
    } else {
      // Initialize with default schedule
      setSchedules(DAYS.map(d => ({
        day: d.value,
        opening_time: '09:00:00',
        closing_time: '22:00:00',
        isOpen: true,
      })));
    }
  }, [restaurant]);

  const handleTimeChange = (dayIndex, field, value) => {
    setSchedules(prev => prev.map((s, i) => 
      i === dayIndex ? { ...s, [field]: value } : s
    ));
    setHasChanges(true);
  };

  const handleToggleDay = (dayIndex) => {
    setSchedules(prev => prev.map((s, i) => 
      i === dayIndex ? { ...s, isOpen: !s.isOpen } : s
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Call update API when available
      toast.success('Operating hours saved successfully');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save operating hours');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeForDisplay = (time) => {
    if (!time) return '';
    return time.substring(0, 5); // Remove seconds
  };

  return (
    <div className="flex flex-col h-full" data-testid="operating-hours-form">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="operating-hours-back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Operating Hours
          </h2>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
          className="gap-2"
          style={{ 
            backgroundColor: hasChanges ? COLORS.primaryGreen : COLORS.borderGray,
            color: hasChanges ? 'white' : COLORS.grayText 
          }}
          data-testid="operating-hours-save"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-4">
          {schedules.map((schedule, index) => {
            const dayInfo = DAYS.find(d => d.value === schedule.day);
            return (
              <div 
                key={schedule.day}
                className="flex items-center gap-4 p-4 rounded-xl"
                style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
              >
                <div className="w-28">
                  <span className="font-medium" style={{ color: COLORS.darkText }}>
                    {dayInfo?.label}
                  </span>
                </div>
                
                <Switch
                  checked={schedule.isOpen}
                  onCheckedChange={() => handleToggleDay(index)}
                  data-testid={`day-toggle-${schedule.day}`}
                />
                
                <span 
                  className="text-sm w-16"
                  style={{ color: schedule.isOpen ? COLORS.primaryGreen : COLORS.grayText }}
                >
                  {schedule.isOpen ? 'Open' : 'Closed'}
                </span>

                {schedule.isOpen && (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: COLORS.grayText }} />
                      <Input
                        type="time"
                        value={formatTimeForDisplay(schedule.opening_time)}
                        onChange={(e) => handleTimeChange(index, 'opening_time', e.target.value + ':00')}
                        className="w-32"
                        data-testid={`opening-time-${schedule.day}`}
                      />
                    </div>
                    <span style={{ color: COLORS.grayText }}>to</span>
                    <Input
                      type="time"
                      value={formatTimeForDisplay(schedule.closing_time)}
                      onChange={(e) => handleTimeChange(index, 'closing_time', e.target.value + ':00')}
                      className="w-32"
                      data-testid={`closing-time-${schedule.day}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OperatingHoursForm;
