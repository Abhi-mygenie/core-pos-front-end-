/**
 * Test Cases for useClickOutside Hook
 * 
 * Location: /app/frontend/src/hooks/useClickOutside.js
 * Purpose: Detect clicks outside of a referenced element
 */

import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import useClickOutside from '../../hooks/useClickOutside';

describe('useClickOutside Hook', () => {
  
  // TC-001: Should call handler when clicking outside the referenced element
  test('TC-001: calls handler when clicking outside', () => {
    const handler = jest.fn();
    const ref = { current: document.createElement('div') };
    document.body.appendChild(ref.current);
    
    renderHook(() => useClickOutside(ref, handler, true));
    
    // Simulate click outside
    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);
    
    const event = new MouseEvent('mousedown', { bubbles: true });
    outsideElement.dispatchEvent(event);
    
    expect(handler).toHaveBeenCalled();
    
    // Cleanup
    document.body.removeChild(ref.current);
    document.body.removeChild(outsideElement);
  });

  // TC-002: Should NOT call handler when clicking inside the referenced element
  test('TC-002: does not call handler when clicking inside', () => {
    const handler = jest.fn();
    const ref = { current: document.createElement('div') };
    document.body.appendChild(ref.current);
    
    renderHook(() => useClickOutside(ref, handler, true));
    
    // Simulate click inside
    const event = new MouseEvent('mousedown', { bubbles: true });
    ref.current.dispatchEvent(event);
    
    expect(handler).not.toHaveBeenCalled();
    
    document.body.removeChild(ref.current);
  });

  // TC-003: Should NOT call handler when disabled (enabled=false)
  test('TC-003: does not call handler when disabled', () => {
    const handler = jest.fn();
    const ref = { current: document.createElement('div') };
    document.body.appendChild(ref.current);
    
    renderHook(() => useClickOutside(ref, handler, false)); // disabled
    
    const outsideElement = document.createElement('div');
    document.body.appendChild(outsideElement);
    
    const event = new MouseEvent('mousedown', { bubbles: true });
    outsideElement.dispatchEvent(event);
    
    expect(handler).not.toHaveBeenCalled();
    
    document.body.removeChild(ref.current);
    document.body.removeChild(outsideElement);
  });

  // TC-004: Should remove event listener on unmount
  test('TC-004: removes event listener on unmount', () => {
    const handler = jest.fn();
    const ref = { current: document.createElement('div') };
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    
    const { unmount } = renderHook(() => useClickOutside(ref, handler, true));
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  // TC-005: Should handle null ref gracefully
  test('TC-005: handles null ref gracefully', () => {
    const handler = jest.fn();
    const ref = { current: null };
    
    expect(() => {
      renderHook(() => useClickOutside(ref, handler, true));
    }).not.toThrow();
  });

});
