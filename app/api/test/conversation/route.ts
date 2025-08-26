import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Test basic connection
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      return NextResponse.json({ 
        error: "Authentication failed", 
        details: userError 
      }, { status: 401 })
    }
    
    if (!user) {
      return NextResponse.json({ 
        error: "No user found" 
      }, { status: 401 })
    }
    
    // Test simple conversation creation with minimal data
    console.log("Testing conversation creation for user:", user.id)
    
    const testTitle = `Test - ${new Date().toISOString()}`
    
    const { data: newConversation, error: insertError } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title: testTitle,
        scenario_type: "cold_calling",
        messages: "[]"
      })
      .select("*")
      .single()
    
    if (insertError) {
      console.error("Insert error:", insertError)
      return NextResponse.json({ 
        success: false,
        error: "Failed to create conversation", 
        details: insertError,
        user_id: user.id
      })
    }
    
    // Test fetching conversations
    const { data: conversations, error: fetchError } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5)
    
    if (fetchError) {
      return NextResponse.json({ 
        success: false,
        error: "Failed to fetch conversations", 
        details: fetchError 
      })
    }
    
    return NextResponse.json({
      success: true,
      user_id: user.id,
      test_conversation: newConversation,
      recent_conversations: conversations,
      conversation_count: conversations.length
    })
    
  } catch (error) {
    console.error("Test error:", error)
    return NextResponse.json({ 
      success: false,
      error: "Server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
