'use client';

import { useState, useMemo } from 'react';

interface TranscriptViewerProps {
  transcript: string;
}

interface TranscriptMessage {
  role: 'agent' | 'user';
  message: string;
  timestamp?: string;
}

function parseTranscript(transcript: string): TranscriptMessage[] {
  const messages: TranscriptMessage[] = [];
  const lines = transcript.split('\n');

  let currentRole: 'agent' | 'user' | null = null;
  let currentMessage = '';
  let currentTimestamp = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Check for role prefixes (Agent: or User:)
    const agentMatch = trimmedLine.match(/^Agent(?:\s*\[([^\]]+)\])?:\s*(.*)$/i);
    const userMatch = trimmedLine.match(/^User(?:\s*\[([^\]]+)\])?:\s*(.*)$/i);
    const patientMatch = trimmedLine.match(/^Patient(?:\s*\[([^\]]+)\])?:\s*(.*)$/i);

    if (agentMatch) {
      // Save previous message if exists
      if (currentRole && currentMessage.trim()) {
        messages.push({
          role: currentRole,
          message: currentMessage.trim(),
          timestamp: currentTimestamp || undefined,
        });
      }
      currentRole = 'agent';
      currentTimestamp = agentMatch[1] || '';
      currentMessage = agentMatch[2] || '';
    } else if (userMatch || patientMatch) {
      // Save previous message if exists
      if (currentRole && currentMessage.trim()) {
        messages.push({
          role: currentRole,
          message: currentMessage.trim(),
          timestamp: currentTimestamp || undefined,
        });
      }
      currentRole = 'user';
      const match = userMatch || patientMatch;
      currentTimestamp = match![1] || '';
      currentMessage = match![2] || '';
    } else if (currentRole) {
      // Continue the current message
      currentMessage += ' ' + trimmedLine;
    }
  }

  // Don't forget the last message
  if (currentRole && currentMessage.trim()) {
    messages.push({
      role: currentRole,
      message: currentMessage.trim(),
      timestamp: currentTimestamp || undefined,
    });
  }

  return messages;
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  const [viewMode, setViewMode] = useState<'chat' | 'raw'>('chat');

  const messages = useMemo(() => parseTranscript(transcript), [transcript]);

  if (!transcript) {
    return (
      <p className="text-sm text-gray-500 italic">No transcript available.</p>
    );
  }

  return (
    <div className="space-y-3">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {messages.length} messages
        </span>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setViewMode('chat')}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              viewMode === 'chat'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Chat View
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1 text-sm font-medium transition-colors ${
              viewMode === 'raw'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Raw Text
          </button>
        </div>
      </div>

      {viewMode === 'chat' ? (
        <div className="space-y-3 max-h-[600px] overflow-y-auto p-4 bg-gray-50 rounded-lg">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === 'agent' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'agent'
                    ? 'bg-white border border-gray-200 text-gray-900'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold ${
                    msg.role === 'agent' ? 'text-blue-600' : 'text-blue-100'
                  }`}>
                    {msg.role === 'agent' ? 'Agent' : 'Patient'}
                  </span>
                  {msg.timestamp && (
                    <span className={`text-xs ${
                      msg.role === 'agent' ? 'text-gray-400' : 'text-blue-200'
                    }`}>
                      {msg.timestamp}
                    </span>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg overflow-x-auto max-h-[600px] overflow-y-auto">
          {transcript}
        </pre>
      )}
    </div>
  );
}
