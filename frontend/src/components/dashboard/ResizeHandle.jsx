import { useRef, useEffect } from 'react';
import { COLORS } from '../../constants';

/**
 * ResizeHandle - Draggable vertical bar for resizing adjacent columns
 * Using vanilla JS approach for reliability
 */
const ResizeHandle = ({ onDrag, onDragStart, onDragEnd }) => {
  const handleRef = useRef(null);
  const dragStateRef = useRef({ isDragging: false, startX: 0 });
  const callbacksRef = useRef({ onDrag, onDragStart, onDragEnd });

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = { onDrag, onDragStart, onDragEnd };
  }, [onDrag, onDragStart, onDragEnd]);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    const onMouseDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      dragStateRef.current.isDragging = true;
      dragStateRef.current.startX = e.clientX;
      
      console.log('[ResizeHandle] MOUSEDOWN at', e.clientX);
      
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      callbacksRef.current.onDragStart?.();
    };

    const onMouseMove = (e) => {
      if (!dragStateRef.current.isDragging) return;
      
      const deltaX = e.clientX - dragStateRef.current.startX;
      dragStateRef.current.startX = e.clientX;
      
      console.log('[ResizeHandle] MOUSEMOVE deltaX:', deltaX);
      
      if (deltaX !== 0) {
        callbacksRef.current.onDrag?.(deltaX);
      }
    };

    const onMouseUp = () => {
      if (!dragStateRef.current.isDragging) return;
      
      console.log('[ResizeHandle] MOUSEUP');
      
      dragStateRef.current.isDragging = false;
      
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      
      callbacksRef.current.onDragEnd?.();
    };

    // Attach mousedown to the handle element
    handle.addEventListener('mousedown', onMouseDown);
    // Attach mousemove and mouseup to document for smooth dragging
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      handle.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div
      ref={handleRef}
      data-testid="resize-handle"
      style={{
        width: '24px',
        cursor: 'col-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Visual indicator */}
      <div
        style={{
          width: '8px',
          height: '100%',
          backgroundColor: '#D1D5DB',
          borderRadius: '4px',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORS.primaryOrange}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#D1D5DB'}
      />
    </div>
  );
};

export default ResizeHandle;
