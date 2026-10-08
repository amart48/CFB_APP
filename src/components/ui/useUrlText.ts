import { useEffect, useEffectEvent, useState } from "react";

const DEBOUNCE_MS = 300;

/**
 * Text input state mirrored to the URL. Typing stays instant and `commit` fires after a
 * short pause. A URL change we did not push ourselves (e.g. removing a filter chip)
 * replaces the text; one we did push never clobbers what is being typed.
 */
export function useUrlText(urlValue: string, commit: (value: string) => void) {
  const [text, setText] = useState(urlValue);
  const [seenUrl, setSeenUrl] = useState(urlValue);
  const [pushed, setPushed] = useState(urlValue);
  if (urlValue !== seenUrl) {
    setSeenUrl(urlValue);
    if (urlValue !== pushed) {
      setText(urlValue);
      setPushed(urlValue);
    }
  }

  const onCommit = useEffectEvent((value: string) => {
    setPushed(value);
    commit(value);
  });
  useEffect(() => {
    if (text === urlValue) return;
    const t = setTimeout(() => onCommit(text), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [text, urlValue]);

  return [text, setText] as const;
}
