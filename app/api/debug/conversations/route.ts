import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    
    console.log("Debug: Getting conversations for user:", user.id)
    
    // Get all conversations for the user
    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    
    if (conversationsError) {
      console.error("Debug: Error fetching conversations:", conversationsError)
      return NextResponse.json({ 
        error: "Failed to fetch conversations", 
        details: conversationsError 
      }, { status: 500 })
    }
    
    console.log("Debug: Found conversations:", conversations?.length || 0)
    
    // Also get table schema info
    const { data: tableInfo, error: schemaError } = await supabase
      .rpc('exec', { 
        query: "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'conversations' ORDER BY ordinal_position" 
      })
      .single()
    
    return NextResponse.json({
      user_id: user.id,
      conversations_count: conversations?.length || 0,
      conversations: conversations,
      table_schema: tableInfo || "Could not fetch schema",
      schema_error: schemaError
    })
  } catch (error) {
    console.error("Debug API error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }
    
    const body = await request.json()
    const { action } = body
    
    if (action === "create_test_conversation") {
      // Create a test conversation
      const { data: newConversation, error: insertError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title: `Test Conversation - ${new Date().toISOString()}`,
          scenario_type: "cold_calling",
          messages: JSON.stringify([
            { role: "assistant", content: "Hello, this is a test conversation." },
            { role: "user", content: "Hi there!" }
          ])
        })
        .select("*")
        .single()
      
      if (insertError) {
        return NextResponse.json({ 
          error: "Failed to create test conversation", 
          details: insertError 
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        conversation: newConversation 
      })
    }
    
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Debug API POST error:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
