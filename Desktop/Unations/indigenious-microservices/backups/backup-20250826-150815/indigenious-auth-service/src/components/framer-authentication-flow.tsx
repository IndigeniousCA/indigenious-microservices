// Authentication Flow for Framer
// Add this as a Code Override in Framer

import { createClient } from '@supabase/supabase-js'
import { useState, useEffect, ComponentType } from 'react'
import { navigate } from 'framer'

// Initialize Supabase
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)

// Override for Get Started button
export function withGetStarted(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [loading, setLoading] = useState(false)

    async function handleGetStarted() {
      setLoading(true)
      
      // Check if user is already authenticated
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // User is logged in - go to dashboard
        navigate("/dashboard")
      } else {
        // User needs to sign up/login
        navigate("/auth")
      }
      
      setLoading(false)
    }

    return (
      <Component 
        {...props} 
        onClick={handleGetStarted}
        whileTap={{ scale: 0.95 }}
        style={{ 
          ...props.style,
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      />
    )
  }
}

// Override for Sign Up / Login page
export function withAuth(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [error, setError] = useState('')

    async function handleAuth() {
      setLoading(true)
      setError('')

      try {
        if (mode === 'signup') {
          // Sign up new user
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                // Add any additional user metadata
                user_type: 'business_owner',
                created_at: new Date().toISOString()
              }
            }
          })
          
          if (error) throw error
          
          // Show success message
          alert('Check your email to confirm your account!')
          
        } else {
          // Sign in existing user
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          })
          
          if (error) throw error
          
          // Redirect to dashboard
          navigate("/dashboard")
        }
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    // Magic Link option (passwordless)
    async function handleMagicLink() {
      setLoading(true)
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: 'https://www.indigenious.ca/dashboard'
          }
        })
        
        if (error) throw error
        alert('Check your email for the login link!')
      } catch (error) {
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }

    return (
      <Component 
        {...props}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        handleAuth={handleAuth}
        handleMagicLink={handleMagicLink}
        loading={loading}
        error={error}
        mode={mode}
        setMode={setMode}
      />
    )
  }
}

// Override for Dashboard - Check authentication
export function withDashboard(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
      checkUser()
      
      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          setUser(session?.user ?? null)
          if (!session) {
            navigate("/auth")
          }
        }
      )

      return () => subscription.unsubscribe()
    }, [])

    async function checkUser() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setUser(session.user)
        } else {
          navigate("/auth")
        }
      } catch (error) {
        console.error('Auth error:', error)
      } finally {
        setLoading(false)
      }
    }

    async function handleSignOut() {
      await supabase.auth.signOut()
      navigate("/")
    }

    if (loading) {
      return <div>Loading...</div>
    }

    return (
      <Component 
        {...props}
        user={user}
        signOut={handleSignOut}
      />
    )
  }
}

// Override for Protected Routes
export function withProtectedRoute(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [authorized, setAuthorized] = useState(false)

    useEffect(() => {
      checkAuth()
    }, [])

    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        navigate("/auth")
      } else {
        setAuthorized(true)
      }
    }

    if (!authorized) {
      return <div>Checking authorization...</div>
    }

    return <Component {...props} />
  }
}