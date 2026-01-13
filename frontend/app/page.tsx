import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-zinc-50">
      <div className="text-center space-y-6 max-w-2xl px-4">
        <h1 className="text-6xl font-extrabold tracking-tighter bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          Interviewer.AI
        </h1>
        <p className="text-xl text-zinc-400">
          Master your next interview. AI-driven mock interviews customized to your resume and target role.
        </p>
        <div className="pt-8">
          <Link
            href="/setup"
            className="inline-flex h-12 items-center justify-center rounded-md bg-white px-8 text-sm font-medium text-zinc-950 shadow transition-colors hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-300 disabled:pointer-events-none disabled:opacity-50"
          >
            Start Interview
          </Link>
        </div>
      </div>
    </div>
  );
}
