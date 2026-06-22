import { useRef, useEffect, useState } from 'react';
import Markdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'

import { MessageSquare } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useChatStore } from "../../stores/chatStore"
import { useApi } from '@/controller/API'
import { ChatMessage, ChatMessageChunkStreaming } from '@/types'
import ConceptTag from './components/conceptTag'
import { parseConceptString } from '@/lib/utils'

// New component for displaying user persona
function UserPersonaDisplay({ name, avatar, isChatRunning }: { name: string, avatar: string, isChatRunning: boolean }) {
  const { chatMessages, setUserPersonaId, selectedPersonaId, searchQuery,
    selectedPersonaQuestionsSuggestions, setSelectedPersonaQuestionsSuggestions, setCurrentMessage, getSelectedPersona } = useChatStore()
  // TODO: generate AI Persona questions suggestions (asking questions for the user)
  const { generatePersonaQuestionsSuggestions } = useApi()
  
  useEffect(() => {
    if (selectedPersonaId && !isChatRunning) {
      const filteredChatMessages = chatMessages.filter((msg: ChatMessage) => typeof msg.message === 'string');
      generatePersonaQuestionsSuggestions(getSelectedPersona()!, searchQuery, filteredChatMessages).then((res) => {
        setSelectedPersonaQuestionsSuggestions(res.data.questions);
      });
    }
  }, [chatMessages, isChatRunning]);

  return (
    <div className="flex flex-col mb-2 p-2 bg-slate-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Your persona:</p>
          <Avatar className="w-6 h-6">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback>{name[0]}</AvatarFallback>
          </Avatar>
          <p className="text-sm font-medium">{name}</p>
        </div>
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={() => {
            setUserPersonaId(null);
            setSelectedPersonaQuestionsSuggestions([]);
          }}
        >
          Remove User Persona
        </Button>
      </div>
      <div className="flex flex-col mt-2">
        {selectedPersonaQuestionsSuggestions.map((suggestion, index) => (
          <div 
            key={index} 
            className="bg-white shadow-md rounded-lg p-2 mb-2 cursor-pointer hover:bg-gray-100 transition"
            onClick={() => {
              setCurrentMessage(suggestion);
              setSelectedPersonaQuestionsSuggestions([]);
            }}
          >
            <p className="text-sm font-medium">{suggestion}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ChatPanel() {
  const { personas, selectedPersonaId, chatMessages, currentMessage, 
    setCurrentMessage, userPersonaId, addChatMessage, clearChatMessages, 
    getSelectedPersona, getUserPersona, getPersonaById } = useChatStore()
  const { chatWithExperts, terminateCurrentChat } = useApi()
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const [isChatRunning, setIsChatRunning] = useState(false);

  const sanitizeAndFormatMessage = (message: string) => {
    // let sanitizedMessage = message.replace(/<[^>]*>|&nbsp;|TERMINATE$/g, '').trim();
    let sanitizedMessage = message.replace(/&nbsp;|TERMINATE$/g, '').trim();
    return sanitizedMessage;
  }

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleNewIncomingMessage = (chunk: ChatMessageChunkStreaming) => {
    const message: ChatMessage = {
      sender_name: chunk.source,
      sender_avatar: getPersonaById(chunk.source)?.avatar || '',
      message: chunk.content
    }
    if (message.sender_name === 'user') { return }
    addChatMessage(message);
  };
  const handleSendMessage = () => {
    if (currentMessage.trim() === '') { return }
    if (isChatRunning) { 
      handleStopChat();
      setTimeout(() => {}, 1000);
    }
    setIsChatRunning(true);
    const messageSent: ChatMessage = {
      sender_name: 'user',
      sender_avatar: '',
      message: currentMessage
    }
    addChatMessage(messageSent);
    chatWithExperts(currentMessage, personas, handleNewIncomingMessage, handleChatFinished, handleChatFinished);
    setCurrentMessage('');
  }
  const handleStopChat = () => {
    terminateCurrentChat();
    setIsChatRunning(false);
  }
  const handleChatFinished = () => {
    setIsChatRunning(false);
  }
  return (
    <div className="mt-4">
      {/* <h3 className="text-lg font-semibold mb-2">Chat with Experts</h3> */}
      <div className="flex items-center space-x-2 mb-4 px-2 py-1 bg-muted rounded-lg overflow-x-auto">
        <span className="text-sm font-medium whitespace-nowrap">Discussion Group:</span>
        {personas.map((persona, index) => (
          <div 
            key={index} 
            className="relative group"
            title={persona.name}
          >
            <Avatar className="w-6 h-6 hover:ring-2 hover:ring-primary transition-all">
              <AvatarImage src={persona.avatar} alt={persona.name} />
              <AvatarFallback>{persona.name[0]}</AvatarFallback>
            </Avatar>
          </div>
        ))}
      </div>
      <div 
        ref={chatContainerRef} 
        className="h-128 overflow-y-auto mb-2 p-2 border rounded"
      >
        {chatMessages.map((msg: ChatMessage, index: number) => {
          if (typeof msg.message !== 'string') {
            return null; // Skip rendering if msg.message is not a string
          }
          return (
            <div key={index} className={`flex items-start space-x-2 mb-4 ${msg.sender_name === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender_name !== 'user' && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={msg.sender_avatar} alt={msg.sender_name} />
                  <AvatarFallback>{msg.sender_name[0]}</AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[70%] ${msg.sender_name === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'} rounded-lg p-2`}>
                <Markdown 
                  rehypePlugins={[rehypeRaw]} 
                  className="text-sm"
                  components={{
                    strong(props) {
                      const {node, ...rest} = props
                      if (!rest.children || typeof rest.children !== 'string') { return null }
                      const { concept, sources } = parseConceptString(rest.children);
                      return <ConceptTag conceptSource={{ concept: concept, sources: sources }} />
                    }
                  }}
                >
                  {sanitizeAndFormatMessage(msg.message)}
                </Markdown>
              </div>
              {msg.sender_name === 'user' && (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={getUserPersona()?.avatar || ''} alt={getUserPersona()?.name || ''} />
                  <AvatarFallback>{getUserPersona()?.name[0] || 'U'}</AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}
        {isChatRunning && <div className="flex items-center justify-center mb-4">
          <p className="text-sm font-medium">Chat is running...</p>
        </div>}
      </div>
      {userPersonaId && <UserPersonaDisplay name={getUserPersona()?.name || ''} avatar={getUserPersona()?.avatar || ''} isChatRunning={isChatRunning} />}
      <div className="flex space-x-2">
        <Input
          type="text"
          placeholder="Type your message..."
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <Button onClick={handleSendMessage}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Send
        </Button>
        {isChatRunning && <Button variant="outline" onClick={handleStopChat}>
          Stop
        </Button>}
        <Button variant="outline" onClick={clearChatMessages}>
          Clear Chat
        </Button>
      </div>
    </div>
  )
}