'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { 
  Globe, 
  ArrowLeft, 
  Building2, 
  Users, 
  Mail, 
  Lock, 
  User,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<'business' | 'government' | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    businessName: '',
    businessNumber: '',
    nation: '',
    territory: ''
  });

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual registration logic
    console.log('Registration attempt:', { accountType, ...formData });
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0">
        <div className="absolute top-40 left-20 w-72 h-72 bg-purple-500 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-40 right-20 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to home</span>
        </Link>

        <GlassPanel className="p-8">
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= i ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-white/20 text-white/50'
                }`}>
                  {step > i ? <CheckCircle className="h-6 w-6" /> : i}
                </div>
                {i < 3 && (
                  <div className={`h-1 w-24 mx-2 ${
                    step > i ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-white/20'
                  }`} />
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Step 1: Account Type */}
            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-white mb-2">Join the Platform</h1>
                  <p className="text-white/70">Choose your account type to get started</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountType('business');
                      handleNext();
                    }}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      accountType === 'business' 
                        ? 'border-purple-400 bg-purple-500/20' 
                        : 'border-white/20 bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <Building2 className="h-12 w-12 text-purple-400 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Indigenous Business</h3>
                    <p className="text-white/70 text-sm">Register your business to access procurement opportunities</p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-purple-400">
                      <span className="text-sm font-medium">Get Started</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAccountType('government');
                      handleNext();
                    }}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      accountType === 'government' 
                        ? 'border-blue-400 bg-blue-500/20' 
                        : 'border-white/20 bg-white/10 hover:bg-white/20'
                    }`}
                  >
                    <Users className="h-12 w-12 text-blue-400 mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Government/Organization</h3>
                    <p className="text-white/70 text-sm">Post RFQs and connect with Indigenous suppliers</p>
                    <div className="mt-4 flex items-center justify-center gap-2 text-blue-400">
                      <span className="text-sm font-medium">Get Started</span>
                      <ChevronRight className="h-4 w-4" />
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Basic Information */}
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Basic Information</h2>
                  <p className="text-white/70">Let's set up your account</p>
                </div>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        First Name
                      </label>
                      <GlassInput
                        type="text"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        Last Name
                      </label>
                      <GlassInput
                        type="text"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Email Address
                    </label>
                    <GlassInput
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Password
                    </label>
                    <GlassInput
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Confirm Password
                    </label>
                    <GlassInput
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={handleBack}
                    className="flex-1"
                  >
                    Back
                  </GlassButton>
                  <GlassButton
                    type="button"
                    onClick={handleNext}
                    className="flex-1"
                  >
                    Continue
                  </GlassButton>
                </div>
              </motion.div>
            )}

            {/* Step 3: Business Details */}
            {step === 3 && accountType === 'business' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Business Details</h2>
                  <p className="text-white/70">Tell us about your Indigenous business</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Business Name
                    </label>
                    <GlassInput
                      type="text"
                      placeholder="Eagle Enterprises Ltd."
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Business Number (Optional)
                    </label>
                    <GlassInput
                      type="text"
                      placeholder="123456789"
                      value={formData.businessNumber}
                      onChange={(e) => setFormData({ ...formData, businessNumber: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Nation/First Nation
                    </label>
                    <GlassInput
                      type="text"
                      placeholder="e.g., Cree Nation"
                      value={formData.nation}
                      onChange={(e) => setFormData({ ...formData, nation: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Territory/Province
                    </label>
                    <GlassInput
                      type="text"
                      placeholder="e.g., Treaty 6 Territory"
                      value={formData.territory}
                      onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={handleBack}
                    className="flex-1"
                  >
                    Back
                  </GlassButton>
                  <GlassButton
                    type="submit"
                    className="flex-1"
                  >
                    Complete Registration
                  </GlassButton>
                </div>
              </motion.div>
            )}

            {/* Step 3: Organization Details */}
            {step === 3 && accountType === 'government' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Organization Details</h2>
                  <p className="text-white/70">Tell us about your organization</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Organization Name
                    </label>
                    <GlassInput
                      type="text"
                      placeholder="Government of Canada"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Department/Division
                    </label>
                    <GlassInput
                      type="text"
                      placeholder="Indigenous Services Canada"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Your Role
                    </label>
                    <GlassInput
                      type="text"
                      placeholder="Procurement Officer"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={handleBack}
                    className="flex-1"
                  >
                    Back
                  </GlassButton>
                  <GlassButton
                    type="submit"
                    className="flex-1"
                  >
                    Complete Registration
                  </GlassButton>
                </div>
              </motion.div>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-white/70">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium">
                Sign in here
              </Link>
            </p>
          </div>
        </GlassPanel>
      </motion.div>
    </div>
  );
}