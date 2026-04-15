"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6">
        <img
          src="/logo.png"
          alt="Аудит-Окулус"
          className="mx-auto h-16 w-16 rounded-xl object-cover shadow-lg"
        />
      </div>
      <h1 className="text-4xl font-bold text-foreground mb-2">
        Произошла ошибка
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        Что-то пошло не так. Попробуйте обновить страницу или вернитесь позже.
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
        >
          Попробовать снова
        </button>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent"
        >
          На главную
        </a>
      </div>
      <p className="mt-12 text-xs text-muted-foreground">
        Аудит-Окулус v3.0
      </p>
    </div>
  );
}
