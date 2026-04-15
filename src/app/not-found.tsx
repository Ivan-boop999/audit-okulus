import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6">
        <img
          src="/logo.png"
          alt="Аудит-Окулус"
          className="mx-auto h-16 w-16 rounded-xl object-cover shadow-lg"
        />
      </div>
      <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
      <h2 className="text-xl font-semibold text-muted-foreground mb-4">
        Страница не найдена
      </h2>
      <p className="text-muted-foreground mb-8 max-w-md">
        Запрашиваемая страница не существует или была перемещена.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
      >
        Вернуться на главную
      </Link>
      <p className="mt-12 text-xs text-muted-foreground">
        Аудит-Окулус v3.0
      </p>
    </div>
  );
}
