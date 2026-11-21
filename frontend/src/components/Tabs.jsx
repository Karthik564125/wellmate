// Accessible tab list: arrow keys, Home and End move between tabs, and the active tab is marked with aria-selected.
import { useRef } from 'react';

// Keys that move focus between tabs.
const NAVIGATION_KEYS = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];

// Work out the next tab index for a navigation key, wrapping at both ends.
function getNextIndex(key, currentIndex, count) {
  if (key === 'ArrowRight') return (currentIndex + 1) % count;
  if (key === 'ArrowLeft') return (currentIndex - 1 + count) % count;
  if (key === 'Home') return 0;
  return count - 1;
}

// Renders a row of tabs; onChange receives the id of the newly selected tab.
export function Tabs({ tabs = [], activeId, onChange }) {
  const listRef = useRef(null);

  // Handle keyboard navigation: select the next tab and move focus to it.
  function handleKeyDown(event) {
    if (!NAVIGATION_KEYS.includes(event.key)) return;
    event.preventDefault();
    const currentIndex = tabs.findIndex((tab) => tab.id === activeId);
    const nextIndex = getNextIndex(event.key, currentIndex, tabs.length);
    onChange(tabs[nextIndex].id);
    const buttons = listRef.current?.querySelectorAll('[role="tab"]');
    buttons?.[nextIndex]?.focus();
  }

  return (
    <div className="tabs" role="tablist" ref={listRef} onKeyDown={handleKeyDown}>
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`tab${selected ? ' tab--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
