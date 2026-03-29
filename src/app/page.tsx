'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  GraduationCap,
  DollarSign,
  Wallet,
  ClipboardList,
  BookOpen,
  MessageSquare,
  ShoppingBag,
  Check,
  ArrowRight,
} from 'lucide-react';

const features = [
  {
    icon: DollarSign,
    title: 'Fee Management',
    description: 'Automate invoicing, track payments, manage debtors, and send statements to parents with ease.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Wallet,
    title: 'Digital Wallet',
    description: 'Cashless payments via wristbands or cards. Parents top up, students tap to pay.',
    color: 'bg-indigo-100 text-indigo-600',
  },
  {
    icon: ClipboardList,
    title: 'Attendance',
    description: 'Mark attendance by period or day. Instant notifications to parents for absences.',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: BookOpen,
    title: 'Academics',
    description: 'Grade books, homework, timetables, and report cards all in one place.',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    icon: MessageSquare,
    title: 'Communication',
    description: 'Announcements, direct messaging, and push notifications keep everyone connected.',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: ShoppingBag,
    title: 'Tuck Shop',
    description: 'Point-of-sale system with inventory management and daily sales reporting.',
    color: 'bg-amber-100 text-amber-600',
  },
];

const pricingTiers = [
  {
    name: 'Starter',
    price: 'R 2,500',
    period: '/month',
    description: 'For small schools getting started with digital management.',
    features: [
      'Up to 200 students',
      'Fee management',
      'Attendance tracking',
      'Academic records',
      'Parent communication',
      'Email support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: 'R 5,500',
    period: '/month',
    description: 'For growing schools that need the full suite of tools.',
    features: [
      'Up to 800 students',
      'Everything in Starter',
      'Digital wallet & tuck shop',
      'Transport management',
      'Events & consent forms',
      'Priority support',
      'Custom reports',
    ],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large schools and school groups with advanced needs.',
    features: [
      'Unlimited students',
      'Everything in Professional',
      'Multi-campus support',
      'API access',
      'Dedicated account manager',
      'SLA guarantee',
      'On-site training',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-[#2563EB]" />
            <span className="text-xl font-bold text-gray-900">Campusly</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="lg">
                Login
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" className="bg-[#2563EB] hover:bg-[#1d4ed8]">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2563EB] via-[#3b5fe5] to-[#4F46E5] py-24 sm:py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Smart School Management for South Africa
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-blue-100 sm:text-xl">
              From fee collection to tuck shop sales, attendance to academics &mdash; Campusly brings
              your entire school into one powerful, easy-to-use platform.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-12 px-8 text-base bg-[#F97316] hover:bg-[#ea6c0e] text-white"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 px-8 text-base border-white/30 text-white hover:bg-white/10 hover:text-white"
                >
                  Login to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything your school needs
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              A complete suite of tools designed specifically for South African schools.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className={`mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg ${feature.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Choose the plan that fits your school. No hidden fees, cancel anytime.
            </p>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {pricingTiers.map((tier) => (
              <Card
                key={tier.name}
                className={`relative flex flex-col ${
                  tier.highlighted
                    ? 'border-2 border-[#2563EB] shadow-lg ring-1 ring-[#2563EB]/20'
                    : 'border shadow-sm'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-[#2563EB] px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                    {tier.period && (
                      <span className="text-gray-500">{tier.period}</span>
                    )}
                  </div>
                  <ul className="mb-8 flex-1 space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-gray-600">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="mt-auto">
                    <Button
                      className={`w-full ${
                        tier.highlighted
                          ? 'bg-[#2563EB] hover:bg-[#1d4ed8]'
                          : ''
                      }`}
                      variant={tier.highlighted ? 'default' : 'outline'}
                      size="lg"
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-900 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-7 w-7 text-[#2563EB]" />
              <span className="text-lg font-bold text-white">Campusly</span>
            </div>
            <nav className="flex gap-6">
              <a href="#features" className="text-sm text-gray-400 hover:text-white">
                Features
              </a>
              <a href="#pricing" className="text-sm text-gray-400 hover:text-white">
                Pricing
              </a>
              <Link href="/login" className="text-sm text-gray-400 hover:text-white">
                Login
              </Link>
            </nav>
            <p className="text-sm text-gray-500">
              &copy; {new Date().getFullYear()} Campusly. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
