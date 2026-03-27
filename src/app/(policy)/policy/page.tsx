'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '~/components/ui/card';
import Link from 'next/link';
import {
  Shield,
  Mail,
  ChevronDown,
  ChevronUp,
  Eye,
  Database,
  Users,
  Camera,
  Share2,
  Clock,
  Lock,
  Baby,
  Globe,
  RefreshCw,
  Smartphone,
  CheckCircle2,
  ArrowLeft,
  Info,
  AlertTriangle,
} from 'lucide-react';

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const LOGO_URL =
  'https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771';

const EFFECTIVE_DATE = 'March 25, 2026';

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface TocItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface TableData {
  headers: string[];
  rows: string[][];
}

/* ─────────────────────────────────────────
   TOC config
───────────────────────────────────────── */
const TOC_ITEMS: TocItem[] = [
  { id: 'who-we-are',     label: 'Who We Are',                  icon: <Info className="h-3.5 w-3.5" /> },
  { id: 'data-collected', label: 'Information We Collect',       icon: <Database className="h-3.5 w-3.5" /> },
  { id: 'how-we-use',     label: 'How We Use Your Data',         icon: <Eye className="h-3.5 w-3.5" /> },
  { id: 'photos',         label: 'How We Handle Your Photos',    icon: <Camera className="h-3.5 w-3.5" /> },
  { id: 'sharing',        label: 'Data Sharing & Third Parties', icon: <Share2 className="h-3.5 w-3.5" /> },
  { id: 'retention',      label: 'Data Retention',               icon: <Clock className="h-3.5 w-3.5" /> },
  { id: 'your-rights',    label: 'Your Rights',                  icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'children',       label: "Children's Privacy",           icon: <Baby className="h-3.5 w-3.5" /> },
  { id: 'security',       label: 'Security',                     icon: <Lock className="h-3.5 w-3.5" /> },
  { id: 'cookies',        label: 'Cookies & Tracking',           icon: <Globe className="h-3.5 w-3.5" /> },
  { id: 'international',  label: 'International Transfers',      icon: <Globe className="h-3.5 w-3.5" /> },
  { id: 'changes',        label: 'Changes to This Policy',       icon: <RefreshCw className="h-3.5 w-3.5" /> },
  { id: 'google-play',    label: 'Google Play Disclosures',      icon: <Smartphone className="h-3.5 w-3.5" /> },
  { id: 'contact',        label: 'Contact Us',                   icon: <Mail className="h-3.5 w-3.5" /> },
];

/* ─────────────────────────────────────────
   Sub-components — aligned with homepage
───────────────────────────────────────── */

/** Matches homepage section header style */
function SectionTitle({ number, title, icon }: { number: string; title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-300/50 shrink-0">
        <span className="text-xs font-bold">{number}</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <span className="text-purple-500">{icon}</span>
        {title}
      </h2>
    </div>
  );
}

/** Matches homepage Card style */
function PolicyCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`border-purple-200/60 bg-white/80 backdrop-blur hover:border-purple-400/60 hover:shadow-lg hover:shadow-purple-200/50 transition-all ${className}`}>
      <CardContent className="p-6 sm:p-8">
        {children}
      </CardContent>
    </Card>
  );
}

/** Info callout — matches homepage CheckCircle2 style */
function InfoCallout({ type = 'info', children }: { type?: 'info' | 'warning'; children: React.ReactNode }) {
  const isWarning = type === 'warning';
  return (
    <div className={`flex gap-3 rounded-lg p-4 my-4 border ${
      isWarning
        ? 'bg-amber-50 border-amber-200/60 text-amber-800'
        : 'bg-purple-50/60 border-purple-200/60 text-purple-800'
    }`}>
      <div className="shrink-0 mt-0.5">
        {isWarning
          ? <AlertTriangle className="h-5 w-5 text-amber-500" />
          : <Info className="h-5 w-5 text-purple-500" />
        }
      </div>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

/** Table — matches homepage FAQ card style */
function PolicyTable({ headers, rows }: TableData) {
  return (
    <div className="overflow-x-auto rounded-lg border border-purple-200/60 my-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-linear-to-r from-purple-600 to-pink-600 text-white">
            {headers.map((h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={`${i % 2 === 0 ? 'bg-white' : 'bg-purple-50/40'} hover:bg-purple-50/80 transition-colors`}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-3 border-b border-purple-100/60 text-gray-700 ${j === 0 ? 'font-medium text-gray-900' : ''}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Bullet list — matches homepage feature list style */
function PolicyList({ items }: { items: (string | React.ReactNode)[] }) {
  return (
    <ul className="space-y-3 my-4">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
          <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ─────────────────────────────────────────
   Animated section wrapper
───────────────────────────────────────── */
function AnimatedSection({ id, children }: { id: string; children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) setVisible(true);
    }, { threshold: 0.08 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id={id}
      ref={ref}
      className={`scroll-mt-20 transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState('who-we-are');
  const [mobileTocOpen, setMobileTocOpen] = useState(false);

  /* Track active section */
  useEffect(() => {
    const handler = () => {
      for (const item of [...TOC_ITEMS].reverse()) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= 100) {
          setActiveSection(item.id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setMobileTocOpen(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-white via-blue-50/30 to-purple-50">

      {/* ══════ NAV — identical to homepage ══════ */}
      <nav className="sticky top-0 z-50 border-b border-purple-200/40 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/90 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">

            <div className="flex items-center gap-3">
              <img
                  src="https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771"
                  alt="Logo"
                  className="h-8 w-8 object-contain"
                />	
              <span className="bg-linear-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-lg font-bold text-transparent">
                Hijab TryOn
              </span>
            </div>

            <div className="hidden md:flex items-center gap-6">
              <Link href="/#features"    className="text-gray-700 font-medium transition-colors hover:text-purple-600 text-sm">Features</Link>
              <Link href="/#how-it-works" className="text-gray-700 font-medium transition-colors hover:text-purple-600 text-sm">How It Works</Link>
              <Link href="/#pricing"     className="text-gray-700 font-medium transition-colors hover:text-purple-600 text-sm">Pricing</Link>
            </div>

            <Link
              href="/"
              className="flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 border border-purple-300/60 rounded-lg px-3 py-2 hover:bg-purple-50 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to site
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════ HERO — mirrors homepage section style ══════ */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        {/* Decorative blobs — same as homepage */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-pink-200/40 blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Badge — same as homepage trust badges */}
          <div className="mb-6 flex flex-wrap justify-center gap-3">
            {['GDPR Compliant', 'Google Play Ready', 'Privacy First'].map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200/60"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {badge}
              </span>
            ))}
          </div>

          <div className="mb-6 inline-flex items-center justify-center">
            <img
                  src="https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771"
                  alt="Logo"
                  className="h-64 w-64 object-contain"
                />
          </div>

          <h1 className="mb-4 text-4xl sm:text-6xl font-bold tracking-tight">
            <span className="block text-gray-900 mb-2">Privacy Policy</span>
            <span className="bg-linear-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-transparent text-3xl sm:text-4xl">
              Your data, your control
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-lg text-gray-700 leading-relaxed">
            We take your privacy seriously. This policy explains exactly what data we collect,
            how we use it, and the rights you have over it.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              <span>Effective: {EFFECTIVE_DATE}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              <span>hijabtryon.com &amp; Mobile App</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              <span>Android &amp; iOS</span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ MAIN LAYOUT ══════ */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        <div className="flex gap-8 items-start">

          {/* ── Desktop Sidebar TOC ── */}
          <aside className="hidden lg:block w-64 shrink-0 sticky top-24 self-start">
            <Card className="border-purple-200/60 bg-white/80 backdrop-blur shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-purple-100">
                  <Image src="https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771" alt="logo" width={24} height={24} className="h-6 w-6 object-contain" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Contents
                  </span>
                </div>
                <nav className="space-y-0.5">
                  {TOC_ITEMS.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => scrollTo(item.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs ${
                        activeSection === item.id
                          ? 'bg-linear-to-r from-purple-100 to-pink-50 text-purple-700 font-semibold border-l-2 border-purple-500'
                          : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50/60'
                      }`}
                    >
                      <span className={`shrink-0 ${activeSection === item.id ? 'text-purple-500' : 'text-gray-400'}`}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                      {activeSection === item.id && (
                        <span className="ml-auto text-[10px] font-bold text-purple-400">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* ── Mobile TOC accordion ── */}
          <div className="lg:hidden w-full mb-6">
            <button
              onClick={() => setMobileTocOpen(!mobileTocOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-linear-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm shadow-md"
            >
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Table of Contents
              </span>
              {mobileTocOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {mobileTocOpen && (
              <Card className="border-purple-200/60 rounded-t-none border-t-0">
                <CardContent className="p-3">
                  <nav className="grid grid-cols-2 gap-1">
                    {TOC_ITEMS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => scrollTo(item.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-left text-xs transition-all ${
                          activeSection === item.id
                            ? 'bg-purple-100 text-purple-700 font-semibold'
                            : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
                        }`}
                      >
                        <span className="text-purple-400">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ══════ CONTENT ══════ */}
          <main className="flex-1 min-w-0 space-y-6">

            {/* ── 01 Who We Are ── */}
            <AnimatedSection id="who-we-are">
              <PolicyCard>
                <SectionTitle number="01" title="Who We Are" icon={<Info className="h-5 w-5" />} />
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  HijabTryOn (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the website{' '}
                  <a href="https://hijabtryon.com" className="text-purple-600 hover:text-purple-700 font-medium">
                    hijabtryon.com
                  </a>{' '}
                  and the HijabTryOn mobile application (collectively, the &quot;Service&quot;). We provide
                  an AI-powered virtual hijab try-on platform that allows users to preview hijab
                  styles on their own photos or on AI-generated models.
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  For any privacy-related questions, contact us at{' '}
                  <a href="mailto:team@hijabtryon.com" className="text-purple-600 hover:text-purple-700 font-semibold">
                    team@hijabtryon.com
                  </a>
                </p>
              </PolicyCard>
            </AnimatedSection>

            {/* ── 02 Data Collected ── */}
            <AnimatedSection id="data-collected">
              <PolicyCard>
                <SectionTitle number="02" title="Information We Collect" icon={<Database className="h-5 w-5" />} />

                <p className="text-sm font-semibold text-gray-900 mb-2">a) Information you provide directly</p>
                <PolicyList items={[
                  <><strong>Account information:</strong> email address, name, and password when you register via email, or your Google account name and email when you sign in with Google.</>,
                  <><strong>Photos you upload:</strong> selfies or personal photos you choose to upload to use the virtual try-on feature.</>,
                  <><strong>Hijab photos:</strong> images of hijabs you upload from your personal collection.</>,
                  <><strong>Payment information:</strong> when purchasing credits, payment is processed by Polar. We do not store your card details.</>,
                ]} />

                <p className="text-sm font-semibold text-gray-900 mb-2 mt-4">b) Information collected automatically</p>
                <PolicyList items={[
                  'Device type, operating system, and app version',
                  'IP address and approximate location (country/city level)',
                  'Usage data: features used, number of try-ons, session duration',
                  'Crash reports and performance data',
                ]} />

                <p className="text-sm font-semibold text-gray-900 mb-2 mt-4">c) Information from third parties</p>
                <PolicyList items={[
                  <><strong>Google Sign-In:</strong> if you authenticate via Google, we receive your name, email address, and profile picture from Google.</>,
                ]} />
              </PolicyCard>
            </AnimatedSection>

            {/* ── 03 How We Use ── */}
            <AnimatedSection id="how-we-use">
              <PolicyCard>
                <SectionTitle number="03" title="How We Use Your Information" icon={<Eye className="h-5 w-5" />} />
                <PolicyTable
                  headers={['Purpose', 'Data Used', 'Legal Basis']}
                  rows={[
                    ['Provide the virtual try-on service',   'Uploaded photos, account info',      'Contract performance'],
                    ['Account creation & authentication',    'Email, name, Google profile',         'Contract performance'],
                    ['Process payments & manage credits',    'Email, transaction data',              'Contract performance'],
                    ['Send transactional emails',            'Email address',                        'Contract performance'],
                    ['Improve and debug the AI model',       'Aggregated, anonymised usage data',    'Legitimate interest'],
                    ['Platform security & fraud prevention', 'IP address, device data',              'Legitimate interest'],
                    ['Comply with legal obligations',        'As required by law',                   'Legal obligation'],
                  ]}
                />
              </PolicyCard>
            </AnimatedSection>

            {/* ── 04 Photos ── */}
            <AnimatedSection id="photos">
              <PolicyCard>
                <SectionTitle number="04" title="How We Handle Your Photos" icon={<Camera className="h-5 w-5" />} />
                <InfoCallout type="warning">
                  This section is especially important because HijabTryOn processes photos of your face. Please read carefully.
                </InfoCallout>
                <PolicyList items={[
                  <>Photos you upload are used <strong>solely</strong> to generate your virtual try-on preview.</>,
                  <>Photos are processed by our AI system in a <strong>secure, encrypted environment</strong>.</>,
                  <>We do <strong>not</strong> permanently store your uploaded photos after the try-on is generated, unless you explicitly save the result to your gallery.</>,
                  <>We do <strong>not</strong> share your photos with third parties, sell them, or use them to train AI models without your explicit consent.</>,
                  'Results saved to your gallery are stored securely and only accessible to you.',
                  'You can delete your gallery results at any time from within the app.',
                ]} />
              </PolicyCard>
            </AnimatedSection>

            {/* ── 05 Sharing ── */}
            <AnimatedSection id="sharing">
              <PolicyCard>
                <SectionTitle number="05" title="Data Sharing & Third Parties" icon={<Share2 className="h-5 w-5" />} />
                <p className="text-sm text-gray-700 mb-4">
                  We do not sell your personal data. We share data only with the following trusted
                  service providers, strictly to operate our Service:
                </p>
                <PolicyTable
                  headers={['Service Provider', 'Purpose', 'Data Shared']}
                  rows={[
                    ['Polar',                    'Payment processing',             'Email, transaction amount'],
                    ['Google (Firebase/Auth)',   'Authentication & analytics',     'Email, name, device info'],
                    ['ImageKit',                 'Image hosting & delivery',       'Generated try-on images'],
                    ['Cloud infrastructure',     'Hosting & AI processing',        'Uploaded photos (temporary)'],
                  ]}
                />
                <p className="text-sm text-gray-700 mt-2">
                  All third-party providers are contractually bound to handle your data securely
                  and only for the purposes we specify.
                </p>
              </PolicyCard>
            </AnimatedSection>

            {/* ── 06 Retention ── */}
            <AnimatedSection id="retention">
              <PolicyCard>
                <SectionTitle number="06" title="Data Retention" icon={<Clock className="h-5 w-5" />} />
                <PolicyList items={[
                  <><strong>Uploaded photos (not saved):</strong> deleted immediately after the try-on is generated — typically within minutes.</>,
                  <><strong>Saved gallery results:</strong> retained until you delete them or close your account.</>,
                  <><strong>Account data:</strong> retained for as long as your account is active, plus up to 30 days after deletion.</>,
                  <><strong>Payment records:</strong> retained for 7 years as required by financial regulations.</>,
                  <><strong>Usage & analytics data:</strong> retained in anonymised form for up to 24 months.</>,
                ]} />
              </PolicyCard>
            </AnimatedSection>

            {/* ── 07 Your Rights ── */}
            <AnimatedSection id="your-rights">
              <PolicyCard>
                <SectionTitle number="07" title="Your Rights" icon={<Users className="h-5 w-5" />} />
                <p className="text-sm text-gray-700 mb-4">
                  Depending on your location, you may have the following rights regarding your personal data:
                </p>
                <PolicyList items={[
                  <><strong>Access:</strong> request a copy of the data we hold about you.</>,
                  <><strong>Correction:</strong> request correction of inaccurate data.</>,
                  <><strong>Deletion:</strong> request deletion of your account and associated data.</>,
                  <><strong>Portability:</strong> receive your data in a structured, machine-readable format.</>,
                  <><strong>Objection:</strong> object to processing based on legitimate interest.</>,
                  <>Withdraw consent at any time where processing is based on consent.</>,
                ]} />
                <InfoCallout>
                  To exercise any of these rights, contact us at{' '}
                  <a href="mailto:team@hijabtryon.com" className="font-semibold underline">
                    team@hijabtryon.com
                  </a>
                  . We will respond within <strong>30 days</strong>.
                </InfoCallout>
              </PolicyCard>
            </AnimatedSection>

            {/* ── 08 Children ── */}
            <AnimatedSection id="children">
              <PolicyCard>
                <SectionTitle number="08" title="Children's Privacy" icon={<Baby className="h-5 w-5" />} />
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  HijabTryOn is not directed to children under the age of 13. We do not knowingly
                  collect personal data from children under 13. If we become aware that a child
                  under 13 has provided us with personal data, we will delete it immediately.
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  If you believe your child has submitted data to us, please contact us at{' '}
                  <a href="mailto:team@hijabtryon.com" className="text-purple-600 hover:text-purple-700 font-medium">
                    team@hijabtryon.com
                  </a>.
                </p>
              </PolicyCard>
            </AnimatedSection>

            {/* ── 09 Security ── */}
            <AnimatedSection id="security">
              <PolicyCard>
                <SectionTitle number="09" title="Security" icon={<Lock className="h-5 w-5" />} />
                <p className="text-sm text-gray-700 mb-4">We implement industry-standard security measures to protect your data:</p>
                <PolicyList items={[
                  'HTTPS encryption for all data in transit',
                  'Encrypted storage for sensitive data at rest',
                  'Access controls limiting who can access user data',
                  'Regular security reviews of our infrastructure',
                ]} />
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  No system is 100% secure. We encourage you to use a strong, unique password
                  and to contact us immediately if you suspect any unauthorised access.
                </p>
              </PolicyCard>
            </AnimatedSection>

            {/* ── 10 Cookies ── */}
            <AnimatedSection id="cookies">
              <PolicyCard>
                <SectionTitle number="10" title="Cookies & Tracking (Web)" icon={<Globe className="h-5 w-5" />} />
                <p className="text-sm text-gray-700 mb-3">On our website hijabtryon.com, we use:</p>
                <PolicyList items={[
                  <><strong>Essential cookies:</strong> required for authentication and session management. Cannot be disabled.</>,
                  <><strong>Analytics cookies:</strong> to understand how users interact with our website (e.g., Google Analytics). You may opt out via your browser settings.</>,
                ]} />
                <InfoCallout>Our mobile app does not use browser cookies.</InfoCallout>
              </PolicyCard>
            </AnimatedSection>

            {/* ── 11 International ── */}
            <AnimatedSection id="international">
              <PolicyCard>
                <SectionTitle number="11" title="International Data Transfers" icon={<Globe className="h-5 w-5" />} />
                <p className="text-sm text-gray-700 leading-relaxed">
                  HijabTryOn serves users worldwide. Your data may be processed and stored in
                  servers located outside your country of residence. Where required, we ensure
                  appropriate safeguards are in place (such as Standard Contractual Clauses for
                  transfers from the EEA) to protect your data in accordance with applicable law.
                </p>
              </PolicyCard>
            </AnimatedSection>

            {/* ── 12 Changes ── */}
            <AnimatedSection id="changes">
              <PolicyCard>
                <SectionTitle number="12" title="Changes to This Privacy Policy" icon={<RefreshCw className="h-5 w-5" />} />
                <p className="text-sm text-gray-700 mb-4">
                  We may update this Privacy Policy from time to time. When we make significant
                  changes, we will notify you by:
                </p>
                <PolicyList items={[
                  'Posting the new policy on this page with an updated "Last Updated" date',
                  'Sending an email notification to registered users',
                  'Displaying an in-app notification',
                ]} />
              </PolicyCard>
            </AnimatedSection>

            {/* ── 13 Google Play ── */}
            <AnimatedSection id="google-play">
              <PolicyCard>
                <SectionTitle number="13" title="Specific Disclosures for Google Play" icon={<Smartphone className="h-5 w-5" />} />
                <p className="text-sm text-gray-700 mb-4">
                  In accordance with Google Play&apos;s Data Safety requirements, here is a summary
                  of our data practices for the HijabTryOn mobile app:
                </p>
                <PolicyTable
                  headers={['Data Type', 'Collected', 'Shared', 'Purpose']}
                  rows={[
                    ['Email address',               'Yes',                  'No',                     'Account creation, authentication'],
                    ['Name',                        'Yes (Google Sign-In)', 'No',                     'Account display'],
                    ['Photos (selfies)',             'Temporary only',       'No',                     'AI try-on generation'],
                    ['Generated try-on results',    'Only if saved',        'No',                     'Personal gallery'],
                    ['Purchase history',            'Yes',                  'Payment processor only', 'Credit management'],
                    ['Device / app info',           'Yes',                  'No',                     'Security, crash reporting'],
                    ['Approx. location (IP-based)', 'Yes',                  'No',                     'Fraud prevention'],
                  ]}
                />
                <InfoCallout>
                  <strong>Data encryption:</strong> Data is encrypted in transit and at rest.{' '}
                  <strong>Data deletion:</strong> Users can request full account and data deletion
                  by emailing{' '}
                  <a href="mailto:team@hijabtryon.com" className="underline font-semibold">
                    team@hijabtryon.com
                  </a>{' '}
                  or from within the app settings.
                </InfoCallout>
              </PolicyCard>
            </AnimatedSection>

            {/* ── 14 Contact — mirrors homepage Final CTA ── */}
            <AnimatedSection id="contact">
              <section className="relative bg-linear-to-br from-white via-purple-50/30 to-blue-50 rounded-2xl overflow-hidden border border-purple-200/60">
                {/* Blobs */}
                <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-pink-200/40 blur-3xl pointer-events-none" />

                <div className="relative z-10 px-8 py-12 text-center">
                  <div className="mb-4 inline-flex items-center justify-center">
                    <img
                    src="https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771"
                    alt="Hero"
                    className="w-16 h-16 object-contain"
                    />
                  </div>

                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    14. Contact Us
                  </h2>
                  <p className="text-gray-700 mb-8 max-w-md mx-auto leading-relaxed">
                    If you have any questions, concerns, or requests regarding this Privacy Policy
                  or how we handle your data, we&apos;re here to help.
                  </p>

                  <a
                    href="mailto:team@hijabtryon.com"
                    className="inline-flex items-center gap-2 bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all text-base"
                  >
                    <Mail className="h-5 w-5" />
                    team@hijabtryon.com
                  </a>

                  <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span>Response within 30 days</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-500" />
                      <span>100% Secure & Private</span>
                    </div>
                  </div>
                </div>
              </section>
            </AnimatedSection>

          </main>
        </div>
      </div>

      {/* ══════ FOOTER — identical to homepage ══════ */}
      <footer className="border-t border-purple-200/40 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="py-12">
            <div className="grid gap-8 md:grid-cols-4">
              <div className="md:col-span-2">
                <div className="mb-4 flex items-center gap-2">
                  <img
                  src="https://ik.imagekit.io/u4odjerit/HijabAISaas/1769806122.png?updatedAt=1769860375771"
                  alt="Logo"
                  className="h-8 w-8 object-contain"
                />
                  <span className="bg-linear-to-r from-purple-600 via-pink-500 to-rose-500 bg-clip-text text-lg font-bold text-transparent">
                    Hijab TryOn
                  </span>
                </div>
                <p className="max-w-md text-gray-700 text-sm">
                  Redefining hijab shopping with artificial intelligence.
                  Try on virtually, personalize your design, and shop with confidence.
                </p>
              </div>

              <div>
                <h3 className="mb-4 font-semibold text-gray-900 text-sm">Product</h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li><Link href="/#features"     className="transition-colors hover:text-purple-600">Features</Link></li>
                  <li><Link href="/#pricing"      className="transition-colors hover:text-purple-600">Pricing</Link></li>
                  <li><Link href="/#how-it-works" className="transition-colors hover:text-purple-600">How It Works</Link></li>
                </ul>
              </div>

              <div>
                <h3 className="mb-4 font-semibold text-gray-900 text-sm">Support</h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  <li>
                    <a href="mailto:team@hijabtryon.com" className="transition-colors hover:text-purple-600">
                      team@hijabtryon.com
                    </a>
                  </li>
                  <li>
                    <Link href="/privacy" className="transition-colors hover:text-purple-600 font-medium text-purple-600">
                      Privacy Policy
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