// Password Protection Component for Framer
// Add this as a Code Override to protect your site during development

import { useState, useEffect, ComponentType } from 'react'

// Simple password protection override
export function withPasswordProtection(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(true)

    // Set your password here
    const SITE_PASSWORD = 'Ernie!2025'  // Change this to your preferred password

    useEffect(() => {
      // Check if user is already authorized (stored in localStorage)
      const authorized = localStorage.getItem('indigenious_authorized')
      if (authorized === 'true') {
        setIsAuthorized(true)
      }
      setLoading(false)
    }, [])

    const handlePasswordSubmit = (e) => {
      e.preventDefault()
      if (password === SITE_PASSWORD) {
        setIsAuthorized(true)
        localStorage.setItem('indigenious_authorized', 'true')
      } else {
        alert('Incorrect password. Please try again.')
        setPassword('')
      }
    }

    const handleLogout = () => {
      setIsAuthorized(false)
      localStorage.removeItem('indigenious_authorized')
      setPassword('')
    }

    if (loading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #92400e 100%)',
          color: 'white'
        }}>
          Loading...
        </div>
      )
    }

    if (!isAuthorized) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #92400e 100%)',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              background: 'linear-gradient(45deg, #10b981, #14b8a6)',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '24px'
            }}>
              🛡️
            </div>
            
            <h1 style={{
              fontSize: '24px',
              fontWeight: '300',
              marginBottom: '10px'
            }}>
              Indigenous Platform
            </h1>
            
            <p style={{
              fontSize: '14px',
              opacity: '0.8',
              marginBottom: '30px'
            }}>
              Development Site - Password Required
            </p>
            
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '16px',
                  marginBottom: '20px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'linear-gradient(45deg, #10b981, #14b8a6)',
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Access Site
              </button>
            </form>
            
            <p style={{
              fontSize: '12px',
              opacity: '0.6',
              marginTop: '20px'
            }}>
              Indigenous Business Verification & RFQ Platform<br/>
              Development Version
            </p>
          </div>
        </div>
      )
    }

    // User is authorized - show the actual site with logout option
    return (
      <div>
        {/* Logout button - positioned absolute */}
        <button
          onClick={handleLogout}
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            color: 'white',
            fontSize: '12px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)'
          }}
        >
          🔓 Logout
        </button>
        
        {/* Your actual site content */}
        <Component {...props} />
      </div>
    )
  }
}

// Alternative: IP-based protection (for extra security)
export function withIPProtection(Component: ComponentType<any>): ComponentType {
  return (props) => {
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [loading, setLoading] = useState(true)

    // Add your allowed IP addresses here
    const ALLOWED_IPS = [
      'YOUR_HOME_IP',      // Replace with your actual IP
      'YOUR_OFFICE_IP',    // Replace with office IP
      // Add more IPs as needed
    ]

    useEffect(() => {
      checkIPAccess()
    }, [])

    async function checkIPAccess() {
      try {
        // Get user's IP address
        const response = await fetch('https://api.ipify.org?format=json')
        const data = await response.json()
        const userIP = data.ip

        // Check if IP is allowed
        if (ALLOWED_IPS.includes(userIP)) {
          setIsAuthorized(true)
        } else {
          console.log('Access denied for IP:', userIP)
        }
      } catch (error) {
        console.error('IP check failed:', error)
        // Fallback to password protection if IP check fails
        setIsAuthorized(false)
      } finally {
        setLoading(false)
      }
    }

    if (loading) {
      return <div>Checking access...</div>
    }

    if (!isAuthorized) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#0f172a',
          color: 'white',
          textAlign: 'center'
        }}>
          <div>
            <h1>Access Restricted</h1>
            <p>This site is currently in development.</p>
            <p>Contact the administrator for access.</p>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}