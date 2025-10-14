<template>
  <div class="signup-page">
    <div class="signup-container">
      <div class="signup-card">
        <div class="card-header">
          <h1>SIGN UP</h1>
        </div>
        
        <!-- Error Message -->
        <div v-if="errorMessage" class="alert alert-error">
          {{ errorMessage }}
        </div>

        <!-- Success Message -->
        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
        </div>
        
        <form @submit.prevent="handleSignup" class="signup-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email"
              v-model="email"
              placeholder="Enter your email" 
              required
              :disabled="isLoading"
            />
          </div>

          <div class="form-group">
            <label for="username">Username</label>
            <input 
              type="text" 
              id="username"
              v-model="username"
              placeholder="Choose a username" 
              required
              :disabled="isLoading"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password"
              v-model="password"
              placeholder="Create a password" 
              required
              :disabled="isLoading"
            />
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input 
              type="password" 
              id="confirmPassword"
              v-model="confirmPassword"
              placeholder="Confirm your password" 
              required
              :disabled="isLoading"
            />
          </div>

          <button type="submit" class="signup-button" :disabled="isLoading">
            {{ isLoading ? 'Signing up...' : 'Sign Up' }}
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

        <div class="card-footer">
          <p class="login-prompt">
            Already have an account?
            <router-link to="/login" class="login-link">Login</router-link>
          </p>
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
      confirmPassword: ''
    };
  },
  methods: {
    async handleSignup() {
      // Validate passwords match
      if (this.password !== this.confirmPassword) {
        alert('Passwords do not match!');
        return;
      }

      // Validate password length
      if (this.password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
      }

      try {
        const { data, error } = await supabase.auth.signUp({
          email: this.email,
          password: this.password,
          options: {
            data: {
              username: this.username
            },
            emailRedirectTo: `${window.location.origin}/login`
          }
        });

        if (error) {
          console.error('Signup error:', error);
          // Handle specific error cases
          if (error.message.includes('already registered')) {
            alert('This email is already registered. Please try logging in instead.');
          } else if (error.message.includes('invalid') || error.message.includes('email')) {
            alert('Please enter a valid email address.');
          } else {
            alert('Failed to sign up: ' + error.message);
          }
          return;
        }

        // Check if user was created successfully
        if (data?.user) {
          // Check if email confirmation is required
          if (data.user.identities && data.user.identities.length === 0) {
            // Email already exists
            alert('This email is already registered. Please try logging in instead.');
          } else if (data.user.confirmed_at) {
            // User is already confirmed (email confirmation disabled)
            alert('Sign up successful! You can now log in.');
          } else {
            // Email confirmation required
            alert('Sign up successful! Please check your email to verify your account before logging in.');
          }
          this.$router.push('/login');
        } else {
          alert('Sign up failed. Please try again.');
        }
      } catch (error) {
        console.error('Unexpected error during signup:', error);
        alert('An unexpected error occurred. Please try again.');
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
        alert('Failed to sign up with Google. Please try again.');
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
  min-height: calc(100vh - 80px); /* Subtract navbar height */
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F8F9FA;
  padding: 2rem 1rem;
}

.signup-container {
  width: 100%;
  max-width: 480px;
}

.signup-card {
  background: white;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.card-header {
  padding: 2rem 2.5rem;
  text-align: center;
  background: #2563EB;
  color: white;
}

.card-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  color: white;
}

.signup-form {
  padding: 2.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.form-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.3s ease;
  font-family: inherit;
}

.form-group input:focus {
  outline: none;
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.form-group input::placeholder {
  color: #9ca3af;
}

.signup-button {
  width: 100%;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
}

.signup-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
}

.signup-button:active {
  transform: translateY(0);
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

.google-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.google-button:active {
  transform: translateY(0);
}

.google-icon {
  width: 20px;
  height: 20px;
}

.card-footer {
  padding: 0 2.5rem 2.5rem;
  text-align: center;
}

.login-prompt {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0;
}

.login-link {
  color: #2563EB;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
}

.login-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

/* Responsive Design */
@media (max-width: 768px) {
  .signup-page {
    padding: 1.5rem 1rem;
  }

  .card-header {
    padding: 2rem 2rem 1.5rem;
  }

  .card-header h1 {
    font-size: 1.75rem;
  }

  .signup-form {
    padding: 2rem;
  }

  .card-footer {
    padding: 0 2rem 2rem;
  }
}

@media (max-width: 480px) {
  .signup-page {
    padding: 1rem 0.75rem;
  }

  .card-header {
    padding: 1.75rem 1.5rem 1.25rem;
  }

  .card-header h1 {
    font-size: 1.5rem;
  }

  .signup-form {
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group input {
    padding: 0.75rem 0.875rem;
    font-size: 0.95rem;
  }

  .signup-button {
    padding: 0.875rem;
    font-size: 1rem;
  }

  .card-footer {
    padding: 0 1.5rem 1.5rem;
  }

  .login-prompt {
    font-size: 0.875rem;
  }
}
</style>