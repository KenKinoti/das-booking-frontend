<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="brand-icon">
            <i class="fas fa-calendar-alt"></i>
          </div>
          <h1 class="brand-title">DASYIN BOOK</h1>
          <h2 class="welcome-title">Welcome Back</h2>
          <p class="welcome-subtitle">Sign in to access your booking platform</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="input-group">
            <label for="email" class="input-label">Email Address</label>
            <div class="input-wrapper">
              <div class="input-icon">
                <i class="fas fa-envelope"></i>
              </div>
              <input
                id="email"
                v-model="form.email"
                type="email"
                class="form-input"
                placeholder="Enter your email address"
                required
                :disabled="isLoading"
                autocomplete="email"
              />
            </div>
          </div>

          <div class="input-group">
            <label for="password" class="input-label">Password</label>
            <div class="input-wrapper">
              <div class="input-icon">
                <i class="fas fa-lock"></i>
              </div>
              <input
                id="password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-input"
                placeholder="Enter your password"
                required
                :disabled="isLoading"
                autocomplete="current-password"
                @keyup.enter="handleLogin"
              />
              <button
                type="button"
                class="password-toggle"
                @click="showPassword = !showPassword"
                :disabled="isLoading"
              >
                <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
          </div>

          <div class="form-options">
            <div class="remember-me">
              <input type="checkbox" v-model="form.rememberMe" :disabled="isLoading" id="rememberMe" class="checkbox">
              <label for="rememberMe" class="checkbox-label">
                Remember me
              </label>
            </div>
            <a href="#" class="forgot-password" @click.prevent="showForgotPassword">
              Forgot password?
            </a>
          </div>

          <button 
            type="submit" 
            @click.prevent="handleLoginClick"
            class="login-button primary" 
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="button-loading">
              <i class="fas fa-spinner fa-spin"></i>
              Signing In...
            </span>
            <span v-else class="button-content">
              <i class="fas fa-sign-in-alt"></i>
              Sign In
            </span>
          </button>

          <button 
            type="button"
            @click="testLogin"
            class="login-button emergency"
          >
            <i class="fas fa-bolt"></i>
            Quick Demo Login
          </button>

          <div class="divider">
            <span class="divider-text">Or continue with</span>
          </div>

          <div class="oauth-buttons">
            <button type="button" @click="loginWithGoogle" class="oauth-button google" :disabled="isLoading">
              <i class="fab fa-google"></i>
              Google
            </button>
            <button type="button" @click="loginWithMicrosoft" class="oauth-button microsoft" :disabled="isLoading">
              <i class="fab fa-microsoft"></i>
              Microsoft
            </button>
          </div>

          <div v-if="error" class="alert error" role="alert">
            <i class="fas fa-exclamation-triangle"></i>
            <span>{{ error }}</span>
          </div>

          <div v-if="successMessage" class="alert success" role="alert">
            <i class="fas fa-check-circle"></i>
            <span>{{ successMessage }}</span>
          </div>
        </form>

        <!-- Demo Accounts Section -->
        <div class="demo-accounts">
          <button 
            type="button" 
            @click="showTestAccounts = !showTestAccounts" 
            class="demo-accounts-toggle"
          >
            <i :class="showTestAccounts ? 'fas fa-chevron-up' : 'fas fa-chevron-down'"></i>
            <span>{{ showTestAccounts ? 'Hide' : 'Show' }} Demo Accounts</span>
          </button>
          
          <div v-if="showTestAccounts" class="demo-accounts-panel">
            <div class="panel-header">
              <h3>Demo Login Accounts</h3>
              <p>Click any account below to auto-fill the login form</p>
            </div>
            
            <div class="demo-accounts-grid">
              <div class="demo-account-card super-admin" @click="fillLoginForm('superadmin@dasyinbook.com', 'admin2024')">
                <div class="account-icon">
                  <i class="fas fa-crown"></i>
                </div>
                <div class="account-info">
                  <div class="account-role">Super Admin</div>
                  <div class="account-email">superadmin@dasyinbook.com</div>
                  <div class="account-password">Password: admin2024</div>
                  <div class="account-description">Full platform control & all organizations</div>
                </div>
              </div>
              
              <div class="demo-account-card admin" @click="fillLoginForm('admin@autocare.com', 'garage123')">
                <div class="account-icon">
                  <i class="fas fa-wrench"></i>
                </div>
                <div class="account-info">
                  <div class="account-role">Garage Admin</div>
                  <div class="account-email">admin@autocare.com</div>
                  <div class="account-password">Password: garage123</div>
                  <div class="account-description">AutoCare Plus - Vehicle services management</div>
                </div>
              </div>
              
              <div class="demo-account-card manager" @click="fillLoginForm('manager@beautyhaven.com', 'beauty123')">
                <div class="account-icon">
                  <i class="fas fa-cut"></i>
                </div>
                <div class="account-info">
                  <div class="account-role">Salon Manager</div>
                  <div class="account-email">manager@beautyhaven.com</div>
                  <div class="account-password">Password: beauty123</div>
                  <div class="account-description">Beauty Haven Spa - Salon & spa services</div>
                </div>
              </div>
              
              <div class="demo-account-card staff" @click="fillLoginForm('staff@dasyinbook.com', 'staff2024')">
                <div class="account-icon">
                  <i class="fas fa-user-tie"></i>
                </div>
                <div class="account-info">
                  <div class="account-role">Staff Member</div>
                  <div class="account-email">staff@dasyinbook.com</div>
                  <div class="account-password">Password: staff2024</div>
                  <div class="account-description">Basic booking & schedule management</div>
                </div>
              </div>
              
              <div class="demo-account-card customer" @click="fillLoginForm('customer@example.com', 'customer123')">
                <div class="account-icon">
                  <i class="fas fa-user"></i>
                </div>
                <div class="account-info">
                  <div class="account-role">Customer</div>
                  <div class="account-email">customer@example.com</div>
                  <div class="account-password">Password: customer123</div>
                  <div class="account-description">Customer booking & appointment access</div>
                </div>
              </div>
            </div>
            
            <div class="demo-note">
              <i class="fas fa-info-circle"></i>
              <span>All demo accounts use secure mock authentication for testing purposes</span>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { useAuthStore } from '../stores/auth'
import { showInfoModal } from '../utils/notifications'

export default {
  name: 'Login',
  data() {
    return {
      form: {
        email: 'superadmin@dasyinbook.com',
        password: 'admin2024',
        rememberMe: false
      },
      showPassword: false,
      isLoading: false,
      error: null,
      successMessage: null,
      showForgotPasswordModal: false,
      showTestAccounts: false,
      resetForm: {
        email: ''
      },
      isResetting: false,
      resetError: null,
      resetSuccess: null
    }
  },
  setup() {
    const authStore = useAuthStore()
    return {
      authStore
    }
  },
  methods: {
    async handleLogin() {
      console.log('🚀 LOGIN DEBUG: handleLogin called')
      
      // Check if we're in a try-catch that might be failing silently
      try {
        console.log('🚀 LOGIN DEBUG: Inside try block')
      
      this.isLoading = true
      this.error = null
      this.successMessage = null

      try {
        console.log('🚀 LOGIN DEBUG: Form submitted with credentials:', { 
          email: this.form.email,
          passwordLength: this.form.password?.length 
        })
        
        console.log('🚀 LOGIN DEBUG: AuthStore state before login:', {
          hasToken: !!this.authStore.token,
          hasUser: !!this.authStore.user,
          isAuthenticated: this.authStore.isAuthenticated
        })
        
        const result = await this.authStore.login(this.form)
        console.log('🚀 LOGIN DEBUG: Login result:', result)
        
        console.log('🚀 LOGIN DEBUG: Auth store state after login:', {
          hasToken: !!this.authStore.token,
          hasUser: !!this.authStore.user,
          isAuthenticated: this.authStore.isAuthenticated,
          tokenValue: this.authStore.token ? this.authStore.token.substring(0, 30) + '...' : 'null',
          userEmail: this.authStore.user?.email || 'null'
        })
        
        this.successMessage = 'Login successful! Redirecting...'
        
        // Wait a moment to ensure auth state is fully updated
        await this.$nextTick()
        
        // Small delay to ensure reactivity has updated
        console.log('🚀 LOGIN DEBUG: Waiting for reactivity update...')
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const redirectTo = this.$route.query.redirect || '/dashboard'
        console.log('🚀 LOGIN DEBUG: Preparing to redirect to:', redirectTo)
        
        console.log('🚀 LOGIN DEBUG: Final auth state before redirect:', {
          hasToken: !!this.authStore.token,
          hasUser: !!this.authStore.user,
          isAuthenticated: this.authStore.isAuthenticated,
          tokenValue: this.authStore.token ? this.authStore.token.substring(0, 30) + '...' : 'null',
          userEmail: this.authStore.user?.email || 'null'
        })
        
        // Verify authentication state one more time
        if (!this.authStore.isAuthenticated) {
          console.log('🚀 LOGIN DEBUG: Authentication state check failed!')
          throw new Error('Authentication state not properly set after login')
        }
        
        console.log('🚀 LOGIN DEBUG: Authentication verified, executing redirect...')
        // Use replace instead of push to prevent login page from staying in history
        await this.$router.replace(redirectTo)
        console.log('🚀 LOGIN DEBUG: Router.replace executed')
        
      } catch (error) {
        console.error('🚀 LOGIN DEBUG: Error in try block:', error)
        console.error('🚀 LOGIN DEBUG: Error details:', error.stack)
        this.error = this.authStore.error || error.message || 'Login failed. Please try again.'
      } finally {
        console.log('🚀 LOGIN DEBUG: Finally block executed')
        this.isLoading = false
      }
      
      } catch (outerError) {
        console.error('🚀 LOGIN DEBUG: OUTER CATCH - Critical error:', outerError)
        console.error('🚀 LOGIN DEBUG: OUTER CATCH - Error stack:', outerError.stack)
        this.isLoading = false
        this.error = 'Critical login error: ' + outerError.message
      }
    },

    // EXPLICIT BUTTON CLICK HANDLER
    async handleLoginClick(event) {
      console.log('🚀 BUTTON DEBUG: handleLoginClick called', {
        event: event,
        eventType: event?.type,
        form: this.form,
        disabled: this.isLoading
      })
      
      if (this.isLoading) {
        console.log('🚀 BUTTON DEBUG: Button disabled, ignoring click')
        return
      }
      
      try {
        await this.handleLogin()
      } catch (error) {
        console.error('🚀 BUTTON DEBUG: Click handler error:', error)
      }
    },

    // SUPER SIMPLE TEST METHOD
    async testLogin() {
      console.log('🚀 TEST: Simple login test started')
      try {
        // Set form data manually
        this.form.email = 'admin@dasyin.com.au'
        this.form.password = 'password'
        console.log('🚀 TEST: Form data set:', this.form)
        
        // Call login directly
        await this.handleLogin()
      } catch (error) {
        console.error('🚀 TEST: Login test failed:', error)
      }
    },
    
    showForgotPassword() {
      this.showForgotPasswordModal = true
      this.resetForm.email = this.form.email
      this.resetError = null
      this.resetSuccess = null
    },
    
    closeForgotPassword() {
      this.showForgotPasswordModal = false
      this.resetForm.email = ''
      this.resetError = null
      this.resetSuccess = null
    },
    
    async handlePasswordReset() {
      this.isResetting = true
      this.resetError = null
      this.resetSuccess = null
      
      try {
        // Simulate API call for password reset
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        this.resetSuccess = 'Password reset link has been sent to your email address.'
        
        // Close modal after 3 seconds
        setTimeout(() => {
          this.closeForgotPassword()
        }, 3000)
        
      } catch (error) {
        console.error('Password reset error:', error)
        this.resetError = 'Failed to send reset email. Please try again.'
      } finally {
        this.isResetting = false
      }
    },
    
    async loginWithGoogle() {
      try {
        this.error = null
        this.isLoading = true
        
        showInfoModal('Google OAuth integration is coming soon! This will enable secure sign-in with your Google account.', 'Google Sign-In')
        
      } catch (error) {
        console.error('Google login error:', error)
        this.error = 'Google login failed. Please try again.'
      } finally {
        this.isLoading = false
      }
    },
    
    async loginWithMicrosoft() {
      try {
        this.error = null
        this.isLoading = true
        
        showInfoModal('Microsoft OAuth integration is coming soon! This will enable secure sign-in with your Microsoft account.', 'Microsoft Sign-In')
        
      } catch (error) {
        console.error('Microsoft login error:', error)
        this.error = 'Microsoft login failed. Please try again.'
      } finally {
        this.isLoading = false
      }
    },

    fillLoginForm(email, password = 'password') {
      this.form.email = email
      this.form.password = password
      this.error = null
      this.successMessage = `Credentials auto-filled for ${email.split('@')[0]}. Click "Sign In" to login.`
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        this.successMessage = null
      }, 3000)
    }
  },
  
  mounted() {
    console.log('🚀 LOGIN DEBUG: Login component mounted')
    console.log('🚀 LOGIN DEBUG: Initial form state:', this.form)
    console.log('🚀 LOGIN DEBUG: AuthStore instance:', {
      exists: !!this.authStore,
      hasToken: !!this.authStore?.token,
      hasUser: !!this.authStore?.user,
      isAuthenticated: this.authStore?.isAuthenticated
    })
    console.log('🚀 LOGIN DEBUG: Available test emails:', ['admin@dasyin.com.au', 'kennedy@dasyin.com.au', 'manager@dasyin.com.au', 'coordinator@dasyin.com.au'])
    
    // If already authenticated, redirect to dashboard
    if (this.authStore.isAuthenticated) {
      console.log('🚀 LOGIN DEBUG: Already authenticated, redirecting...')
      this.$router.push('/dashboard')
    }
  }
}
</script>

<style scoped>
.login-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-attachment: fixed;
  padding: 0;
  margin: 0;
  overflow: auto;
}

.login-container {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  box-sizing: border-box;
}

.login-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 400px;
}


.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.brand-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  transition: all 0.3s ease;
}

.brand-icon:hover {
  transform: scale(1.05);
}

.brand-icon i {
  font-size: 1.5rem;
  color: white;
}

.brand-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 0.5rem 0;
}

.welcome-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 0.25rem 0;
}

.welcome-subtitle {
  color: #718096;
  font-size: 0.875rem;
  margin: 0;
}

/* Form Styles */
.login-form {
  margin-bottom: 2rem;
}

.input-group {
  margin-bottom: 1.5rem;
}

.input-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
}

.input-wrapper {
  position: relative;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #9ca3af;
  font-size: 1rem;
  z-index: 1;
}

.form-input {
  width: 100%;
  padding: 16px 16px 16px 48px;
  border: 2px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  font-size: 1rem;
  color: var(--bs-body-color);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input:disabled {
  background: var(--bs-body-bg);
  opacity: 0.7;
  cursor: not-allowed;
}

.password-toggle {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.password-toggle:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.remember-me {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.checkbox {
  width: 16px;
  height: 16px;
  accent-color: #667eea;
}

.checkbox-label {
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
}

.forgot-password {
  font-size: 0.875rem;
  color: #667eea;
  text-decoration: none;
  transition: all 0.2s ease;
}

.forgot-password:hover {
  color: #764ba2;
  text-decoration: underline;
}

/* Button Styles */
.login-button {
  width: 100%;
  padding: 16px;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.login-button.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.login-button.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.login-button.emergency {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: white;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
}

.login-button.emergency:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.button-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.button-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Divider */
.divider {
  position: relative;
  text-align: center;
  margin: 1.5rem 0;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
}

.divider-text {
  background: rgba(255, 255, 255, 0.95);
  padding: 0 1rem;
  font-size: 0.875rem;
  color: var(--bs-secondary);
}

/* OAuth Buttons */
.oauth-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.oauth-button {
  padding: 12px;
  border: 2px solid rgba(226, 232, 240, 0.6);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.oauth-button:hover:not(:disabled) {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
  transform: translateY(-1px);
}

.oauth-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Alert Styles */
.alert {
  padding: 12px 16px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  font-weight: 500;
}

.alert.error {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.alert.success {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

/* Demo Accounts */
.demo-accounts {
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  padding-top: 1.5rem;
}

.demo-accounts-toggle {
  width: 100%;
  padding: 12px 16px;
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 10px;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.demo-accounts-toggle:hover {
  background: rgba(102, 126, 234, 0.05);
  border-color: #667eea;
  color: #667eea;
}

.demo-accounts-panel {
  margin-top: 1rem;
  padding: 1.5rem;
  background: rgba(248, 250, 252, 0.5);
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.6);
}

.panel-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.panel-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin: 0 0 0.5rem 0;
}

.panel-header p {
  font-size: 0.875rem;
  color: var(--bs-secondary);
  margin: 0;
}

.demo-accounts-grid {
  display: grid;
  gap: 1rem;
  margin-bottom: 1rem;
}

.demo-account-card {
  background: var(--card-bg);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 10px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.demo-account-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

.account-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.125rem;
  color: white;
  flex-shrink: 0;
}

.demo-account-card.super-admin .account-icon {
  background: linear-gradient(135deg, #ffd700 0%, #ff8c00 100%);
}

.demo-account-card.admin .account-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.demo-account-card.manager .account-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.demo-account-card.staff .account-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.demo-account-card.customer .account-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.account-info {
  flex: 1;
}

.account-role {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--bs-body-color);
  margin-bottom: 0.25rem;
}

.account-email {
  font-size: 0.875rem;
  color: #667eea;
  font-weight: 500;
  margin-bottom: 0.125rem;
}

.account-password {
  font-size: 0.75rem;
  color: #059669;
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.account-description {
  font-size: 0.75rem;
  color: var(--bs-secondary);
  line-height: 1.4;
}

.demo-note {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: var(--bs-secondary);
  padding: 0.75rem;
  background: rgba(99, 102, 241, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.1);
}

/* Responsive Design */
@media (max-width: 640px) {
  .login-card {
    padding: 1.5rem;
  }
  
  .oauth-buttons {
    grid-template-columns: 1fr;
  }
  
  .brand-icon {
    width: 60px;
    height: 60px;
  }
  
  .brand-icon i {
    font-size: 1.5rem;
  }
  
  .brand-title {
    font-size: 1.5rem;
  }
  
  .welcome-title {
    font-size: 1.25rem;
  }
}

.logo-icon {
  width: 48px;
  height: 48px;
  background: var(--primary-gradient);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.logo-text {
  font-size: 1.8rem;
  font-weight: 700;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.login-header h2 {
  color: var(--text-dark);
  margin-bottom: 0.5rem;
}

.login-header p {
  color: var(--text-medium);
  font-size: 0.9rem;
}

.login-form {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-dark);
  font-weight: 500;
}

.input-wrapper {
  position: relative;
}

.input-wrapper input {
  width: 100%;
  padding: 12px 40px 12px 40px;
  border: 2px solid #e2e8f0;
  border-radius: var(--border-radius-sm);
  font-size: 1rem;
  transition: all 0.3s ease;
}

.input-wrapper input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input-wrapper input:disabled {
  background-color: #f7fafc;
  cursor: not-allowed;
}

.input-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-light);
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-light);
  cursor: pointer;
  padding: 4px;
  transition: color 0.3s ease;
}

.password-toggle:hover:not(:disabled) {
  color: var(--primary-color);
}

.password-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  color: var(--text-medium);
  cursor: pointer;
}

.checkbox-wrapper input:disabled {
  cursor: not-allowed;
}

.forgot-link {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.3s ease;
}

.forgot-link:hover {
  text-decoration: underline;
}

.login-btn {
  width: 100%;
  padding: 14px;
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-message {
  background: #fee;
  color: #c53030;
  padding: 12px;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  margin-top: 1rem;
  border: 1px solid #fed7d7;
}

.success-message {
  background: #f0fff4;
  color: #38a169;
  padding: 12px;
  border-radius: var(--border-radius-sm);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  margin-top: 1rem;
  border: 1px solid #9ae6b4;
}

.login-footer {
  text-align: center;
  padding-top: 2rem;
  border-top: 1px solid var(--card-border);
  color: var(--text-light);
  font-size: 0.8rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
}

.modal-content {
  background: var(--white);
  border-radius: var(--border-radius);
  box-shadow: var(--shadow-medium);
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 2rem 2rem 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  color: var(--text-dark);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: var(--text-light);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.close-btn:hover {
  color: var(--text-dark);
  background: #f7fafc;
}

.modal-body {
  padding: 2rem;
}

.modal-body p {
  color: var(--text-medium);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: var(--border-radius-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-decoration: none;
  flex: 1;
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-cancel {
  background: #f7fafc;
  color: var(--text-medium);
  border: 1px solid var(--card-border);
}

.btn-cancel:hover:not(:disabled) {
  background: #edf2f7;
  color: var(--text-dark);
}

.btn-cancel:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Social Login Styles */
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 2rem 0 1.5rem;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.divider span {
  padding: 0 1rem;
  color: var(--text-light);
  font-size: 0.85rem;
  font-weight: 500;
}

.social-login {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.social-btn {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e2e8f0;
  border-radius: var(--border-radius-sm);
  background: var(--card-bg);
  color: var(--text-dark);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.9rem;
}

.social-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.social-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.google-btn i {
  color: #db4437;
}

.microsoft-btn i {
  color: #00a1f1;
}

.google-btn:hover:not(:disabled) {
  border-color: #db4437;
  color: #db4437;
}

.microsoft-btn:hover:not(:disabled) {
  border-color: #00a1f1;
  color: #00a1f1;
}

@media (max-width: 640px) {
  .login-container {
    padding: 1rem;
  }
  
  .login-card {
    padding: 2rem;
    max-width: 100%;
  }
  
  .test-account-cards {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .test-account-card {
    padding: 0.75rem;
    min-height: 70px;
  }
  
  .account-role {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }
  
  .account-email {
    font-size: 0.75rem;
  }
  
  .account-description {
    font-size: 0.7rem;
  }
}

@media (max-width: 480px) {
  .login-container {
    padding: 0.75rem;
  }
  
  .login-card {
    padding: 1.5rem;
  }
  
  .modal-overlay {
    padding: 1rem;
  }
  
  .modal-header {
    padding: 1.5rem 1.5rem 0;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .test-accounts-section {
    margin-top: 1rem;
  }
}

/* Test Accounts Section Styling */
.test-accounts-section {
  margin-top: 1.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--card-border);
}

.test-accounts-toggle {
  width: 100%;
  background: none;
  border: none;
  color: var(--text-medium);
  padding: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
  border-radius: var(--border-radius-sm);
}

.test-accounts-toggle:hover {
  background: var(--bs-body-bg);
  color: var(--text-dark);
}

.test-accounts-list {
  margin-top: 1rem;
  animation: slideDown 0.3s ease;
}

.test-accounts-list h4 {
  margin: 0 0 0.5rem 0;
  color: var(--text-dark);
  font-size: 0.95rem;
  font-weight: 600;
}

.test-accounts-note {
  margin: 0 0 1rem 0;
  color: var(--text-medium);
  font-size: 0.8rem;
  text-align: center;
  background: var(--bs-body-bg);
  padding: 0.5rem;
  border-radius: var(--border-radius-sm);
}

.test-account-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
}

.test-account-card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--border-radius-sm);
  padding: 0.875rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  min-height: 80px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.test-account-card:hover {
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
  transform: translateY(-1px);
}

.account-role {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  margin-bottom: 0.5rem;
  display: inline-block;
}

.account-role.super-admin {
  background: #fee2e2;
  color: #dc2626;
}

.account-role.admin {
  background: #dbeafe;
  color: #2563eb;
}

.account-role.manager {
  background: #f3e8ff;
  color: #7c3aed;
}

.account-role.coordinator {
  background: #ecfdf5;
  color: #059669;
}

.account-role.care-worker {
  background: #fef3c7;
  color: #d97706;
}

.account-email {
  color: var(--text-dark);
  font-weight: 500;
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.account-description {
  color: var(--text-medium);
  font-size: 0.75rem;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
