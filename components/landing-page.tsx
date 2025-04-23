import Input, { AttachmentPreview } from "@/components/input";
import React from "react";

interface LandingPageProps {
  input: string;
  setInput: (v: string) => void;
  onSend: (value: string, attachments: AttachmentPreview[]) => void;
  loading: boolean;
  error: string | null;
}

const suggestions = [
  {
    title: "Create a",
    label: "portfolio website",
    action: "Create a portfolio website for a photographer",
  },
  {
    title: "Build a",
    label: "landing page for my app",
    action: "Build a landing page for a new mobile app called 'TaskMaster'",
  },
  {
    title: "Generate a",
    label: "simple blog layout",
    action:
      "Generate a simple blog layout with a header, main content area, and sidebar",
  },
  {
    title: "Design a",
    label: "contact page",
    action: "Design a contact page with a form (name, email, message)",
  },
];

export default function LandingPage({ input, setInput, onSend, loading, error }: LandingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-screen container mx-auto max-w-screen-xl px-4">
      <div className="border rounded-lg p-6 flex flex-col gap-4 text-zinc-500 text-sm border-zinc-200 w-full max-w-xl bg-white shadow-sm mb-4">
        <div className="flex flex-col justify-center gap-4 items-center text-zinc-900">
          <p className="text-lg font-bold">AI Website Generator</p>
          <p className="text-center">
            Start by describing the website you want to build, or try one of
            the suggestions below.
          </p>
        </div>
      </div>
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-xl">
          <Input
            value={input}
            onChange={setInput}
            onSend={onSend}
            loading={loading}
            disabled={loading}
            className="mb-4"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-2 w-full max-w-xl">
          {suggestions.map((action, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                onSend(action.action, []);
              }}
              className="w-full text-left border border-zinc-200 text-zinc-800 rounded-lg p-2 text-sm hover:bg-zinc-100 transition-colors flex flex-col"
              disabled={loading}
            >
              <span className="font-medium">{action.title}</span>
              <span className="text-zinc-500">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
      {error && <div className="text-red-600">{error}</div>}
    </div>
  );
} 