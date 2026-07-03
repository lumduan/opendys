import { useRef, useState } from 'react';
import { strings } from '@/i18n/strings';
import { SettingsDrawer } from './SettingsDrawer';

/** Navbar gear that opens the reading-settings drawer and owns the focus-return target. */
export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-ghost btn-sm btn-circle text-lg"
        aria-label={strings.en.settings.open}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        ⚙️
      </button>
      <SettingsDrawer open={open} onClose={() => setOpen(false)} returnFocusRef={buttonRef} />
    </>
  );
}
