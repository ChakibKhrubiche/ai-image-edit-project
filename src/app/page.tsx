'use client';

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { authClient } from "~/lib/auth-client";
import { useState, useEffect } from 'react';
import Upgrade from "~/components/sidebar/upgrade";
import {
  Sparkles,
  Shield,
  Star,
  ArrowRight,
  ImageIcon,
  Wand2,
  Eye,
  Lock,
  CheckCircle2,
  Play,
  Heart,
  Upload,
  User,
  LayoutDashboard,
  Zap,
  Crown
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [user, setUser] = useState<{ name?: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const session = await authClient.getSession(); 
        if (session?.data?.user) {
          setUser(session.data.user);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    void checkAuth();
  }, []);

  const features = [
    {
      icon: <Eye className="h-8 w-8" />,
      title: "Virtual Try-On",
      description:
        "Experience a realistic virtual hijab try on powered by AI. See how different hijab styles look on your face and outfits",
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      icon: <Wand2 className="h-8 w-8" />,
      title: "AI Models - Personal Styles",
      description:
        "Test your own hijab or scarf styles on realistic AI-generated models. No need to upload your photo — explore different looks privately using our virtual hijab try-on technology.",
      color: "text-pink-600",
      bgColor: "bg-pink-100",
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Privacy First",
      description:
        "Your photos are processed securely, never shared, and you stay in control. AI generation happens in a protected environment.",
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: "Shop with Confidence",
      description:
        "Reduce returns and shop smarter. Preview your hijab virtually before ordering and make confident fashion decisions.",
      color: "text-rose-600",
      bgColor: "bg-rose-100",
    },
  ];

  const testimonials = [
    {
      name: "-",
      role: ""/*"Fashion Enthusiast"*/,
      content:
        "This platform completely changed how I shop for hijabs. I can finally see how they look before buying!",
      rating: 5,
    },
    {
      name: "-",
      role: ""/*"Professional Stylist"*/,
      content:
        "It's like having a virtual fitting room. I like choosing the hijab that suits my face and outfit without any hassle.",
      rating: 5,
    },
    {
      name: "-",
      role: ""/*"Content Creator"*/,
      content:
        "Privacy was my biggest concern, but this platform handles everything securely. I feel completely safe using it.",
      rating: 5,
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      description: "Perfect for trying it out",
      price: "Free",
      priceValue: 0,
      credits: 3,
      icon: <Sparkles className="h-6 w-6" />,
      features: [
        "3 Virtual Try-Ons",
        "AI Technology",
        "Secure Processing",
        "Download Results",
        "Save Results to Collection"
      ],
      cta: "Get Started",
      highlighted: false,
      color: "from-blue-400 to-blue-600"
    },
    {
      name: "Creator",
      description: "Most popular for enthusiasts",
      price: "$2.99",
      priceValue: 2.99,
      credits: 30,
      icon: <Zap className="h-6 w-6" />,
      features: [
        "30 Virtual Try-Ons",
        "AI Technology",
        "Secure Processing",
        "Download Results",
        "Save Results to Collection"
      ],
      cta: "Get Creator",
      highlighted: true,
      color: "from-orange-400 to-pink-600"
    },
    {
      name: "Professional",
      description: "For serious fashion designers",
      price: "$5.99",
      priceValue: 5.99,
      credits: 100,
      icon: <Crown className="h-6 w-6" />,
      features: [
        "100 Virtual Try-Ons",
        "AI Technology",
        "Secure Processing",
        "Download Results",
        "Save Results to Collection"
      ],
      cta: "Get Professional",
      highlighted: false,
      color: "from-purple-400 to-purple-600"
    },
    {
      name: "Ultimate",
      description: "For professional businesses",
      price: "$14.99",
      priceValue: 14.99,
      credits: 300,
      icon: <Crown className="h-6 w-6" />,
      features: [
        "300 Virtual Try-Ons",
        "AI Technology",
        "Secure Processing",
        "Download Results",
        "Save Results to Collection"
      ],
      cta: "Get Ultimate",
      highlighted: false,
      color: "from-amber-400 to-orange-600"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-purple-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-purple-200/40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg">
                <img
                  src="https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771"
                  alt="Logo"
                  className="h-8 w-8 object-contain"
                />
              </div>
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-lg font-bold text-transparent">
                Hijab TryOn
              </span>
            </div>

            <div className="hidden items-center space-x-8 md:flex">
              <Link
                href="#features"
                className="text-gray-700 font-medium transition-colors hover:text-purple-600"
              >
                Features
              </Link>
              <Link
                href="#how-it-works"
                className="text-gray-700 font-medium transition-colors hover:text-purple-600"
              >
                How It Works
              </Link>
              <Link
                href="#pricing"
                className="text-gray-700 font-medium transition-colors hover:text-purple-600"
              >
                Pricing
              </Link>
              {/*}
              <Link
                href="#testimonials"
                className="text-gray-700 font-medium transition-colors hover:text-purple-600"
              >
                Reviews
              </Link>
              */}
            </div>

            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-9 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : user ? (
                <>
                  <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-purple-200/60 bg-purple-50">
                    <User className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-700">
                      {user.name ?? 'User'}
                    </span>
                  </div>
                  <Link href="/dashboard">
                    <Button 
                      size="sm" 
                      className="cursor-pointer gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/auth/sign-in" >
                    <Button variant="ghost" size="sm" className="cursor-pointer hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-gray-700 hover:text-purple-600 hover:bg-purple-50 font-medium">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button 
                      size="sm" 
                      className="cursor-pointer gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md hover:shadow-lg transition-all"
                    >
                      Try Free
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-200/40 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-pink-200/40 blur-3xl"></div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-8 inline-flex items-center justify-center">
              <img
                src="https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771"
                alt="Hero"
                className="w-64 h-64 object-contain"
              />
            </div>
              
            <h1 className="mb-6 text-5xl md:text-7xl font-bold tracking-tight">
              <span className="block text-gray-900 mb-2">Virtual Hijab Try On</span>
              <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent">
                Try Different Hijab Styles
              </span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg md:text-xl text-gray-700">
              Try hijab online with our advanced AI virtual try-on technology. 
              Upload your photo and instantly see realistic previews of different hijab styles, colors, and fabrics tailored to your face and outfit
            </p>

            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              {isLoading ? ( 
                <Button size="lg" disabled className="gap-2 bg-purple-300/50 px-8 py-6 text-base cursor-wait text-gray-700">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-700 border-t-transparent" />
                  Loading...
                </Button>
              ) : user ? (
                <Link href="/dashboard/create">
                  <Button size="lg" className="cursor-pointer gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                    <Play className="h-5 w-5" />
                    Start Try-On Now
                  </Button>
                </Link>
              ) : (
                <Link href="/auth/sign-up">
                  <Button size="lg" className="cursor-pointer gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                    <Play className="h-5 w-5" />
                    Try Free Now
                  </Button>
                </Link>
              )}
              {/*
              <Button variant="outline" size="lg" className="cursor-pointer gap-2 border-purple-400 text-purple-700 hover:bg-purple-50 px-8 py-6 text-base font-semibold transition-all">
                <Wand2 className="h-5 w-5" />
                Design Custom Hijab
              </Button>
              */}
            </div>

            <div className="mt-12 flex flex-wrap gap-8 justify-center items-center text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                <span>100% Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                <span>AI-Powered & Accurate</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                <span>Free to Start</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative bg-gradient-to-br from-white via-blue-50/20 to-white py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
              Why Choose Hijab TryOn?
            </h2>
            <p className="text-lg text-gray-700">
              The most advanced AI virtual hijab try-on platform for women worldwide
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group relative overflow-hidden border-purple-200/60 bg-white/80 backdrop-blur hover:border-purple-400/80 hover:shadow-lg hover:shadow-purple-200/50 transition-all"
              >
                <CardContent className="p-6">
                  <div
                    className={`${feature.bgColor} mb-4 inline-flex items-center justify-center rounded-lg p-3 ${feature.color}`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-700">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Virtual Try-On Feature */}
      <section className="relative bg-gradient-to-br from-white via-purple-50/30 to-blue-50 py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-white rounded-3xl p-8 shadow-xl border border-purple-200/40">
                <img
                  src="https://ik.imagekit.io/u4odjerit/HijabAISaas/Outer%20Page.png"
                  alt="Virtual Try-On"
                  className="rounded-2xl w-full h-auto"
                />
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h2 className="text-4xl md:text-4xl font-bold text-gray-900 mb-6">
                AI Virtual Hijab Fitting Room<br />Designed for Realistic Results
              </h2>
              <p className="text-xl text-gray-700 mb-6 leading-relaxed">
                Upload a selfie and instantly try hijab styles online with our AI virtual fitting room.
              </p>
              <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                Our artificial intelligence adjusts each hijab to your facial structure, skin tone,
                 and proportions, delivering ultra-realistic previews.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-gray-900 font-semibold mb-1">AI-Powered Adaptation</h3>
                    <p className="text-gray-700">Realistic previews tailored to your unique features</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-gray-900 font-semibold mb-1">Instant Previews</h3>
                    <p className="text-gray-700">See results in seconds, not hours</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-gray-900 font-semibold mb-1">Complete Privacy</h3>
                    <p className="text-gray-700">Your images are never shared or stored permanently</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative bg-gradient-to-br from-white via-blue-50/20 to-white py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-700">
              How to Try Hijab Online in 3 Simple Steps
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Upload Your Photo",
                description:
                  "Upload a clear, front-facing photo, or choose one of our AI-generated models.",
              },
              {
                step: "02",
                title: "Choose a Hijab",
                description:
                  "Upload your own hijab photo or select one from our collection",
              },
              {
                step: "03",
                title: "Get Your Preview",
                description:
                  "Our AI generates a high-quality, realistic virtual hijab preview in seconds. Download or save it in your personal gallery!",
              },
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="mb-4 flex items-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-lg font-bold text-white shadow-lg shadow-purple-300/50">
                    {item.step}
                  </div>
                  {index < 2 && (
                    <div className="ml-4 hidden h-1 w-full bg-gradient-to-r from-purple-300 to-transparent md:block" />
                  )}
                </div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  {item.title}
                </h3>
                <p className="text-gray-700">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section id="pricing" className="relative bg-gradient-to-br from-white via-purple-50/30 to-white py-20 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-purple-200/30 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-pink-200/30 blur-3xl"></div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
              Affordable, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-700">
              Each try-on uses one credit.  Choose the perfect plan to try hijabs online anytime.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-4 md:grid-cols-2">
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                className={`relative group transition-all duration-300 ${
                  plan.highlighted ? 'md:col-span-2 lg:col-span-1' : ''
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                )}
                
                <Card
                  className={`relative h-full border transition-all duration-300 ${
                    plan.highlighted
                      ? 'border-purple-400/80 bg-gradient-to-br from-white to-purple-50/30 shadow-xl shadow-purple-300/30 ring-2 ring-purple-300/50'
                      : 'border-purple-200/60 bg-white/70 hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-200/50'
                  } backdrop-blur`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <CardContent className="p-8 flex flex-col h-full">
                    {/* Header */}
                    <div className="mb-6">
                      <div className={`inline-flex items-center justify-center p-3 rounded-lg mb-4 bg-gradient-to-r ${plan.color}`}>
                        <div className="text-white">
                          {plan.icon}
                        </div>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-1">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {plan.description}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-gray-900">
                          {plan.price}
                        </span>
                        {plan.priceValue > 0 && (
                          <span className="text-gray-600"></span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="text-lg font-semibold text-gray-900">
                          {plan.credits} Credits
                        </span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="mb-8 flex-grow">
                      <ul className="space-y-3">
                        {plan.features.map((feature, fIndex) => (
                          <li key={fIndex} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-700 text-sm">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    {user ? (
                      <>
                    <Upgrade />
                    </>
                    ) : (
                <>
                    <Link href="/auth/sign-up" className="w-full">
                      <Button
                        className={`w-full font-semibold py-6 text-base transition-all ${
                          plan.highlighted
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg shadow-purple-300/40'
                            : 'bg-gradient-to-r from-purple-600/90 to-pink-600/90 hover:from-purple-600 hover:to-pink-600 text-white'
                        }`}
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                </>
                    )}

                    {/* Info */}
                   {plan.name === "Starter" && (
                       <p className="mt-4 text-xs text-gray-600 text-center">
                           No credit card required for Starter plan
                       </p>
                )}
                   
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="mt-20 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
              Frequently Asked Questions
            </h3>
            
            <div className="space-y-4">
              {[
                {
                  question: "What is a virtual hijab try on?",
                  answer: "A virtual hijab try on lets you upload your photo and see how different hijab styles look on you using artificial intelligence."
                },
                {
                  question: "What is a credit?",
                  answer: "One credit equals one virtual try-on. When you upload a photo and try on a hijab, it uses one credit."
                },
                {
                  question: "Is it safe to upload my photo?",
                  answer: "Yes. Our AI hijab try-on platform processes images securely and does not permanently store personal photos."
                },
                {
                  question: "What happens when I run out of credits?",
                  answer: "You'll need to upgrade to a higher plan to continue using the service. No automatic charges."
                },
                {
                  question: "Do credits expire?",
                  answer: "Credits are valid for 12 months from the date you purchase them."
                }
              ].map((faq, index) => (
                <div key={index} className="border border-purple-300/40 rounded-lg p-6 bg-white/60 hover:border-purple-400/60 hover:shadow-md transition-all">
                  <h4 className="text-gray-900 font-semibold mb-2">
                    {faq.question}
                  </h4>
                  <p className="text-gray-700 text-sm">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {/*
      <section id="testimonials" className="relative bg-gradient-to-br from-white via-blue-50/20 to-white py-20 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-4">
              Loved Worldwide
            </h2>
            <p className="text-lg text-gray-700">
              See what our users are saying about Hijab TryOn
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="border-purple-200/60 bg-white/70 backdrop-blur hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-200/50 transition-all"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-1">
                    {Array.from({ length: Number(testimonial.rating) }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <p className="mb-6 text-gray-700 italic">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {testimonial.role}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      */}

      {/* Final CTA */}
      <section className="relative bg-gradient-to-br from-white via-purple-50/30 to-blue-50 py-20 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-200/40 blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-pink-200/40 blur-3xl"></div>
        </div>

        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Ready to Transform<br />Your Hijab Shopping?
          </h2>
          <p className="text-xl text-gray-700 mb-10 leading-relaxed max-w-2xl mx-auto">
            Join thousands of women worldwide using our AI virtual hijab try-on tool to preview styles. Start with 3 free virtual try-ons today.

          </p>

          {isLoading ? ( 
            <Button size="lg" disabled className="cursor-wait gap-2 bg-purple-300/50 px-10 py-6 text-lg text-gray-700">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-700 border-t-transparent" />
              Loading...
            </Button>
          ) : user ? (
            <Link href="/dashboard/create">
              <Button size="lg" className="cursor-pointer gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                Start Your Try-On
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Link href="/auth/sign-up">
              <Button size="lg" className="cursor-pointer gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-10 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all">
                Get 3 Free Credits
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-purple-200/40 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-12">
            <div className="grid gap-8 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="mb-4 flex items-center gap-2">
                  <img
                    src="https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771"
                    alt="Logo"
                    className="h-10 w-10 object-contain"
                  />
                  <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-lg font-bold text-transparent">
                    Hijab TryOn
                  </span>
                </div>
                <p className="max-w-md text-gray-700">
                  Redefining hijab shopping with artificial intelligence. 
                  Try on virtually, personalize your design, and shop with confidence.
                </p>
              </div>

              <div>
                <h3 className="mb-4 font-semibold text-gray-900">Product</h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li>
                    <Link
                      href="#features"
                      className="transition-colors hover:text-purple-600"
                    >
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#pricing"
                      className="transition-colors hover:text-purple-600"
                    >
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#how-it-works"
                      className="transition-colors hover:text-purple-600"
                    >
                      How It Works
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-4 font-semibold text-gray-900">Contact us</h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li>
                    <Link
                      href="mailto:team@hijabtryon.com"
                      className="transition-colors hover:text-purple-600"
                    >
                      team@hijabtryon.com
                    </Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="mb-4 font-semibold text-gray-900">Support</h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li>
                    <Link
                      href="#"
                      className="transition-colors hover:text-purple-600"
                    >
                      Help Center
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="#"
                      className="transition-colors hover:text-purple-600"
                    >
                      Privacy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 border-t border-purple-200/40 pt-8 text-center text-sm text-gray-600">
              <p>&copy; 2026 Hijab TryOn. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
