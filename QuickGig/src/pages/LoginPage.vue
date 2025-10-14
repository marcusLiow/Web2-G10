<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-card">
        <div class="card-header">
          <h1>LOGIN</h1>
        </div>
        
        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input 
              type="email" 
              id="email"
              v-model="email"
              placeholder="Enter your email" 
              required
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input 
              type="password" 
              id="password"
              v-model="password"
              placeholder="Enter your password" 
              required
            />
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <button type="submit" class="login-button" :disabled="isLoading">
            {{ isLoading ? 'Logging in...' : 'Log In' }}
          </button>

          <div class="divider">
            <span>OR</span>
          </div>

          <button type="button" @click="signInWithGoogle" class="google-button">
            <svg class="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </form>

        <div class="card-footer">
          <p class="signup-prompt">
            Don't have an account?
            <router-link to="/signup" class="signup-link">Sign Up</router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { supabase } from '../supabase/config'

export default {
  name: "LoginPage",
  data() {
    return {
      email: '',
      password: '',
      error: '',
      isLoading: false
    };
  },
  methods: {
    async handleLogin() {
      try {
        this.error = '';
        this.isLoading = true;
        
        // Basic validation
        if (!this.email || !this.password) {
          this.error = 'Please enter email and password';
          return;
        }
        
        // Sign in with Supabase
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: this.email,
          password: this.password
        });
        
        if (authError) throw authError;
        
        // Get user details from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single();
        
        if (userError) {
          console.error('Error fetching user data:', userError);
        }
        
        // Store user info in localStorage
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userId', authData.user.id);
        localStorage.setItem('userEmail', authData.user.email);
        localStorage.setItem('username', userData?.username || authData.user.email.split('@')[0]);
        
        if (userData?.avatar_url) {
          localStorage.setItem('avatarUrl', userData.avatar_url);
        }
        
        // Dispatch event to notify navbar
        window.dispatchEvent(new Event('user-logged-in'));
        
        // Redirect to job page
        this.$router.push('/jobs');
        
      } catch (error) {
        console.error('Error logging in:', error.message);
        this.error = 'Invalid email or password';
      } finally {
        this.isLoading = false;
      }
    },
    async signInWithGoogle() {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`
          }
        });
        
        if (error) throw error;
      } catch (error) {
        console.error('Error logging in with Google:', error.message);
        alert('Failed to sign in with Google. Please try again.');
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

.login-page {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F8F9FA;
  padding: 2rem 1rem;
}

.login-container {
  width: 100%;
  max-width: 480px;
}

.login-card {
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

.login-form {
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

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 1rem;
}

.login-button {
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

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.4);
}

.login-button:active {
  transform: translateY(0);
}

.login-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  opacity: 0.7;
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

.signup-prompt {
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0;
}

.signup-link {
  color: #2563EB;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.3s ease;
}

.signup-link:hover {
  color: #1d4ed8;
  text-decoration: underline;
}

/* Responsive Design */
@media (max-width: 768px) {
  .login-page {
    padding: 1.5rem 1rem;
  }

  .card-header {
    padding: 2rem 2rem 1.5rem;
  }

  .card-header h1 {
    font-size: 1.75rem;
  }

  .login-form {
    padding: 2rem;
  }

  .card-footer {
    padding: 0 2rem 2rem;
  }
}

@media (max-width: 480px) {
  .login-page {
    padding: 1rem 0.75rem;
  }

  .card-header {
    padding: 1.75rem 1.5rem 1.25rem;
  }

  .card-header h1 {
    font-size: 1.5rem;
  }

  .login-form {
    padding: 1.5rem;
  }

  .form-group input {
    padding: 0.75rem 0.875rem;
    font-size: 0.95rem;
  }

  .login-button {
    padding: 0.875rem;
    font-size: 1rem;
  }

  .card-footer {
    padding: 0 1.5rem 1.5rem;
  }

  .signup-prompt {
    font-size: 0.875rem;
  }
}
</style>