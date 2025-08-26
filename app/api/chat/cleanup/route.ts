import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { conversationId, userId } = await request.json()

    if (!conversationId || !userId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user ownership of the conversation
    const { data: conversation, error: fetchError } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single()

    if (fetchError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    // Update conversation status to indicate it was terminated
    const { error: updateError } = await supabase
      .from("conversations")
      .update({ 
        status: "terminated",
        updated_at: new Date().toISOString()
      })
      .eq("id", conversationId)

    if (updateError) {
      console.error("Error updating conversation status:", updateError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in cleanup endpoint:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
