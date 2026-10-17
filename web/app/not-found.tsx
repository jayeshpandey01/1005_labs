import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 font-sans p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="font-mono text-cyan-400 text-5xl font-bold">404</div>
        <h1 className="text-xl font-bold">Page Not Found</h1>
        <p className="text-sm text-slate-400">
          The requested route does not exist in the PJP Sales Optimization Copilot.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

