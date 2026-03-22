import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { COLORS } from '../../constants';

export const SortableItem = ({ id, children, className = '', style = {} }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const sortableStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    ...style,
  };

  return (
    <div ref={setNodeRef} style={sortableStyle} className={className}>
      {children({ attributes, listeners, isDragging })}
    </div>
  );
};

export const DragHandle = ({ listeners, attributes }) => (
  <div
    {...listeners}
    {...attributes}
    className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 transition-colors"
    style={{ touchAction: 'none' }}
  >
    <GripVertical className="w-4 h-4" style={{ color: COLORS.grayText }} />
  </div>
);

export default SortableItem;
