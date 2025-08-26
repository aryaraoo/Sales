import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { FeedbackDisplay } from "@/components/feedback-display"

interface FeedbackPageProps {
  params: {
    scenario: string
  }
  searchParams: {
    conversationId?: string
  }
}

export default async function FeedbackPage({ params, searchParams }: FeedbackPageProps) {
  const { scenario } = await params
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  if (!resolvedSearchParams.conversationId) {
    redirect("/dashboard")
  }

  // Get conversation with feedback
  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", resolvedSearchParams.conversationId)
    .eq("user_id", data.user.id)
    .single()

  if (!conversation || !conversation.feedback) {
    redirect("/dashboard")
  }

  const feedback = typeof conversation.feedback === 'string' 
    ? JSON.parse(conversation.feedback) 
    : conversation.feedback

  return <FeedbackDisplay feedback={feedback} scenario={scenario} />
}
