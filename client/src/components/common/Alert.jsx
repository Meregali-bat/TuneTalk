import { useEffect, useState } from 'react';

const VISIBLE_MS = 3000;

export function Alert({ message }) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) return undefined;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message || !visible) return null;
  return <div role="alert" className="alert m-0">{message}</div>;
}
