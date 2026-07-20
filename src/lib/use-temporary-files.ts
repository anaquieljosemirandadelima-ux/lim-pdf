"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { clearTemporaryFiles, loadTemporaryFiles, saveTemporaryFiles } from "@/lib/temporary-cache";

export function useTemporaryFiles(
  cacheKey: string,
  files: File[],
  setFiles: Dispatch<SetStateAction<File[]>>,
) {
  const hydrated = useRef(false);
  const [restored, setRestored] = useState(false);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadTemporaryFiles(cacheKey)
      .then((savedFiles) => {
        if (!cancelled && savedFiles.length) {
          setFiles(savedFiles);
          setRestored(true);
          setCached(true);
        }
      })
      .finally(() => {
        hydrated.current = true;
      });
    return () => { cancelled = true; };
  }, [cacheKey, setFiles]);

  useEffect(() => {
    if (!hydrated.current) return;
    const timeout = window.setTimeout(() => {
      if (!files.length) {
        void clearTemporaryFiles(cacheKey).then(() => setCached(false));
        return;
      }
      void saveTemporaryFiles(cacheKey, files).then(setCached).catch(() => setCached(false));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [cacheKey, files]);

  function clearCache() {
    void clearTemporaryFiles(cacheKey).then(() => setCached(false));
  }

  return { restored, cached, clearCache };
}
