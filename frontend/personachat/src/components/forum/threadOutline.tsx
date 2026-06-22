import { ChevronsUpDown, PlusCircle, Plus, Minus, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ForumThread, Message, ForumThreadTopic } from '@/types'
import { Separator } from "@/components/ui/separator"

interface ThreadProps {
  thread: ForumThread
}

interface Reply {
  message: Message
  replies: Reply[]
}

export function ThreadOutline({ thread }: ThreadProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-blue-50 rounded-lg shadow-sm p-6 mb-4">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex flex-col gap-3">
          {/* Header: Discussion Outline */}
          <div className="flex items-center w-full">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                {isOpen ?
                  <span className="sr-only">Close</span> :
                  <ChevronsUpDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <h2 className="text-xl font-semibold ml-2">Discussion Outline</h2>
            <Button variant="ghost" size="sm" className="ml-auto p-0 h-auto">
              <PlusCircle className="w-4 h-4" />
            </Button>
          </div>

          {/* Topic Title */}
          <div className="flex items-center w-full mb-2">
            <h3 className="text-lg font-semibold">Topic: {thread.discussion.topic}</h3>
            <Button variant="ghost" size="sm" className="ml-auto p-0 h-auto">
              <PlusCircle className="w-4 h-4" />
            </Button>
          </div>

          <Separator className="my-2" />

          
          {thread.discussion.discussion_thread.map((discussionThread) => (
            <CollapsibleContent>
              <Node
                key={discussionThread.message.id}
                thread_id={thread.discussion.id}
                post={discussionThread.message}
                replies={discussionThread.replies}
              />
            </CollapsibleContent>
          ))}
        </div>
      </Collapsible>
    </div>
  )
}

function Node({ post, replies, thread_id }: {
  post: Message,
  thread_id: string,
  replies: Reply[]
}) {
  const [isRepliesOpen, setRepliesOpen] = useState(true);

  // Function to truncate text
  const truncateText = (text: string, maxLength: number = 75) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Determine which icon to show based on author or content
  const getCommentIcon = () => {
    // This is just example logic - replace with your own criteria
    if (post.author.toLowerCase().includes('cognitive scientist')) {
      return (
        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-blue-500 bg-white">
          <HelpCircle className="text-blue-500 h-4 w-4" />
        </div>
      );
    } else if (post.author.toLowerCase().includes('sociology expert')) {
      if (post.content.toLowerCase().includes('positive') ||
        post.content.toLowerCase().includes('reshape') ||
        post.content.toLowerCase().includes('sustainable')) {
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full border border-green-500 bg-white">
            <Plus className="text-green-500 h-4 w-4" />
          </div>
        );
      } else {
        return (
          <div className="flex items-center justify-center w-6 h-6 rounded-full border border-red-500 bg-white">
            <Minus className="text-red-500 h-4 w-4" />
          </div>
        );
      }
    } else if (post.author.toLowerCase().includes('policy specialist')) {
      return (
        <div className="flex items-center justify-center w-6 h-6 rounded-full border border-red-500 bg-white">
          <Minus className="text-red-500 h-4 w-4" />
        </div>
      );
    }

    return null;
  };

  // Check if there's a : in the author name and split it if needed
  const authorParts = post.author.includes(':')
    ? post.author.split(':')
    : [post.author, ''];

  const displayAuthor = authorParts[0].trim();

  return (
    <div className="mb-4">
      {/* Expert name with blue vertical line */}
      <div className="flex items-start">
        <div className="text-gray-600 font-medium border-l-4 border-blue-400 pl-4 py-1">
          {displayAuthor}:
        </div>
      </div>

      {/* Content as bullet point with indicator icon */}
      <div className="ml-12 mt-2 flex items-start">
        <div className="flex">
          {getCommentIcon() && (
            <div className="mr-3 flex-shrink-0">
              {getCommentIcon()}
            </div>
          )}
          <div>
            <ul className="list-disc pl-5">
              <li className="text-gray-800">{truncateText(post.content)}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Replies section */}
      {replies.length > 0 && (
        <Collapsible open={isRepliesOpen} onOpenChange={setRepliesOpen}>
          <CollapsibleContent>
            <div className="ml-6 mt-2">
              {replies.map((reply) => (
                <Node
                  key={reply.message.id}
                  thread_id={thread_id}
                  post={reply.message}
                  replies={reply.replies}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

