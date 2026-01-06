"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/navbar";
import Image from "next/image";
import { 
  GraduationCap, 
  Zap, 
  FileText, 
  LineChart, 
  Download,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:bg-gradient-to-br dark:from-blue-950 dark:via-indigo-950 dark:to-purple-950">
      <Navbar />

      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600/5 via-indigo-500/5 to-purple-600/5 backdrop-blur-sm dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10 overflow-hidden">
        {/* Decorative Background Images */}
        <div className="absolute inset-0 pointer-events-none opacity-10 dark:opacity-5">
          <Image
            src="/1.png"
            alt=""
            width={400}
            height={400}
            className="absolute top-10 left-10 animate-float"
            style={{ animationDelay: '0s' }}
          />
          <Image
            src="/2.png"
            alt=""
            width={350}
            height={350}
            className="absolute top-20 right-10 animate-float"
            style={{ animationDelay: '2s' }}
          />
          <Image
            src="/3.png"
            alt=""
            width={300}
            height={300}
            className="absolute bottom-20 left-20 animate-float"
            style={{ animationDelay: '1s' }}
          />
          <Image
            src="/4.png"
            alt=""
            width={320}
            height={320}
            className="absolute bottom-10 right-20 animate-float"
            style={{ animationDelay: '3s' }}
          />
        </div>
        <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Grading Technology
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-zinc-50 mb-6 leading-tight">
              Grade Exams 10x Faster with{" "}
              <span className="text-blue-600">AI Technology</span>
            </h1>
            
            <p className="text-base md:text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
              Upload handwritten or typed answer keys, let our AI analyze and grade student papers automatically. 
              Save hours of manual grading work.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <Button
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                  onClick={() => router.push("/dashboard")}
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8"
                    onClick={() => router.push("/signup")}
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8"
                    onClick={() => router.push("/login")}
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>

            <p className="mt-6 text-sm text-zinc-500">
              No credit card required • Free plan available
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Powerful Features for Modern Educators
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Everything you need to grade exams efficiently and accurately
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            <Card className="border-l-4 border-l-blue-600">
              <CardHeader>
                <Zap className="h-10 w-10 text-blue-600 mb-3" />
                <CardTitle className="text-xl">AI Handwriting Recognition</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Advanced OCR technology accurately reads handwritten and typed answers from scanned papers.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-600">
              <CardHeader>
                <GraduationCap className="h-10 w-10 text-blue-600 mb-3" />
                <CardTitle className="text-xl">Automated Grading</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Our AI compares student answers against your answer key and grades automatically with detailed feedback.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-600">
              <CardHeader>
                <LineChart className="h-10 w-10 text-blue-600 mb-3" />
                <CardTitle className="text-xl">Analytics & Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Track class performance, identify difficult questions, and get insights on student understanding.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-600">
              <CardHeader>
                <Download className="h-10 w-10 text-blue-600 mb-3" />
                <CardTitle className="text-xl">Export Results</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Download graded results in Excel or PDF format, ready to share with students and administrators.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-blue-600/5 via-indigo-500/5 to-purple-600/5 backdrop-blur-sm dark:from-blue-500/10 dark:via-indigo-500/10 dark:to-purple-500/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Start grading in minutes with our simple 4-step process
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white mb-4">
                  1
                </div>
                <h3 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-50">Upload Answer Key</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Upload professor&apos;s answer key in PDF format
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white mb-4">
                  2
                </div>
                <h3 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-50">Upload Student Papers</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Batch upload multiple student exam papers
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white mb-4">
                  3
                </div>
                <h3 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-50">AI Grades Automatically</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Our AI analyzes and grades each paper with feedback
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white mb-4">
                  4
                </div>
                <h3 className="text-lg font-semibold mb-2 text-zinc-900 dark:text-zinc-50">Review & Export</h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Review results, make adjustments, and export
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section className="py-20 bg-white/50 backdrop-blur-sm dark:bg-zinc-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Choose the plan that fits your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Free</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">PKR 0</span>
                  <span className="text-zinc-500">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {["5 exams per month", "50 submissions", "Basic AI grading", "PDF export"].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-600 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                Popular
              </div>
              <CardHeader>
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">PKR 2,500</span>
                  <span className="text-zinc-500">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {["50 exams per month", "500 submissions", "Advanced AI grading", "Excel & PDF export"].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">PKR 10,000</span>
                  <span className="text-zinc-500">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {["Unlimited exams", "Unlimited submissions", "Priority support", "Custom branding"].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="px-8">
                View All Plans & Features
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-700 dark:via-indigo-700 dark:to-purple-700">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Grading Process?
          </h2>
          <p className="text-base md:text-lg text-blue-100 mb-8 max-w-2xl mx-auto">
            Join educators who are saving hours every week with AI-powered grading
          </p>
          {user ? (
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 px-8"
              onClick={() => router.push("/dashboard")}
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-blue-50 px-8"
              onClick={() => router.push("/signup")}
            >
              Start Grading for Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-zinc-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-6 w-6 text-blue-600" />
                <span className="font-semibold text-white">AI Exam Grader</span>
              </div>
              <p className="text-sm">
                AI-powered exam grading for modern educators
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/#features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li className="hover:text-white cursor-pointer">Help Center</li>
                <li className="hover:text-white cursor-pointer">Contact Us</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li className="hover:text-white cursor-pointer">Privacy Policy</li>
                <li className="hover:text-white cursor-pointer">Terms of Service</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-zinc-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2026 AI Exam Grader. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
