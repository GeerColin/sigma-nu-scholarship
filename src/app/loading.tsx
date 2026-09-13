export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading page"
      className="mx-auto min-h-screen max-w-6xl p-4 motion-safe:animate-pulse sm:p-7"
    >
      <div className="h-5 w-36 rounded bg-slate-200" />
      <div className="mt-4 h-10 w-72 max-w-full rounded bg-slate-200" />
      <div className="mt-3 h-5 w-full max-w-xl rounded bg-slate-200" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-36 rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
      <p className="sr-only" role="status">
        Loading scholarship information.
      </p>
    </main>
  );
}
