import { useState, useEffect } from 'react';
import { ArrowLeft, Save, FileText, Plus, Trash2, GripVertical } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { COLORS } from '../../constants';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

const TermsForm = ({ onBack }) => {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [terms, setTerms] = useState([]);
  const [newTerm, setNewTerm] = useState('');

  useEffect(() => {
    if (profile?.terms_conditions) {
      setTerms(profile.terms_conditions);
    }
  }, [profile]);

  const handleAddTerm = () => {
    if (!newTerm.trim()) {
      toast.error('Please enter a term');
      return;
    }
    setTerms(prev => [...prev, newTerm.trim()]);
    setNewTerm('');
    setHasChanges(true);
  };

  const handleDeleteTerm = (index) => {
    setTerms(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleUpdateTerm = (index, value) => {
    setTerms(prev => prev.map((t, i) => i === index ? value : t));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Call update API when available
      toast.success('Terms & conditions saved successfully');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save terms & conditions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="terms-form">
      {/* Header */}
      <div 
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: COLORS.borderGray }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            data-testid="terms-back"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Terms & Conditions
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
          data-testid="terms-save"
        >
          <Save className="w-4 h-4" />
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl space-y-4">
          {/* Info */}
          <div 
            className="p-4 rounded-lg flex items-start gap-3"
            style={{ backgroundColor: `${COLORS.primaryGreen}10` }}
          >
            <FileText className="w-5 h-5 mt-0.5" style={{ color: COLORS.primaryGreen }} />
            <div>
              <p className="text-sm font-medium" style={{ color: COLORS.darkText }}>
                Bill Terms & Conditions
              </p>
              <p className="text-xs" style={{ color: COLORS.grayText }}>
                These terms will appear at the bottom of printed bills
              </p>
            </div>
          </div>

          {/* Add New Term */}
          <div 
            className="p-4 rounded-xl"
            style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
          >
            <div className="flex gap-2">
              <Input
                value={newTerm}
                onChange={(e) => setNewTerm(e.target.value)}
                placeholder="Enter a new term or condition..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddTerm()}
                data-testid="input-new-term"
              />
              <Button 
                onClick={handleAddTerm}
                className="gap-2"
                style={{ backgroundColor: COLORS.primaryGreen }}
                data-testid="add-term"
              >
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
          </div>

          {/* Terms List */}
          <div className="space-y-2">
            {terms.map((term, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl group"
                style={{ backgroundColor: COLORS.sectionBg, border: `1px solid ${COLORS.borderGray}` }}
                data-testid={`term-item-${index}`}
              >
                <span 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                  style={{ backgroundColor: COLORS.primaryGreen, color: 'white' }}
                >
                  {index + 1}
                </span>
                <Input
                  value={term}
                  onChange={(e) => handleUpdateTerm(index, e.target.value)}
                  className="flex-1"
                  data-testid={`input-term-${index}`}
                />
                <button 
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  onClick={() => handleDeleteTerm(index)}
                  data-testid={`delete-term-${index}`}
                >
                  <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
                </button>
              </div>
            ))}

            {terms.length === 0 && (
              <div 
                className="flex flex-col items-center justify-center py-12 rounded-xl"
                style={{ backgroundColor: COLORS.sectionBg, border: `2px dashed ${COLORS.borderGray}` }}
              >
                <FileText className="w-12 h-12 mb-4" style={{ color: COLORS.grayText }} />
                <p className="font-medium" style={{ color: COLORS.darkText }}>No terms added</p>
                <p className="text-sm" style={{ color: COLORS.grayText }}>
                  Add terms and conditions that will appear on bills
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsForm;
