import { useCallback, useEffect, useState } from 'react';

interface UseKeyboardNavigationOptions {
  columns: string[];
  itemsPerColumn: Record<string, string[]>;
  onMoveItem?: (itemId: string, fromColumn: string, toColumn: string) => void;
  onSelectItem?: (itemId: string) => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  columns,
  itemsPerColumn,
  onMoveItem,
  onSelectItem,
  enabled = true,
}: UseKeyboardNavigationOptions) {
  const [focusedColumn, setFocusedColumn] = useState(0);
  const [focusedItem, setFocusedItem] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const currentColumnId = columns[focusedColumn];
  const currentItems = itemsPerColumn[currentColumnId] || [];
  const focusedItemId = currentItems[focusedItem];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || !isNavigating) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedItem(prev => Math.min(prev + 1, currentItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedItem(prev => Math.max(prev - 1, 0));
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (e.metaKey || e.ctrlKey) {
          // Move item to next column
          if (focusedItemId && focusedColumn < columns.length - 1) {
            onMoveItem?.(focusedItemId, currentColumnId, columns[focusedColumn + 1]);
          }
        } else {
          setFocusedColumn(prev => Math.min(prev + 1, columns.length - 1));
          setFocusedItem(0);
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (e.metaKey || e.ctrlKey) {
          // Move item to previous column
          if (focusedItemId && focusedColumn > 0) {
            onMoveItem?.(focusedItemId, currentColumnId, columns[focusedColumn - 1]);
          }
        } else {
          setFocusedColumn(prev => Math.max(prev - 1, 0));
          setFocusedItem(0);
        }
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedItemId) {
          onSelectItem?.(focusedItemId);
        }
        break;
      case 'Escape':
        setIsNavigating(false);
        break;
    }
  }, [enabled, isNavigating, currentItems.length, focusedItemId, focusedColumn, columns, currentColumnId, onMoveItem, onSelectItem]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return {
    focusedColumn,
    focusedItem,
    focusedItemId,
    isNavigating,
    startNavigating: () => setIsNavigating(true),
    stopNavigating: () => setIsNavigating(false),
  };
}
