import { Check, X, HelpCircle, MessageSquare, Flag, AlertCircle } from 'lucide-react';
import { MultiLevelSummary } from '@/types';
/**
 * Truncates text to a specified length and adds ellipsis if needed
 */
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Gets appropriate icon, color, and iconColor for an action type
 */
export const getActionDisplay = (actionText: string) => {
  const action = actionText.toLowerCase().trim();
  
  // Define action types and their visual representations
  if (action === 'agree') {
    return {
      icon: <Check className="w-3 h-3 !relative" />,
      color: 'bg-green-100 border-green-200 text-green-700',
      iconColor: 'text-green-600'
    };
  } else if (action === 'disagree') {
    return {
      icon: <X className="w-3 h-3 !relative" />,
      color: 'bg-red-100 border-red-200 text-red-700',
      iconColor: 'text-red-600'
    };
  } else if (action === 'question') {
    return {
      icon: <HelpCircle className="w-3 h-3 !relative" />,
      color: 'bg-purple-100 border-purple-200 text-purple-700',
      iconColor: 'text-purple-600'
    };
  } else if (action === 'claim') {
    return {
      icon: <Flag className="w-3 h-3 !relative" />,
      color: 'bg-yellow-100 border-yellow-200 text-yellow-700',
      iconColor: 'text-yellow-600'
    };
  } else {
    // Default fallback
    return {
      icon: <MessageSquare className="w-3 h-3 !relative" />,
      color: 'bg-blue-100 border-blue-200 text-blue-700',
      iconColor: 'text-blue-600'
    };
  }
};

// Define custom node data type
export type NodeData = {
  label: string;
  fullContent?: string;
  multiLevelSummary?: MultiLevelSummary;
  author?: string;
  isRoot?: boolean;
  threadId?: string;
  depth?: number;
  hiddenChildCount?: number;
};

// Define custom edge data type
export type EdgeData = {
  action?: string;
  reason?: string;
};

// Define zoom level thresholds for post nodes
export const zoomLevels = {
  minimal: 0.8,   // Below this: minimal view
  compact: 1.0,   // Below this: compact view
  medium: 1.3,    // Below this: medium view
  full: 1.6,      // Below this: full but smaller view
  detailed: 2.2   // Below this: detailed view
}; 