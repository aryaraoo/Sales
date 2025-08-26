import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TrainingSession } from "@/components/training-session"
import { ErrorBoundary, TrainingErrorFallback } from "@/components/error-boundary"

interface TrainingPageProps {
  params: {
    scenario: string
  }
}

export default async function TrainingPage({ params }: TrainingPageProps) {
  const { scenario } = await params
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const validScenarios = ["cold_calling", "demo_pitch", "upsell"]
  if (!validScenarios.includes(scenario)) {
    redirect("/dashboard")
  }

  return (
    <ErrorBoundary fallback={TrainingErrorFallback}>
      <TrainingSession scenario={scenario} userId={data.user.id} />
    </ErrorBoundary>
  )
}
