<template>
  <div class="signup-page">
    <div class="signup-container">
      <div class="header">
        <button class="back-button" @click="goBack">
          &lt; Back
        </button>
        <h1 class="title">📜 Welcome to SideQuest</h1>
        <p class="subtitle">Create your account to start posting quests</p>
      </div>

      <div class="signup-card">
        <!-- Error Message -->
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="success-banner">
          {{ successMessage }}
        </div>

        <div class="form-section">
          <h2 class="section-title">Account Information</h2>
          
          <form @submit.prevent="handleSignup" class="signup-form">
            <div class="form-group">
              <label for="email" class="section-label">
                Email <span class="required">*</span>
              </label>
              <input 
                type="email" 
                id="email"
                v-model="email"
                class="text-input"
                placeholder="your.email@example.com" 
                required
                :disabled="isLoading"
              />
            </div>

            <div class="form-group">
              <label for="username" class="section-label">
                Username <span class="required">*</span>
              </label>
              <input 
                type="text" 
                id="username"
                v-model="username"
                class="text-input"
                placeholder="Choose a username" 
                required
                :disabled="isLoading"
              />
            </div>

            <div class="form-group">
              <label for="password" class="section-label">
                Password <span class="required">*</span>
              </label>
              <input 
                type="password" 
                id="password"
                v-model="password"
                class="text-input"
                placeholder="At least 6 characters" 
                required
                :disabled="isLoading"
              />
            </div>

            <div class="form-group">
              <label for="confirmPassword" class="section-label">
                Confirm Password <span class="required">*</span>
              </label>
              <input 
                type="password" 
                id="confirmPassword"
                v-model="confirmPassword"
                @blur="checkPasswordMatch"
                @input="checkPasswordMatch"
                class="text-input"
                :class="{ 'input-error': passwordMismatch && confirmPassword }"
                placeholder="Re-enter your password" 
                required
                :disabled="isLoading"
              />
              <p v-if="passwordMismatch && confirmPassword" class="field-error">
                ⚠️ Passwords do not match
              </p>
            </div>

            <button type="submit" class="submit-button" :disabled="isLoading">
              {{ isLoading ? 'Creating Account...' : 'Create Account' }}
            </button>

            <div class="divider">
              <span>OR</span>
            </div>

            <button type="button" @click="signUpWithGoogle" class="google-button" :disabled="isLoading">
              <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign up with Google
            </button>
          </form>
        </div>

        <div class="login-prompt">
          Already have an account?
          <router-link to="/login" class="login-link">Log In</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { supabase } from '../supabase/config'

export default {
  name: "SignupPage",
  data() {
    return {
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      passwordMismatch: false,
      isLoading: false,
      errorMessage: '',
      successMessage: ''
    };
  },
  methods: {
    goBack() {
      this.$router.push('/onboarding');
    },
    checkPasswordMatch() {
      if (this.confirmPassword) {
        this.passwordMismatch = this.password !== this.confirmPassword;
      }
    },
    async handleSignup() {
      this.errorMessage = '';
      this.successMessage = '';

      // Validate passwords match
      if (this.password !== this.confirmPassword) {
        this.errorMessage = 'Passwords do not match!';
        return;
      }

      // Validate password length
      if (this.password.length < 6) {
        this.errorMessage = 'Password must be at least 6 characters long';
        return;
      }

      this.isLoading = true;

      try {
        const { data, error } = await supabase.auth.signUp({
          email: this.email,
          password: this.password,
          options: {
            data: {
              username: this.username,
              role: 'questor'
            },
            emailRedirectTo: `${window.location.origin}/login`
          }
        });

        if (error) {
          console.error('Signup error:', error);
          // Handle specific error cases
          if (error.message.includes('already registered')) {
            this.errorMessage = 'This email is already registered. Please try logging in instead.';
          } else if (error.message.includes('invalid') || error.message.includes('email')) {
            this.errorMessage = 'Please enter a valid email address.';
          } else {
            this.errorMessage = 'Failed to sign up: ' + error.message;
          }
          return;
        }

        // Check if user was created successfully
        if (data?.user) {
          // Check if email confirmation is required
          if (data.user.identities && data.user.identities.length === 0) {
            // Email already exists
            this.errorMessage = 'This email is already registered. Please try logging in instead.';
          } else if (data.user.confirmed_at) {
            // User is already confirmed (email confirmation disabled)
            this.successMessage = 'Sign up successful! You can now log in.';
            setTimeout(() => {
              this.$router.push('/login');
            }, 1500);
          } else {
            // Email confirmation required
            this.successMessage = 'Sign up successful! Please check your email to verify your account before logging in.';
            setTimeout(() => {
              this.$router.push('/login');
            }, 2000);
          }
        } else {
          this.errorMessage = 'Sign up failed. Please try again.';
        }
      } catch (error) {
        console.error('Unexpected error during signup:', error);
        this.errorMessage = 'An unexpected error occurred. Please try again.';
      } finally {
        this.isLoading = false;
      }
    },
    async signUpWithGoogle() {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/`
          }
        });
        
        if (error) throw error;
      } catch (error) {
        console.error('Error signing up with Google:', error.message);
        this.errorMessage = 'Failed to sign up with Google. Please try again.';
      }
    }
  }
};
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.signup-page {
  min-height: 100vh;
  background: white;
  padding: 2rem 1rem;
}

.signup-container {
  width: 100%;
  max-width: 700px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
  position: relative;
}

.back-button {
  position: absolute;
  left: 0;
  top: 0;
  background: none;
  border: none;
  font-size: 1.1rem;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  padding: 0.5rem 1rem;
  transition: all 0.3s ease;
}

.back-button:hover {
  color: #eb2825;
}

.title {
  font-size: 2.25rem;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.05rem;
  color: #666;
  line-height: 1.5;
}

.signup-card {
  background: white;
  border-radius: 24px;
  padding: 2.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 2px solid #e5e7eb;
}

.section-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
}

.form-section {
  margin-bottom: 1.5rem;
}

.signup-form {
  margin-top: 1rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.section-label {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 0.5rem;
}

.required {
  color: #e53e3e;
}

.text-input {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.3s ease;
  font-family: inherit;
}

.text-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.text-input:disabled {
  background: #f7fafc;
  cursor: not-allowed;
}

.input-error {
  border-color: #e53e3e !important;
}

.field-error {
  color: #e53e3e;
  font-size: 0.85rem;
  margin-top: 0.5rem;
  font-weight: 500;
}

.error-banner {
  background: #fed7d7;
  color: #c53030;
  padding: 1rem;
  border-radius: 10px;
  text-align: center;
  margin-bottom: 1.5rem;
  font-weight: 500;
}

.success-banner {
  background: #c6f6d5;
  color: #276749;
  padding: 1rem;
  border-radius: 10px;
  text-align: center;
  margin-bottom: 1.5rem;
  font-weight: 500;
}

.submit-button {
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 1.5rem 0;
  color: #9ca3af;
  font-size: 0.875rem;
  font-weight: 500;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e5e7eb;
}

.divider span {
  padding: 0 1rem;
}

.google-button {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.google-button:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.google-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.google-icon {
  width: 20px;
  height: 20px;
}

.login-prompt {
  text-align: center;
  color: #666;
  font-size: 0.95rem;
  margin-top: 1.5rem;
}

.login-link {
  color: #667eea;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.3s ease;
}

.login-link:hover {
  color: #5568d3;
  text-decoration: underline;
}

@media (max-width: 768px) {
  .signup-card {
    padding: 1.5rem;
  }

  .title {
    font-size: 1.75rem;
  }

  .back-button {
    position: static;
    display: block;
    margin-bottom: 1rem;
    text-align: left;
  }

  .text-input {
    padding: 0.75rem 0.875rem;
    font-size: 0.95rem;
  }

  .submit-button {
    padding: 0.875rem;
    font-size: 1rem;
  }

  .login-prompt {
    font-size: 0.875rem;
  }
}
</style>