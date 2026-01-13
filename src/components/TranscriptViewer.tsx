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

    // Format: [0:00] Agent: message or [0:00] Patient: message
    // Also handle without timestamp: Agent: message
    const timestampedAgentMatch = trimmedLine.match(/^\[([^\]]+)\]\s*Agent:\s*(.*)$/i);
    const timestampedPatientMatch = trimmedLine.match(/^\[([^\]]+)\]\s*(?:Patient|User):\s*(.*)$/i);
    const plainAgentMatch = trimmedLine.match(/^Agent:\s*(.*)$/i);
    const plainPatientMatch = trimmedLine.match(/^(?:Patient|User):\s*(.*)$/i);

    if (timestampedAgentMatch) {
      // Save previous message if exists
      if (currentRole && currentMessage.trim()) {
        messages.push({
          role: currentRole,
          message: currentMessage.trim(),
          timestamp: currentTimestamp || undefined,
        });
      }
      currentRole = 'agent';
      currentTimestamp = timestampedAgentMatch[1] || '';
      currentMessage = timestampedAgentMatch[2] || '';
    } else if (timestampedPatientMatch) {
      // Save previous message if exists
      if (currentRole && currentMessage.trim()) {
        messages.push({
          role: currentRole,
          message: currentMessage.trim(),
          timestamp: currentTimestamp || undefined,
        });
      }
      currentRole = 'user';
      currentTimestamp = timestampedPatientMatch[1] || '';
      currentMessage = timestampedPatientMatch[2] || '';
    } else if (plainAgentMatch) {
      // Save previous message if exists
      if (currentRole && currentMessage.trim()) {
        messages.push({
          role: currentRole,
          message: currentMessage.trim(),
          timestamp: currentTimestamp || undefined,
        });
      }
      currentRole = 'agent';
      currentTimestamp = '';
      currentMessage = plainAgentMatch[1] || '';
    } else if (plainPatientMatch) {
      // Save previous message if exists
      if (currentRole && currentMessage.trim()) {
        messages.push({
          role: currentRole,
          message: currentMessage.trim(),
          timestamp: currentTimestamp || undefined,
        });
      }
      currentRole = 'user';
      currentTimestamp = '';
      currentMessage = plainPatientMatch[1] || '';
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
