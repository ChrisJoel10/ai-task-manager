'use client'

import { createClient } from '@/utils/supabase/client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) {
            setMessage(error.message)
        } else {
            router.push('/')
            router.refresh()
        }
        setLoading(false)
    }

    const handleSocialLogin = async (provider: 'google') => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${location.origin}/auth/callback`,
            },
        })
        if (error) {
            setMessage(error.message)
        }
    }

    return (
        <div className="min-h-screen flex bg-white">
            {/* Left Side - Illustration */}
            <div className="hidden lg:flex w-1/2 bg-[#E6F9F0] flex-col items-center justify-center p-12 relative overflow-hidden">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="relative z-10 max-w-lg w-full text-center"
                >
                    <div className="mb-12 relative h-[400px] w-full">
                        {/* Placeholder for the illustration - In a real scenario, use next/image with the asset */}
                        <div className="w-full h-full relative">
                            {/* We will try to load the image if it exists, otherwise show a placeholder */}
                            <img
                                src="/login-illustration.png"
                                alt="AI Tasker Illustration"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    e.currentTarget.src = "https://placehold.co/600x600/E6F9F0/2F855A?text=AI+Tasker+Illustration";
                                }}
                            />
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-[#1F2937] mb-4">AI Tasker</h2>
                    <p className="text-gray-600 text-lg mb-8">
                        Streamline your workflow with intelligent task management. Let AI help you organize, prioritize, and achieve more.
                    </p>

                    <div className="flex justify-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#A7F3D0]"></div>
                        <div className="w-8 h-2.5 rounded-full bg-[#34D399]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#A7F3D0]"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-[#A7F3D0]"></div>
                    </div>
                </motion.div>

                {/* Background decoration */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/20 rounded-full blur-[100px]" />
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white text-[#1F2937]">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center mb-10">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#2F855A]">
                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <span className="text-2xl font-serif tracking-wide text-[#2F855A]">AI TASKER</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500">Username or email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2F855A]/20 focus:border-[#2F855A] outline-none transition-all placeholder:text-gray-400 text-gray-900"
                                placeholder="johnsmith007"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#2F855A]/20 focus:border-[#2F855A] outline-none transition-all placeholder:text-gray-400 text-gray-900"
                                placeholder="••••••••••••"
                            />
                        </div>

                        <div className="flex justify-end">
                            <Link href="/forgot-password" className="text-sm font-medium text-[#2F855A] hover:underline decoration-1 underline-offset-4">
                                Forgot password?
                            </Link>
                        </div>

                        {message && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center border border-red-100">
                                {message}
                            </div>
                        )}

                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full py-3.5 px-4 bg-[#1F2937] hover:bg-[#111827] text-white rounded-lg font-medium transition-all disabled:opacity-70 shadow-lg shadow-gray-200"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>

                        <div className="relative py-4">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-gray-500">or</span>
                            </div>
                        </div>

                        <button
                            onClick={() => handleSocialLogin('google')}
                            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors font-medium"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Sign in with Google
                        </button>

                        <div className="text-center pt-4">
                            <p className="text-sm text-gray-500">
                                Are you new?{' '}
                                <Link href="/signup" className="font-medium text-[#2F855A] hover:underline decoration-1 underline-offset-4">
                                    Create an Account
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

