import { X, MapPin, Clock, AlertTriangle, Users, Crosshair } from 'lucide-react';
import type { ConflictEvent } from '../../types';

interface ConflictPopupProps {
  event: ConflictEvent;
  onClose: () => void;
}

const typeLabels: Record<ConflictEvent['type'], string> = {
  armed_conflict: 'Armed Conflict',
  civil_unrest: 'Civil Unrest',
  terrorism: 'Terrorism',
  border_dispute: 'Border Dispute',
};

const severityColors: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Minimal' },
  2: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Low' },
  3: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Moderate' },
  4: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'High' },
  5: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Critical' },
};

export function ConflictPopup({ event, onClose }: ConflictPopupProps) {
  const severityInfo = severityColors[event.severity];
  const timestamp = new Date(event.timestamp);

  return (
    <div className="w-72 bg-control-base text-white">
      <div className="p-4 border-b border-control-border">
        <div className="flex items-start justify-between mb-2">
          <div className={`px-2 py-1 rounded text-xs font-medium ${severityInfo.bg} ${severityInfo.text}`}>
            Severity {event.severity} - {severityInfo.label}
          </div>
          <button
            onClick={onClose}
            className="text-control-muted hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <h3 className="text-sm font-semibold text-white leading-tight">
          {event.description}
        </h3>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <MapPin size={14} className="text-control-muted" />
          <span className="text-slate-300">{event.location}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Crosshair size={14} className="text-control-muted" />
          <span className="text-slate-300">{typeLabels[event.type]}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock size={14} className="text-control-muted" />
          <span className="text-slate-300">
            {timestamp.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' at '}
            {timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {event.casualties !== undefined && event.casualties > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <Users size={14} className="text-alert-critical" />
            <span className="text-alert-critical font-medium">
              {event.casualties} reported casualties
            </span>
          </div>
        )}
      </div>

      <div className="p-4 pt-0">
        <div className="flex items-center gap-2 p-2 rounded bg-control-surface/50">
          <AlertTriangle size={14} className="text-alert-warning" />
          <span className="text-xs text-slate-400">
            Operations in this area may be affected
          </span>
        </div>
      </div>
    </div>
  );
}
