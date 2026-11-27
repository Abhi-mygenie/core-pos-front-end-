// CR-482 P19: TableJumpChip — fixed bottom-centre chip for type-to-jump on dashboard
import { COLORS } from '../../constants';

const TableJumpChip = ({ buffer, matchCount, matchIndex, notFound, notInView }) => {
  if (!buffer) return null;

  let label = '';
  let bgColor = COLORS.primaryGreen;

  if (notInView) {
    label = `${buffer} - not in this view`;
    bgColor = COLORS.grayText;
  } else if (notFound) {
    label = `${buffer} - not found`;
    bgColor = '#EF4444';
  } else if (matchCount > 1) {
    label = `Table: ${buffer}  ·  ${matchIndex + 1} of ${matchCount}`;
  } else {
    label = `Table: ${buffer}`;
  }

  return (
    <div
      data-testid="table-jump-chip"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] px-4 py-2 rounded-full text-white text-sm font-medium shadow-lg"
      style={{ backgroundColor: bgColor }}
    >
      {label}
    </div>
  );
};

export default TableJumpChip;
