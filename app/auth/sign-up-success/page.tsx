import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import Link from "next/link"

export default function SignUpSuccessPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Please Verify Your Email</CardTitle>
            <CardDescription>We've sent a verification link to your email address to ensure security.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Please check your inbox and click the verification link to activate your Sales Training Assistant account. 
              The link will expire in 24 hours for security purposes.
            </p>
            <p className="text-xs text-gray-500 mb-4">
              Can't find the email? Please check your spam or junk folder. If you still don't see it, you may need to add our domain to your email whitelist.
            </p>
            <Link href="/auth/login" className="text-purple-600 hover:text-purple-700 underline underline-offset-4">
              Back to Sign In
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
