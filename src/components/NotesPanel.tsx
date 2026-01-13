'use client';

import { useState, useEffect } from 'react';
import type { SubmissionNote, NoteType } from '@/types';

interface NotesPanelProps {
  submissionId: string;
  notes: SubmissionNote[];
  onUpdate: () => void;
}

const STAFF_NAME_KEY = 'phoneagent_staff_name';

const noteTypeConfig: Record<NoteType, { label: string; color: string }> = {
  general: { label: 'General', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  follow_up: { label: 'Follow-up', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  clinical: { label: 'Clinical', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  correction: { label: 'Correction', color: 'bg-orange-100 text-orange-700 border-orange-200' },
};

export function NotesPanel({ submissionId, notes, onUpdate }: NotesPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [noteType, setNoteType] = useState<NoteType>('general');
  const [content, setContent] = useState('');
  const [staffName, setStaffName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved staff name from localStorage
  useEffect(() => {
    const savedName = localStorage.getItem(STAFF_NAME_KEY);
    if (savedName) {
      setStaffName(savedName);
    }
  }, []);

  const handleAdd = async () => {
    if (!content.trim()) {
      setError('Note content is required');
      return;
    }

    if (!staffName.trim()) {
      setError('Your name is required');
      return;
    }

    setSaving(true);
    setError(null);

    // Save staff name for future use
    localStorage.setItem(STAFF_NAME_KEY, staffName.trim());

    try {
      const res = await fetch(`/api/submissions/${submissionId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_type: noteType,
          content: content.trim(),
          created_by: staffName.trim(),
        }),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        onUpdate();
        setIsAdding(false);
        setContent('');
        setNoteType('general');
      } else {
        setError(result.error || 'Failed to add note');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setContent('');
    setNoteType('general');
    setError(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Note
          </button>
        )}
      </div>

      {isAdding && (
        <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
              <input
                type="text"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note Type</label>
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as NoteType)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.entries(noteTypeConfig).map(([value, { label }]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              placeholder="Enter your note..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving || !content.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Add Note'}
            </button>
            <button
              onClick={handleCancel}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const config = noteTypeConfig[note.note_type] || noteTypeConfig.general;
            return (
              <div key={note.id} className="p-3 bg-white border rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(note.created_at)}</span>
                  </div>
                  {note.created_by && (
                    <span className="text-xs text-gray-600 font-medium">
                      by {note.created_by}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
