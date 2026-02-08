'use client'

import { useState, useEffect, useRef } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  FiSend,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiEdit2,
  FiCheck,
  FiX,
  FiLoader,
  FiHome,
  FiMessageSquare,
  FiSliders
} from 'react-icons/fi'

// TypeScript interfaces from actual agent response
interface DesignRecommendations {
  color_palette?: string[]
  furniture_suggestions?: string[]
  layout_tips?: string[]
  decor_items?: string[]
  key_principles?: string[]
}

interface AgentResult {
  message?: string
  design_recommendations?: DesignRecommendations
  next_steps?: string
}

interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: Date
  result?: AgentResult
}

interface ChatSession {
  id: string
  title: string
  roomType: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

const AGENT_ID = '698836b220be1079ff146ee8'
const QUICK_PROMPTS = [
  'Change style',
  'Budget alternatives',
  'Color options',
  'Lighting suggestions'
]

const COLOR_SCHEMES = [
  { name: 'Neutral Elegance', colors: ['White', 'Beige', 'Light Gray', 'Cream'] },
  { name: 'Warm & Cozy', colors: ['Terracotta', 'Warm Brown', 'Golden Yellow', 'Burnt Orange'] },
  { name: 'Cool & Calm', colors: ['Soft Blue', 'Sage Green', 'Light Gray', 'White'] },
  { name: 'Bold & Modern', colors: ['Charcoal Gray', 'Deep Navy', 'Mustard Yellow', 'White'] },
  { name: 'Earthy & Natural', colors: ['Olive Green', 'Tan', 'Clay', 'Ivory'] },
  { name: 'Pastel Dreams', colors: ['Blush Pink', 'Mint Green', 'Lavender', 'Cream'] },
]

const DESIGN_STYLES = [
  { name: 'Modern Minimalist', description: 'Clean lines, neutral colors, functional furniture' },
  { name: 'Scandinavian', description: 'Light woods, white walls, cozy textiles, natural light' },
  { name: 'Industrial', description: 'Exposed brick, metal accents, reclaimed wood, concrete' },
  { name: 'Bohemian', description: 'Eclectic mix, vibrant colors, plants, textured fabrics' },
  { name: 'Mid-Century Modern', description: 'Iconic furniture, bold colors, geometric patterns' },
  { name: 'Farmhouse', description: 'Rustic wood, vintage pieces, soft neutrals, shiplap' },
  { name: 'Contemporary', description: 'Current trends, mixed materials, bold accents' },
  { name: 'Traditional', description: 'Classic furniture, rich colors, ornate details' },
  { name: 'Coastal', description: 'Light blues, whites, natural textures, airy feel' },
  { name: 'Art Deco', description: 'Luxurious materials, geometric patterns, bold colors' },
]

export default function Home() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [selectedColorScheme, setSelectedColorScheme] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load sessions from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('roomcraft_sessions')
    if (stored) {
      const parsed = JSON.parse(stored)
      const sessionsWithDates = parsed.map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        updatedAt: new Date(s.updatedAt),
        messages: s.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      }))
      setSessions(sessionsWithDates)
    }
  }, [])

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('roomcraft_sessions', JSON.stringify(sessions))
    }
  }, [sessions])

  // Load current session messages
  useEffect(() => {
    if (currentSessionId) {
      const session = sessions.find(s => s.id === currentSessionId)
      if (session) {
        setMessages(session.messages)
      }
    }
  }, [currentSessionId, sessions])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const currentSession = sessions.find(s => s.id === currentSessionId)

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Design',
      roomType: 'General',
      messages: [{
        id: Date.now().toString(),
        role: 'agent',
        content: "Welcome to RoomCraft! I'm your personal interior design consultant. Tell me about the room you'd like to design - its dimensions, current state, your style preferences, and budget.",
        timestamp: new Date()
      }],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setSessions(prev => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    setMessages(newSession.messages)
  }

  const deleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null)
      setMessages([])
    }
  }

  const updateSessionTitle = (title: string) => {
    if (currentSessionId && title.trim()) {
      setSessions(prev => prev.map(s =>
        s.id === currentSessionId ? { ...s, title: title.trim(), updatedAt: new Date() } : s
      ))
      setIsEditingTitle(false)
    }
  }

  const detectRoomType = (message: string): string => {
    const lower = message.toLowerCase()
    if (lower.includes('living room')) return 'Living Room'
    if (lower.includes('bedroom')) return 'Bedroom'
    if (lower.includes('kitchen')) return 'Kitchen'
    if (lower.includes('bathroom')) return 'Bathroom'
    if (lower.includes('dining')) return 'Dining Room'
    if (lower.includes('office')) return 'Office'
    return 'General'
  }

  const applyPreferences = () => {
    let preferencesText = ''
    if (selectedColorScheme) {
      const scheme = COLOR_SCHEMES.find(s => s.name === selectedColorScheme)
      if (scheme) {
        preferencesText += `I prefer a ${scheme.name} color scheme with colors like ${scheme.colors.join(', ')}. `
      }
    }
    if (selectedStyle) {
      const style = DESIGN_STYLES.find(s => s.name === selectedStyle)
      if (style) {
        preferencesText += `I want a ${style.name} style design. `
      }
    }
    if (preferencesText) {
      setInputValue(preferencesText)
      setShowPreferences(false)
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    if (!currentSessionId) {
      createNewSession()
      // Wait for session to be created
      setTimeout(() => sendMessage(content), 100)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    }

    // Add user message
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue('')
    setIsLoading(true)

    // Detect room type from first user message
    if (messages.length === 1) {
      const roomType = detectRoomType(content)
      setSessions(prev => prev.map(s =>
        s.id === currentSessionId ? {
          ...s,
          roomType,
          title: `${roomType} Design`,
          updatedAt: new Date()
        } : s
      ))
    }

    try {
      const result = await callAIAgent(content, AGENT_ID, {
        session_id: currentSessionId
      })

      let agentMessage: Message

      if (result.success && result.response.status === 'success') {
        const agentResult = result.response.result as AgentResult
        agentMessage = {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: agentResult.message || 'I received your request.',
          timestamp: new Date(),
          result: agentResult
        }
      } else {
        agentMessage = {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          content: 'I apologize, but I encountered an issue. Please try again.',
          timestamp: new Date()
        }
      }

      const finalMessages = [...updatedMessages, agentMessage]
      setMessages(finalMessages)

      // Update session
      setSessions(prev => prev.map(s =>
        s.id === currentSessionId ? {
          ...s,
          messages: finalMessages,
          updatedAt: new Date()
        } : s
      ))
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: 'Network error. Please check your connection and try again.',
        timestamp: new Date()
      }
      const finalMessages = [...updatedMessages, errorMessage]
      setMessages(finalMessages)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.roomType.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{
      fontFamily: 'Nunito, Quicksand, sans-serif',
      backgroundColor: 'hsl(40 30% 96%)',
      color: 'hsl(30 25% 18%)'
    }}>
      {/* Sidebar */}
      <div
        className={`${sidebarCollapsed ? 'w-0' : 'w-80'} transition-all duration-300 flex-shrink-0 border-r overflow-hidden`}
        style={{
          backgroundColor: 'hsl(40 28% 94%)',
          borderColor: 'hsl(35 22% 85%)'
        }}
      >
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b" style={{ borderColor: 'hsl(35 22% 85%)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold" style={{
                fontFamily: 'Merriweather, Georgia, serif',
                color: 'hsl(25 55% 40%)'
              }}>
                RoomCraft AI
              </h2>
            </div>
            <Button
              onClick={createNewSession}
              className="w-full"
              style={{
                backgroundColor: 'hsl(25 55% 40%)',
                color: 'hsl(40 30% 98%)',
                borderRadius: '0.5rem'
              }}
            >
              <FiPlus className="mr-2" />
              New Design
            </Button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b" style={{ borderColor: 'hsl(35 22% 85%)' }}>
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2" style={{ color: 'hsl(30 15% 45%)' }} />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                style={{
                  backgroundColor: 'hsl(40 40% 99%)',
                  borderColor: 'hsl(35 20% 75%)',
                  borderRadius: '0.5rem'
                }}
              />
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {filteredSessions.length === 0 && (
              <p className="text-center text-sm" style={{ color: 'hsl(30 15% 45%)' }}>
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </p>
            )}
            {filteredSessions.map(session => (
              <Card
                key={session.id}
                className={`cursor-pointer transition-all ${currentSessionId === session.id ? 'ring-2' : ''}`}
                onClick={() => setCurrentSessionId(session.id)}
                style={{
                  backgroundColor: currentSessionId === session.id ? 'hsl(40 35% 98%)' : 'hsl(40 40% 99%)',
                  borderColor: 'hsl(35 25% 82%)',
                  borderRadius: '0.5rem',
                  borderWidth: '1px',
                  ringColor: currentSessionId === session.id ? 'hsl(25 55% 40%)' : undefined
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FiHome size={14} style={{ color: 'hsl(25 55% 40%)' }} />
                        <span className="text-xs font-medium" style={{ color: 'hsl(25 55% 40%)' }}>
                          {session.roomType}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm truncate mb-1">
                        {session.title}
                      </h3>
                      <p className="text-xs truncate" style={{ color: 'hsl(30 15% 45%)' }}>
                        {session.messages[session.messages.length - 1]?.content.substring(0, 50)}...
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'hsl(30 15% 45%)' }}>
                        {formatTime(session.updatedAt)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(session.id)
                      }}
                      className="p-1 hover:bg-opacity-80 rounded"
                      style={{ color: 'hsl(0 65% 50%)' }}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentSession ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{
              backgroundColor: 'hsl(40 35% 98%)',
              borderColor: 'hsl(35 25% 82%)'
            }}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="p-2 hover:bg-opacity-80 rounded"
                  style={{ color: 'hsl(30 25% 18%)' }}
                >
                  <FiMessageSquare size={20} />
                </button>
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') updateSessionTitle(editedTitle)
                        if (e.key === 'Escape') setIsEditingTitle(false)
                      }}
                      className="flex-1"
                      autoFocus
                      style={{
                        backgroundColor: 'hsl(40 40% 99%)',
                        borderColor: 'hsl(35 20% 75%)',
                        borderRadius: '0.5rem'
                      }}
                    />
                    <button
                      onClick={() => updateSessionTitle(editedTitle)}
                      className="p-1"
                      style={{ color: 'hsl(25 55% 40%)' }}
                    >
                      <FiCheck size={20} />
                    </button>
                    <button
                      onClick={() => setIsEditingTitle(false)}
                      className="p-1"
                      style={{ color: 'hsl(30 15% 45%)' }}
                    >
                      <FiX size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <h1 className="text-xl font-bold truncate" style={{ fontFamily: 'Merriweather, Georgia, serif' }}>
                      {currentSession.title}
                    </h1>
                    <button
                      onClick={() => {
                        setEditedTitle(currentSession.title)
                        setIsEditingTitle(true)
                      }}
                      className="p-1"
                      style={{ color: 'hsl(30 15% 45%)' }}
                    >
                      <FiEdit2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreferences(!showPreferences)}
                  className="p-2 hover:bg-opacity-80 rounded"
                  style={{
                    color: showPreferences ? 'hsl(25 55% 40%)' : 'hsl(30 25% 18%)',
                    backgroundColor: showPreferences ? 'hsl(40 25% 90%)' : 'transparent'
                  }}
                  title="Design Preferences"
                >
                  <FiSliders size={20} />
                </button>
                <div className="px-3 py-1 rounded-full text-sm font-medium" style={{
                  backgroundColor: 'hsl(40 25% 90%)',
                  color: 'hsl(30 25% 22%)'
                }}>
                  {currentSession.roomType}
                </div>
              </div>
            </div>

            {/* Preferences Panel */}
            {showPreferences && (
              <div className="border-b p-4" style={{
                backgroundColor: 'hsl(40 35% 98%)',
                borderColor: 'hsl(35 25% 82%)'
              }}>
                <div className="max-w-4xl mx-auto space-y-4">
                  {/* Color Schemes */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'hsl(25 55% 40%)' }}>
                      Color Schemes
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {COLOR_SCHEMES.map((scheme) => (
                        <button
                          key={scheme.name}
                          onClick={() => setSelectedColorScheme(selectedColorScheme === scheme.name ? null : scheme.name)}
                          className="p-3 rounded-lg text-left transition-all"
                          style={{
                            backgroundColor: selectedColorScheme === scheme.name ? 'hsl(25 55% 40%)' : 'hsl(40 40% 99%)',
                            color: selectedColorScheme === scheme.name ? 'hsl(40 30% 98%)' : 'hsl(30 25% 18%)',
                            border: '1px solid',
                            borderColor: selectedColorScheme === scheme.name ? 'hsl(25 55% 40%)' : 'hsl(35 25% 82%)'
                          }}
                        >
                          <div className="font-semibold text-sm mb-1">{scheme.name}</div>
                          <div className="text-xs opacity-80">{scheme.colors.join(', ')}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Design Styles */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: 'hsl(25 55% 40%)' }}>
                      Design Styles
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                      {DESIGN_STYLES.map((style) => (
                        <button
                          key={style.name}
                          onClick={() => setSelectedStyle(selectedStyle === style.name ? null : style.name)}
                          className="p-3 rounded-lg text-left transition-all"
                          style={{
                            backgroundColor: selectedStyle === style.name ? 'hsl(25 55% 40%)' : 'hsl(40 40% 99%)',
                            color: selectedStyle === style.name ? 'hsl(40 30% 98%)' : 'hsl(30 25% 18%)',
                            border: '1px solid',
                            borderColor: selectedStyle === style.name ? 'hsl(25 55% 40%)' : 'hsl(35 25% 82%)'
                          }}
                          title={style.description}
                        >
                          <div className="font-semibold text-sm">{style.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Apply Button */}
                  {(selectedColorScheme || selectedStyle) && (
                    <div className="flex justify-end gap-2">
                      <Button
                        onClick={() => {
                          setSelectedColorScheme(null)
                          setSelectedStyle(null)
                        }}
                        variant="outline"
                        className="text-sm"
                        style={{
                          borderColor: 'hsl(35 25% 82%)',
                          color: 'hsl(30 25% 18%)'
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        onClick={applyPreferences}
                        className="text-sm"
                        style={{
                          backgroundColor: 'hsl(25 55% 40%)',
                          color: 'hsl(40 30% 98%)',
                          borderRadius: '0.5rem'
                        }}
                      >
                        Apply Preferences
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-2xl rounded-lg p-4 ${message.role === 'user' ? 'ml-12' : 'mr-12'}`}
                    style={{
                      backgroundColor: message.role === 'user'
                        ? 'hsl(25 55% 40%)'
                        : 'hsl(40 35% 98%)',
                      color: message.role === 'user'
                        ? 'hsl(40 30% 98%)'
                        : 'hsl(30 25% 18%)',
                      borderRadius: '0.5rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div className="whitespace-pre-wrap" style={{ lineHeight: '1.65' }}>
                      {message.content}
                    </div>

                    {/* Design Recommendations */}
                    {message.role === 'agent' && message.result?.design_recommendations && (
                      <div className="mt-4 space-y-3">
                        {message.result.design_recommendations.color_palette && message.result.design_recommendations.color_palette.length > 0 && (
                          <div className="p-3 rounded" style={{ backgroundColor: 'hsl(40 20% 88%)' }}>
                            <h4 className="font-semibold mb-2 text-sm" style={{ color: 'hsl(25 55% 40%)' }}>
                              Color Palette
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {message.result.design_recommendations.color_palette.map((color, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 rounded-full text-sm"
                                  style={{
                                    backgroundColor: 'hsl(40 40% 99%)',
                                    color: 'hsl(30 25% 18%)'
                                  }}
                                >
                                  {color}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {message.result.design_recommendations.furniture_suggestions && message.result.design_recommendations.furniture_suggestions.length > 0 && (
                          <div className="p-3 rounded" style={{ backgroundColor: 'hsl(40 20% 88%)' }}>
                            <h4 className="font-semibold mb-2 text-sm" style={{ color: 'hsl(25 55% 40%)' }}>
                              Furniture Suggestions
                            </h4>
                            <ul className="space-y-1">
                              {message.result.design_recommendations.furniture_suggestions.map((item, idx) => (
                                <li key={idx} className="text-sm">• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {message.result.design_recommendations.layout_tips && message.result.design_recommendations.layout_tips.length > 0 && (
                          <div className="p-3 rounded" style={{ backgroundColor: 'hsl(40 20% 88%)' }}>
                            <h4 className="font-semibold mb-2 text-sm" style={{ color: 'hsl(25 55% 40%)' }}>
                              Layout Tips
                            </h4>
                            <ul className="space-y-1">
                              {message.result.design_recommendations.layout_tips.map((tip, idx) => (
                                <li key={idx} className="text-sm">• {tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {message.result.design_recommendations.decor_items && message.result.design_recommendations.decor_items.length > 0 && (
                          <div className="p-3 rounded" style={{ backgroundColor: 'hsl(40 20% 88%)' }}>
                            <h4 className="font-semibold mb-2 text-sm" style={{ color: 'hsl(25 55% 40%)' }}>
                              Decor Items
                            </h4>
                            <ul className="space-y-1">
                              {message.result.design_recommendations.decor_items.map((item, idx) => (
                                <li key={idx} className="text-sm">• {item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {message.result.design_recommendations.key_principles && message.result.design_recommendations.key_principles.length > 0 && (
                          <div className="p-3 rounded" style={{ backgroundColor: 'hsl(40 20% 88%)' }}>
                            <h4 className="font-semibold mb-2 text-sm" style={{ color: 'hsl(25 55% 40%)' }}>
                              Key Principles
                            </h4>
                            <ul className="space-y-1">
                              {message.result.design_recommendations.key_principles.map((principle, idx) => (
                                <li key={idx} className="text-sm">• {principle}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Next Steps */}
                    {message.role === 'agent' && message.result?.next_steps && (
                      <div className="mt-3 pt-3 border-t" style={{ borderColor: 'hsl(35 25% 82%)' }}>
                        <p className="text-sm font-medium" style={{ color: 'hsl(15 60% 45%)' }}>
                          {message.result.next_steps}
                        </p>
                      </div>
                    )}

                    <div className="text-xs mt-2" style={{
                      color: message.role === 'user' ? 'hsl(40 30% 98%)' : 'hsl(30 15% 45%)',
                      opacity: 0.8
                    }}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div
                    className="max-w-2xl rounded-lg p-4 mr-12"
                    style={{
                      backgroundColor: 'hsl(40 35% 98%)',
                      borderRadius: '0.5rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    <FiLoader className="animate-spin" size={20} style={{ color: 'hsl(25 55% 40%)' }} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            {messages.length > 1 && (
              <div className="px-6 py-2 border-t" style={{ borderColor: 'hsl(35 25% 82%)' }}>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(prompt)}
                      disabled={isLoading}
                      className="px-3 py-1 rounded-full text-sm hover:opacity-80 transition-opacity"
                      style={{
                        backgroundColor: 'hsl(40 25% 90%)',
                        color: 'hsl(30 25% 22%)',
                        border: '1px solid hsl(35 25% 82%)'
                      }}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-4 border-t" style={{
              backgroundColor: 'hsl(40 35% 98%)',
              borderColor: 'hsl(35 25% 82%)'
            }}>
              <div className="max-w-4xl mx-auto flex gap-2">
                <textarea
                  value={inputValue}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setInputValue(e.target.value)
                    }
                  }}
                  onKeyPress={handleKeyPress}
                  placeholder="Describe your room or ask a design question..."
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 px-4 py-3 rounded-lg resize-none focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: 'hsl(40 40% 99%)',
                    borderColor: 'hsl(35 20% 75%)',
                    border: '1px solid',
                    borderRadius: '0.5rem',
                    lineHeight: '1.65',
                    ringColor: 'hsl(25 55% 40%)'
                  }}
                />
                <Button
                  onClick={() => sendMessage(inputValue)}
                  disabled={isLoading || !inputValue.trim()}
                  className="px-6"
                  style={{
                    backgroundColor: 'hsl(25 55% 40%)',
                    color: 'hsl(40 30% 98%)',
                    borderRadius: '0.5rem'
                  }}
                >
                  {isLoading ? <FiLoader className="animate-spin" size={20} /> : <FiSend size={20} />}
                </Button>
              </div>
              <div className="max-w-4xl mx-auto mt-1 text-xs text-right" style={{ color: 'hsl(30 15% 45%)' }}>
                {inputValue.length}/500
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="mb-6">
                <FiHome size={64} style={{ color: 'hsl(25 55% 40%)', margin: '0 auto' }} />
              </div>
              <h1 className="text-3xl font-bold mb-3" style={{
                fontFamily: 'Merriweather, Georgia, serif',
                color: 'hsl(25 55% 40%)'
              }}>
                Welcome to RoomCraft AI
              </h1>
              <p className="mb-6" style={{
                color: 'hsl(30 15% 45%)',
                lineHeight: '1.65'
              }}>
                Your personal interior design consultant with conversation memory.
                Start a new design session to transform your space.
              </p>
              <Button
                onClick={createNewSession}
                className="px-6 py-3"
                style={{
                  backgroundColor: 'hsl(25 55% 40%)',
                  color: 'hsl(40 30% 98%)',
                  borderRadius: '0.5rem'
                }}
              >
                <FiPlus className="mr-2" />
                Start New Design
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
