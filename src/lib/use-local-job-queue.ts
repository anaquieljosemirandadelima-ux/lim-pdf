"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type LocalJobStatus = "queued" | "running" | "success" | "error" | "cancelled";

export type LocalJob = {
  id: string;
  label: string;
  status: LocalJobStatus;
  progress: number;
  message: string;
  error?: string;
};

type JobTask<T> = (signal: AbortSignal, report: (progress: number, message: string) => void) => Promise<T>;
type InternalJob<T> = { job: LocalJob; task: JobTask<T>; controller: AbortController };

function createId() {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useLocalJobQueue() {
  const queueRef = useRef<InternalJob<unknown>[]>([]);
  const runningRef = useRef(false);
  const runNextRef = useRef<() => Promise<void>>(async () => undefined);
  const resolversRef = useRef(new Map<string, { resolve: (value: unknown) => void; reject: (error: unknown) => void }>());
  const [jobs, setJobs] = useState<LocalJob[]>([]);

  const sync = useCallback(() => setJobs(queueRef.current.map((entry) => ({ ...entry.job }))), []);

  const runNext = useCallback(async () => {
    if (runningRef.current) return;
    const entry = queueRef.current.find((candidate) => candidate.job.status === "queued");
    if (!entry) return;
    runningRef.current = true;
    entry.job.status = "running";
    entry.job.message = "Processando localmente…";
    sync();
    try {
      const result = await entry.task(entry.controller.signal, (progress, message) => {
        entry.job.progress = Math.max(0, Math.min(100, Math.round(progress)));
        entry.job.message = message;
        sync();
      });
      if (entry.controller.signal.aborted) {
        entry.job.status = "cancelled";
        entry.job.message = "Operação cancelada.";
        resolversRef.current.get(entry.job.id)?.reject(new DOMException("Operação cancelada.", "AbortError"));
      } else {
        entry.job.status = "success";
        entry.job.progress = 100;
        entry.job.message = "Concluído.";
        resolversRef.current.get(entry.job.id)?.resolve(result);
      }
    } catch (error) {
      if (entry.controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
        entry.job.status = "cancelled";
        entry.job.message = "Operação cancelada.";
      } else {
        entry.job.status = "error";
        entry.job.error = error instanceof Error ? error.message : "Não foi possível concluir a operação.";
        entry.job.message = entry.job.error;
      }
      resolversRef.current.get(entry.job.id)?.reject(error);
    } finally {
      resolversRef.current.delete(entry.job.id);
      sync();
      runningRef.current = false;
      void runNextRef.current();
    }
  }, [sync]);

  useEffect(() => {
    runNextRef.current = runNext;
  }, [runNext]);

  const enqueue = useCallback(<T,>(label: string, task: JobTask<T>) => {
    const id = createId();
    const controller = new AbortController();
    const entry: InternalJob<T> = {
      controller,
      task,
      job: { id, label, status: "queued", progress: 0, message: "Aguardando na fila…" },
    };
    queueRef.current.push(entry as InternalJob<unknown>);
    sync();
    const promise = new Promise<T>((resolve, reject) => resolversRef.current.set(id, { resolve: resolve as (value: unknown) => void, reject }));
    void runNextRef.current();
    return { id, promise };
  }, [sync]);

  const cancel = useCallback((id: string) => {
    const entry = queueRef.current.find((candidate) => candidate.job.id === id);
    if (!entry) return;
    entry.controller.abort();
    if (entry.job.status === "queued") {
      entry.job.status = "cancelled";
      entry.job.message = "Operação cancelada.";
      resolversRef.current.get(id)?.reject(new DOMException("Operação cancelada.", "AbortError"));
      resolversRef.current.delete(id);
    }
    sync();
  }, [sync]);

  const clearFinished = useCallback(() => {
    queueRef.current = queueRef.current.filter((entry) => entry.job.status === "queued" || entry.job.status === "running");
    sync();
  }, [sync]);

  const retry = useCallback((id: string) => {
    const entry = queueRef.current.find((candidate) => candidate.job.id === id);
    if (!entry || (entry.job.status !== "error" && entry.job.status !== "cancelled")) return;
    entry.controller = new AbortController();
    entry.job.status = "queued";
    entry.job.progress = 0;
    entry.job.message = "Aguardando nova tentativa…";
    entry.job.error = undefined;
    sync();
    const promise = new Promise<unknown>((resolve, reject) => resolversRef.current.set(id, { resolve, reject }));
    void runNextRef.current();
    return promise;
  }, [sync]);

  const activeJob = useMemo(() => jobs.find((job) => job.status === "running" || job.status === "queued"), [jobs]);
  return { jobs, activeJob, enqueue, cancel, retry, clearFinished };
}
