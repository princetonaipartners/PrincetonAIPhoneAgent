import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 text-white text-2xl mb-6">
            📞
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            PrincetonAI Medical Phone Agent
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Automated patient intake system for NHS medical practices.
            Voice-powered form collection via ElevenLabs Conversational AI.
          </p>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-lg border p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="text-lg font-medium text-gray-900">System Status</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Webhook</div>
              <div className="text-lg font-semibold text-gray-900">Ready</div>
              <div className="text-xs text-gray-400 mt-1">/api/webhooks/elevenlabs</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Voice Agent</div>
              <div className="text-lg font-semibold text-gray-900">MVP</div>
              <div className="text-xs text-gray-400 mt-1">Health Problem + Prescription</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Database</div>
              <div className="text-lg font-semibold text-gray-900">Supabase</div>
              <div className="text-xs text-gray-400 mt-1">PostgreSQL + RLS</div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link
            href="/admin"
            className="flex items-center gap-4 p-6 bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-xl">
              📋
            </div>
            <div>
              <div className="font-semibold text-gray-900">Admin Dashboard</div>
              <div className="text-sm text-gray-500">View patient submissions</div>
            </div>
          </Link>

          <Link
            href="/api/webhooks/elevenlabs"
            className="flex items-center gap-4 p-6 bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-xl">
              🔗
            </div>
            <div>
              <div className="font-semibold text-gray-900">Webhook Health</div>
              <div className="text-sm text-gray-500">Check endpoint status</div>
            </div>
          </Link>
        </div>

        {/* Setup Checklist */}
        <div className="bg-white rounded-2xl shadow-lg border p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Setup Checklist</h2>

          <div className="space-y-4">
            <ChecklistItem
              done={true}
              title="Project Setup"
              description="Next.js 15, TypeScript, Tailwind CSS"
            />
            <ChecklistItem
              done={true}
              title="Webhook Endpoint"
              description="POST /api/webhooks/elevenlabs with HMAC validation"
            />
            <ChecklistItem
              done={true}
              title="Database Schema"
              description="Supabase tables for submissions and call logs"
            />
            <ChecklistItem
              done={true}
              title="Admin Dashboard"
              description="View and manage patient submissions"
            />
            <ChecklistItem
              done={true}
              title="System Prompt"
              description="ElevenLabs agent configuration ready"
            />
            <ChecklistItem
              done={false}
              title="ElevenLabs Account"
              description="Create agent with system prompt"
            />
            <ChecklistItem
              done={false}
              title="Supabase Setup"
              description="Run migration and configure environment"
            />
            <ChecklistItem
              done={false}
              title="Twilio Integration"
              description="Connect UK phone number via ElevenLabs"
            />
            <ChecklistItem
              done={false}
              title="Deploy to Vercel"
              description="Push to production and test end-to-end"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-gray-500">
          <p>PrincetonAI Medical Phone Agent - MVP</p>
          <p className="mt-1">Powered by ElevenLabs + Next.js + Supabase</p>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({
  done,
  title,
  description,
}: {
  done: boolean;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
        }`}
      >
        {done ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <div className="w-2 h-2 rounded-full bg-current" />
        )}
      </div>
      <div>
        <div className={`font-medium ${done ? 'text-gray-900' : 'text-gray-500'}`}>
          {title}
        </div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
    </div>
  );
}
