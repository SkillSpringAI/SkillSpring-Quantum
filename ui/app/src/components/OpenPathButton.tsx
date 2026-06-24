import { useEffect, useState } from "react";
import { desktopPathExists, revealDesktopPath } from "../services/pathBridge";

interface OpenPathButtonProps {
  className: string;
  targetPath: string | null | undefined;
  children: string;
  missingText?: string;
}

export default function OpenPathButton({
  className,
  targetPath,
  children,
  missingText
}: OpenPathButtonProps) {
  const [exists, setExists] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check(): Promise<void> {
      const nextExists = targetPath ? await desktopPathExists(targetPath) : false;
      if (!cancelled) {
        setExists(nextExists);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [targetPath]);

  if (!targetPath || !exists) {
    return missingText ? <span className="muted">{missingText}</span> : null;
  }

  return (
    <button className={className} type="button" onClick={() => revealDesktopPath(targetPath)}>
      {children}
    </button>
  );
}
