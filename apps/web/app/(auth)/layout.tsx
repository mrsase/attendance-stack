export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[radial-gradient(60rem_60rem_at_120%_-10%,rgba(59,130,246,.15),transparent_60%),radial-gradient(40rem_40rem_at_-10%_120%,rgba(236,72,153,.12),transparent_60%)]">
      <div className="mx-auto flex min-h-dvh max-w-7xl items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
}
