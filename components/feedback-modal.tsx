"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Star, TrendingUp, Target, Lightbulb, MessageSquare } from "lucide-react"

interface FeedbackData {
  score: number
  strengths: string[]
  improvements: string[]
  recommendations: string[]
  scenarioFeedback: string
}

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  feedback: FeedbackData | null
  scenario: string
}

export function FeedbackModal({ isOpen, onClose, feedback, scenario }: FeedbackModalProps) {
  if (!isOpen || !feedback) return null

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100"
    if (score >= 60) return "text-yellow-600 bg-yellow-100"
    return "text-red-600 bg-red-100"
  }

  const formatScenarioName = (type: string) => {
    switch (type) {
      case "cold_calling":
        return "Cold Call Prospecting"
      case "demo_pitch":
        return "Product Demo Presentation"
      case "upsell":
        return "Upselling Existing Customers"
      default:
        return type.replace("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-white shadow-2xl">
        <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-900">Training Session Feedback</CardTitle>
                <p className="text-sm text-gray-600 mt-1">{formatScenarioName(scenario)}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <ScrollArea className="max-h-[70vh]">
          <CardContent className="p-6 space-y-6">
            {/* Overall Score */}
            <div className="text-center bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-center mb-4">
                <div className={`text-4xl font-bold px-4 py-2 rounded-full ${getScoreColor(feedback.score)}`}>
                  {feedback.score}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Performance Score</h3>
              <p className="text-gray-600">
                {feedback.score >= 80 ? "Excellent work! You handled this scenario very well." :
                 feedback.score >= 60 ? "Good job! There are some areas to refine." :
                 "Keep practicing! Focus on the feedback below to improve."}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <CardTitle className="text-lg text-green-900">Strengths</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedback.strengths.map((strength, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm text-green-800">{strength}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Areas for Improvement */}
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    <CardTitle className="text-lg text-orange-900">Areas for Improvement</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedback.improvements.map((improvement, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
                      <p className="text-sm text-orange-800">{improvement}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Key Recommendations */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-lg text-blue-900">Key Recommendations</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {feedback.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-sm text-blue-800">{recommendation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Scenario-Specific Feedback */}
            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                  <CardTitle className="text-lg text-purple-900">Detailed Analysis</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-purple-800 leading-relaxed">{feedback.scenarioFeedback}</p>
              </CardContent>
            </Card>
          </CardContent>
        </ScrollArea>

        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700" 
              onClick={() => {
                onClose()
                window.location.href = '/dashboard'
              }}
            >
              Continue Training
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
