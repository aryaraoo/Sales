"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mic, MicOff, Volume2, Bot, Settings, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { useTextToSpeech } from "@/hooks/use-text-to-speech"
import { ScenarioInfo } from "@/components/scenario-info"
import { FeedbackModal } from "@/components/feedback-modal"
import { SettingsModal } from "@/components/settings-modal"
import { SALES_SCENARIOS, type ScenarioType } from "@/lib/ai-prompts"
import { createClient } from "@/lib/supabase/client"

interface TrainingSessionProps {
  scenario: string
  userId: string
}

interface FeedbackData {
  score: number
  strengths: string[]
  improvements: string[]
  recommendations: string[]
  scenarioFeedback: string
}

export function TrainingSession({ scenario, userId }: TrainingSessionProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [isRecovering, setIsRecovering] = useState(false)
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  const { isListening, transcript, isSupported, startListening, stopListening, abortListening, resetTranscript } =
    useSpeechRecognition()
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech()

  const scenarioData = SALES_SCENARIOS[scenario as ScenarioType]
  const supabase = createClient()

  // Fetch user and profile data
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profile)
      }
    }
    fetchUserData()
  }, [supabase])

  // Session cleanup function
  const cleanupSession = useCallback(async () => {
    try {
      // Stop any ongoing speech IMMEDIATELY
      stopSpeaking()
      abortListening()
      
      if (conversationId) {
        // Cleanup server resources
        await fetch('/api/chat/cleanup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, userId })
        }).catch((error) => {
          console.warn('Session cleanup failed:', error)
        })
      }
    } catch (error) {
      console.error('Error cleaning up session:', error)
    }
  }, [conversationId, userId, stopSpeaking, abortListening])

  // Handle page unload and route changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (messages.length > 1) {
        e.preventDefault()
        e.returnValue = 'You have an active training session. Are you sure you want to leave?'
        cleanupSession()
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Stop speech when tab becomes hidden
        stopSpeaking()
        abortListening()
      }
    }

    const handleRouteChange = () => {
      cleanupSession()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // Cleanup on component unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      cleanupSession()
    }
  }, [messages.length, cleanupSession, stopSpeaking, abortListening])

  const getInitialMessage = (scenario: string) => {
    switch (scenario) {
      case "cold_calling":
        return "Hello? This is quite unexpected. I'm actually in the middle of something important right now. What is this regarding?"
      case "demo_pitch":
        return "Thank you for setting up this demo. I'm interested to see what you have to show us. Our team is always looking for solutions that can help us scale more efficiently."
      case "upsell":
        return "Hi there! Good to hear from you. We've been quite happy with the current service you're providing. What's this about?"
      default:
        return "Hello! Let's begin your sales training session."
    }
  }

  // Initialize conversation with trainer greeting
  useEffect(() => {
    if (messages.length === 0) {
      const initialMessage = { role: "assistant" as const, content: getInitialMessage(scenario) }
      setMessages([initialMessage])
      // Auto-speak the initial message
      speak(getInitialMessage(scenario))
      
      // Create conversation ID immediately when session starts
      createConversationId()
    }
  }, [scenario, messages.length, speak])

  // Create conversation ID for tracking
  const createConversationId = async () => {
    try {
      const scenarioName = scenario.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
      const title = `${scenarioName} - ${new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`
      
      const { data: newConversation, error } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          title,
          scenario_type: scenario,
          messages: JSON.stringify([]),
          score: 0,
          feedback: null,
          status: 'active'
        })
        .select('id')
        .single()

      if (error) {
        console.error("Failed to create conversation:", error)
      } else {
        setConversationId(newConversation.id)
        console.log("Conversation created with ID:", newConversation.id)
      }
    } catch (error) {
      console.error("Error creating conversation:", error)
    }
  }

  // Handle transcript changes
  useEffect(() => {
    if (transcript && !isListening) {
      handleUserMessage(transcript)
      resetTranscript()
    }
  }, [transcript, isListening, resetTranscript])

  const handleUserMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isProcessing) return

    setIsProcessing(true)
    setIsRecovering(false)
    const newMessages = [...messages, { role: "user" as const, content: userMessage }]
    setMessages(newMessages)

    const maxRetries = 3
    let attempt = 0

    while (attempt < maxRetries) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages,
            scenario,
            userId,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

        const data = await response.json()
        if (!data.message) throw new Error("Invalid response format")

        const trainerMessage = { role: "assistant" as const, content: data.message }
        const updatedMessages = [...newMessages, trainerMessage]
        setMessages(updatedMessages)
        speak(data.message)
        setRetryCount(0)
        
        // Update conversation in database with latest messages
        if (conversationId) {
          try {
            await supabase
              .from("conversations")
              .update({
                messages: JSON.stringify(updatedMessages),
                updated_at: new Date().toISOString(),
              })
              .eq("id", conversationId)
              .eq("user_id", userId)
          } catch (error) {
            console.warn("Failed to update conversation:", error)
          }
        }
        
        break

      } catch (error) {
        attempt++
        console.error(`Error getting trainer response (attempt ${attempt}):`, error)
        
        if (attempt < maxRetries) {
          setIsRecovering(true)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // Progressive delay
        } else {
          const errorMessage = {
            role: "assistant" as const,
            content: "I apologize, but I'm experiencing technical difficulties. Let's continue with your training. Could you please try rephrasing your last statement?",
          }
          setMessages((prev) => [...prev, errorMessage])
          speak(errorMessage.content)
          setRetryCount(prev => prev + 1)
        }
      }
    }
    
    setIsProcessing(false)
    setIsRecovering(false)
  }

  const handleMicClick = () => {
    try {
      if (isListening) {
        stopListening()
      } else {
        if (isSpeaking) {
          stopSpeaking()
        }
        startListening()
      }
    } catch (error) {
      console.error("Error handling microphone:", error)
      // Force reset speech states on error
      try { 
        abortListening() 
        stopSpeaking()
      } catch (cleanupError) {
        console.error("Error during cleanup:", cleanupError)
      }
    }
  }

  const handleEndSession = async () => {
    if (messages.length < 2) {
      alert("Please have a conversation before ending the session.")
      return
    }

    setIsGeneratingFeedback(true)

    try {
      console.log("[v0] Calling feedback API with:", { messagesCount: messages.length, scenario, userId })

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages,
          scenario,
          userId,
          conversationId,
        }),
      })

      console.log("[v0] Feedback API response status:", response.status)
      console.log("[v0] Feedback API response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Feedback API error response:", errorText)
        throw new Error(`Failed to generate feedback: ${response.status} ${response.statusText}`)
      }

      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const responseText = await response.text()
        console.error("[v0] Non-JSON response from feedback API:", responseText)
        throw new Error("Feedback API returned non-JSON response")
      }

      const data = await response.json()
      console.log("[v0] Feedback data received:", data)

      // Store the conversation ID if it was created
      if (data.conversationId) {
        setConversationId(data.conversationId)
      }

      setFeedbackData(data)
      setShowFeedback(true)
    } catch (error) {
      console.error("[v0] Error generating feedback:", error)
      alert(`Failed to generate feedback: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsGeneratingFeedback(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Speech Recognition Not Supported</h3>
            <p className="text-gray-600">
              Your browser doesn't support speech recognition. Please use a modern browser like Chrome or Edge.
            </p>
            <Button className="mt-4" onClick={() => router.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={async () => {
              await cleanupSession()
              router.back()
            }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{scenarioData?.title || "Sales Training"}</h1>
                {isSpeaking && (
                  <div className="flex items-center gap-2 text-purple-600">
                    <Volume2 className="w-4 h-4" />
                    <span className="text-sm">Trainer Speaking...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {profile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {profile?.email || user.email}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowSettings(true)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </div>
            )}
            <Button
              onClick={handleEndSession}
              disabled={isGeneratingFeedback || messages.length < 2}
              className="bg-red-600 hover:bg-red-700"
            >
              {isGeneratingFeedback ? "Generating Feedback..." : "End Session"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        <ScenarioInfo scenario={scenario as ScenarioType} />

        {/* Conversation Display */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === "user" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
              {(isProcessing || isRecovering) && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
                    <p className="text-sm">
                      {isRecovering ? "Reconnecting..." : "Trainer is thinking..."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Voice Interface */}
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mb-8">
              <div
                className={`relative w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center transition-all duration-300 transform hover:scale-105 ${
                  isListening
                    ? "bg-gradient-to-br from-red-400 via-red-500 to-red-600 animate-pulse shadow-lg shadow-red-400/50"
                    : isSpeaking
                      ? "bg-gradient-to-br from-green-400 via-green-500 to-green-600 animate-pulse shadow-lg shadow-green-400/50"
                      : "bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 shadow-lg shadow-purple-400/50"
                }`}
              >
                {/* Animated ring */}
                <div 
                  className={`absolute inset-0 rounded-full ${
                    isListening || isSpeaking 
                      ? 'animate-ping bg-white/20' 
                      : ''
                  }`}
                />
                
                {/* Inner glow */}
                <div className="absolute inset-2 rounded-full bg-white/10 backdrop-blur-sm" />
                
                {/* Icon container */}
                <div className="relative z-10 flex items-center justify-center">
                  {isListening ? (
                    <MicOff className="w-12 h-12 text-white drop-shadow-lg" />
                  ) : isSpeaking ? (
                    <Volume2 className="w-12 h-12 text-white drop-shadow-lg animate-bounce" />
                  ) : (
                    <div className="relative">
                      <Mic className="w-12 h-12 text-white drop-shadow-lg" />
                      {/* Small bot indicator */}
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-purple-600" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Floating particles effect */}
                {(isListening || isSpeaking) && (
                  <>
                    <div className="absolute top-2 left-4 w-1 h-1 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '0ms' }} />
                    <div className="absolute top-6 right-2 w-1 h-1 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '200ms' }} />
                    <div className="absolute bottom-4 left-2 w-1 h-1 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '400ms' }} />
                    <div className="absolute bottom-2 right-6 w-1 h-1 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '600ms' }} />
                  </>
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {isListening ? "Listening..." : isSpeaking ? "Trainer Speaking..." : "Ready to Continue"}
              </h3>
              <p className="text-gray-600">
                {isListening
                  ? "Speak naturally and practice your sales conversation"
                  : isSpeaking
                    ? "Sales trainer is responding to your message"
                    : "Click the microphone to respond"}
              </p>
              {transcript && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>You said:</strong> {transcript}
                  </p>
                </div>
              )}
            </div>

            <Button
              size="lg"
              className={`rounded-full px-8 py-4 ${
                isListening
                  ? "bg-red-600 hover:bg-red-700"
                  : isSpeaking
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-purple-600 hover:bg-purple-700"
              }`}
              onClick={handleMicClick}
              disabled={isProcessing || isGeneratingFeedback}
            >
              {isListening ? "Stop Listening" : isSpeaking ? "Stop Trainer" : "Start Speaking"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        feedback={feedbackData}
        scenario={scenario}
      />

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        profile={profile}
      />
    </div>
  )
}
