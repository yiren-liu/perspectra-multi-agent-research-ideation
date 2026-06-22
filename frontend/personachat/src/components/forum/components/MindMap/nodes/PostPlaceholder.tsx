import React from 'react';
import { Badge } from "@/components/ui/badge"
import { NodeData } from '../utils/nodeUtils';

/**
 * Minimal content display when zoomed out
 */
const PostPlaceholder = ({ data }: { data: NodeData }) => (
  <div className="w-full flex flex-col items-center">
    {data.author && (
      <div className="text-[8px] text-gray-500 truncate w-full text-center">{data.author.split(' ')[0]}</div>
    )}
    <div className="text-[12px] text-gray-600 w-full">
      {/* {data.label.length > 50 ? data.label.substring(0, 50) + '...' : data.label} */}
      
      <div className="flex flex-wrap gap-1 justify-center mt-1">
        {data.multiLevelSummary?.keywords.map((keyword) => (
          <Badge 
            key={keyword} 
            variant="outline"
            className="text-[8px] py-0 px-1.5 truncate max-w-[70px]"
          >
            {keyword}
          </Badge>
        ))}
      </div>
    </div>
  </div>
);

export default PostPlaceholder; 