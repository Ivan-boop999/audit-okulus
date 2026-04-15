export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <img
          src="/logo.png"
          alt="Аудит-Окулус"
          className="h-14 w-14 rounded-xl object-cover shadow-lg animate-pulse"
        />
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
        </div>
        <p className="text-sm text-muted-foreground">Загрузка...</p>
      </div>
    </div>
  );
}
