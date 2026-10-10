// CR-380: GuestDocsSection — ID document capture for PMS Check-In.
// Used for primary guest and each extra adult slot.
import { useRef } from 'react';
import { Image } from 'lucide-react';

export const ID_TYPES = [
  { value: 'Aadhar card', label: 'Aadhaar' },
  { value: 'Passport',    label: 'Passport' },
  { value: 'PAN card',    label: 'PAN' },
  { value: 'License',     label: 'Driving License' },
  { value: 'Voter ID',    label: 'Voter ID' },
];

// CRM doc_type map — exported for use in CheckInPage handleConfirm uploadDocument call
export const CRM_DOC_TYPE = {
  'Aadhar card': 'aadhaar',
  'Passport':    'passport',
  'PAN card':    'pan_card',
  'License':     'license',
  'Voter ID':    'voter_id',
};

/**
 * GuestDocsSection — ID document capture tile
 * @param {string}    label          - e.g. 'Primary Guest', 'Adult 2'
 * @param {string}    idType         - selected ID type value
 * @param {function}  onIdTypeChange - (value: string) => void
 * @param {File|null} frontImage     - selected front image file
 * @param {function}  onFrontChange  - (file: File|null) => void
 * @param {File|null} backImage      - selected back image file (optional)
 * @param {function}  onBackChange   - (file: File|null) => void
 * @param {boolean}   required       - show Required indicator when no frontImage + no crmDocs
 * @param {boolean}   hasCrmDocs     - returning guest has docs on file → show skip note
 * @param {string}    inputCls       - base input CSS classes from parent
 */
export default function GuestDocsSection({
  label = 'Primary Guest',
  idType,
  onIdTypeChange,
  frontImage,
  onFrontChange,
  backImage,
  onBackChange,
  required = false,
  hasCrmDocs = false,
  inputCls = '',
}) {
  const frontRef = useRef(null);
  const backRef  = useRef(null);
  const testId   = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <label className="text-[12px] text-[#888] font-medium">
          {label} — ID Document
        </label>
        {required && !hasCrmDocs && !frontImage && (
          <span className="text-[10px] text-red-500 font-semibold">Required</span>
        )}
        {hasCrmDocs && (
          <span className="text-[10px] text-[#329937] font-medium">Docs on file — upload to update</span>
        )}
      </div>

      {/* ID type picker */}
      <select
        data-testid={`ci-id-type-${testId}`}
        value={idType}
        onChange={e => onIdTypeChange(e.target.value)}
        className={inputCls}
      >
        {ID_TYPES.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Front + Back upload tiles */}
      <div className="grid grid-cols-2 gap-2">
        {/* Front */}
        <div>
          <div
            data-testid={`ci-front-upload-${testId}`}
            onClick={() => frontRef.current?.click()}
            className={`flex items-center justify-center gap-1.5 border-2 border-dashed rounded-lg h-[52px] cursor-pointer text-[11px] transition-colors ${
              frontImage
                ? 'border-[#329937] bg-[#F0FDF4] text-[#329937]'
                : 'border-[#E5E5E5] text-[#888] hover:border-[#329937]'
            }`}
          >
            {frontImage ? (
              <span className="font-medium truncate px-1 max-w-[90%]">✓ {frontImage.name}</span>
            ) : (
              <><Image className="w-3.5 h-3.5 shrink-0" /><span>Front</span></>
            )}
          </div>
          <input
            ref={frontRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={e => onFrontChange(e.target.files?.[0] || null)}
          />
        </div>

        {/* Back (optional) */}
        <div>
          <div
            data-testid={`ci-back-upload-${testId}`}
            onClick={() => backRef.current?.click()}
            className={`flex items-center justify-center gap-1.5 border-2 border-dashed rounded-lg h-[52px] cursor-pointer text-[11px] transition-colors ${
              backImage
                ? 'border-[#329937] bg-[#F0FDF4] text-[#329937]'
                : 'border-[#E5E5E5] text-[#888] hover:border-[#329937]'
            }`}
          >
            {backImage ? (
              <span className="font-medium truncate px-1 max-w-[90%]">✓ {backImage.name}</span>
            ) : (
              <><Image className="w-3.5 h-3.5 shrink-0" /><span>Back (opt.)</span></>
            )}
          </div>
          <input
            ref={backRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={e => onBackChange(e.target.files?.[0] || null)}
          />
        </div>
      </div>
    </div>
  );
}
