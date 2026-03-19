import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100dvh-theme(spacing.14)-4px)] flex-col">
      <div className="stripe-divider h-[5px]" />
      <main className="flex flex-1 items-center justify-center bg-white py-20">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-8 w-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">
            Page not found
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--warp-indigo)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-md active:scale-[0.98]"
          >
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
