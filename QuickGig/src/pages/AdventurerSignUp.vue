<template>
  <div class="signup-page">
    <div class="signup-container">
      <div class="header">
        <h1 class="title">⚔️ Sign Up as an Adventurer</h1>
        <p class="subtitle">Create your account and showcase your skills to find quests</p>
      </div>

      <div class="signup-card">
        <!-- Account Information -->
        <div class="form-section">
          <h2 class="section-title">Account Information</h2>
          
          <div class="form-group">
            <label class="section-label">
              Email <span class="required">*</span>
            </label>
            <input 
              type="email" 
              v-model="formData.email"
              class="text-input"
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div class="form-group">
            <label class="section-label">
              Username <span class="required">*</span>
            </label>
            <input 
              type="text" 
              v-model="formData.username"
              class="text-input"
              placeholder="Choose a username"
              required
            />
          </div>

          <div class="form-group">
            <label class="section-label">
              Password <span class="required">*</span>
            </label>
            <input 
              type="password" 
              v-model="formData.password"
              class="text-input"
              placeholder="At least 6 characters"
              required
            />
          </div>

          <div class="form-group">
            <label class="section-label">
              Confirm Password <span class="required">*</span>
            </label>
            <input 
              type="password" 
              v-model="formData.confirmPassword"
              @blur="checkPasswordMatch"
              @input="checkPasswordMatch"
              class="text-input"
              :class="{ 'input-error': passwordMismatch && formData.confirmPassword }"
              placeholder="Re-enter your password"
              required
            />
            <p v-if="passwordMismatch && formData.confirmPassword" class="field-error">
              ⚠️ Passwords do not match
            </p>
          </div>
        </div>

        <div class="divider"></div>

        <!-- Profile Information -->
        <div class="form-section">
          <h2 class="section-title">Your Adventurer Profile</h2>
          
          <label class="section-label">
            Your Skills & Services <span class="required">*</span>
          </label>
          <p class="section-hint">Add at least 1 skill you can offer</p>
          
          <div class="skills-input-area">
            <div class="input-group">
              <input 
                type="text" 
                v-model="currentSkill"
                @keypress.enter.prevent="addSkill"
                placeholder="e.g., Plumbing, Web Development, Dog Walking..."
                class="skill-input"
                maxlength="50"
              />
              <button 
                @click="addSkill" 
                class="add-button"
                :disabled="!currentSkill.trim()"
                type="button"
              >
                Add
              </button>
            </div>

            <div v-if="skills.length > 0" class="skills-list">
              <div 
                v-for="(skill, index) in skills" 
                :key="index" 
                class="skill-tag"
              >
                <span>{{ skill }}</span>
                <button 
                  @click="removeSkill(index)" 
                  class="remove-button"
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>

            <p v-else class="empty-message">
              No skills added yet. Start typing and press "Add"!
            </p>
          </div>
        </div>

        <!-- Experience Level -->
        <div class="form-section">
          <label class="section-label">
            Experience Level <span class="required">*</span>
          </label>
          <p class="section-hint">Select your overall experience level</p>
          
          <div class="radio-group">
            <div 
              v-for="level in experienceLevels" 
              :key="level.value"
              class="radio-option"
              :class="{ selected: formData.experienceLevel === level.value }"
              @click="formData.experienceLevel = level.value"
            >
              <span class="option-icon">{{ level.icon }}</span>
              <div class="option-text">
                <span class="option-label">{{ level.label }}</span>
                <span class="option-description">{{ level.description }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Hourly Rate -->
        <div class="form-section">
          <label class="section-label">
            Hourly Rate <span class="required">*</span>
          </label>
          <p class="section-hint">What do you charge per hour?</p>
          
          <div class="rate-input-wrapper">
            <span class="currency-symbol">$</span>
            <input 
              type="number" 
              v-model.number="formData.hourlyRate"
              class="rate-input"
              placeholder="25"
              min="0"
              step="5"
            />
            <span class="rate-suffix">/hour</span>
          </div>
        </div>

        <!-- Location -->
        <div class="form-section">
          <label class="section-label">
            Service Area <span class="required">*</span>
          </label>
          <p class="section-hint">Where can you provide your services?</p>
          
          <input 
            type="text" 
            v-model="formData.location"
            class="text-input"
            placeholder="e.g., Singapore, Bedok area, Remote"
          />
        </div>

        <!-- Service Type -->
        <div class="form-section">
          <label class="section-label">
            Service Type <span class="required">*</span>
          </label>
          <p class="section-hint">How do you provide your services?</p>
          
          <div class="checkbox-group">
            <label class="checkbox-option">
              <input 
                type="checkbox" 
                v-model="formData.serviceTypes.inPerson"
              />
              <span>In-Person</span>
            </label>
            <label class="checkbox-option">
              <input 
                type="checkbox" 
                v-model="formData.serviceTypes.remote"
              />
              <span>Remote/Online</span>
            </label>
          </div>
        </div>

        <!-- Bio -->
        <div class="form-section">
          <label class="section-label">
            About You <span class="required">*</span>
          </label>
          <p class="section-hint">Tell Questors about yourself and your experience</p>
          
          <textarea 
            v-model="formData.bio"
            placeholder="I have 5 years of experience in home repairs and renovations. I'm reliable, detail-oriented, and love helping people with their projects..."
            class="bio-textarea"
            rows="5"
            maxlength="500"
          ></textarea>
          <p class="character-count">{{ formData.bio.length }}/500 characters</p>
        </div>

        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <div class="form-actions">
          <button 
            @click="handleSubmit" 
            class="submit-button"
            :disabled="isLoading || !isFormValid"
            type="button"
          >
            {{ isLoading ? 'Creating Account...' : 'Create Account' }}
          </button>
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
import { supabase } from '../supabase/config';

export default {
  name: 'AdventurerSignUp',
  data() {
    return {
      currentSkill: '',
      skills: [],
      passwordMismatch: false,
      formData: {
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        experienceLevel: '',
        hourlyRate: null,
        location: '',
        serviceTypes: {
          inPerson: false,
          remote: false
        },
        bio: ''
      },
      isLoading: false,
      errorMessage: '',
      experienceLevels: [
        {
          value: 'beginner',
          label: 'Beginner',
          icon: '🌱',
          description: '0-2 years experience'
        },
        {
          value: 'intermediate',
          label: 'Intermediate',
          icon: '⚡',
          description: '2-5 years experience'
        },
        {
          value: 'expert',
          label: 'Expert',
          icon: '🏆',
          description: '5+ years experience'
        }
      ]
    };
  },
  computed: {
    isFormValid() {
      const hasServiceType = this.formData.serviceTypes.inPerson || this.formData.serviceTypes.remote;
      const hasValidRate = this.formData.hourlyRate !== null && 
                           this.formData.hourlyRate !== '' && 
                           this.formData.hourlyRate > 0;
      
      return (
        this.formData.email.trim() !== '' &&
        this.formData.username.trim() !== '' &&
        this.formData.password.trim() !== '' &&
        this.formData.confirmPassword.trim() !== '' &&
        this.formData.password === this.formData.confirmPassword &&
        this.formData.password.length >= 6 &&
        this.skills.length >= 1 &&
        this.formData.experienceLevel !== '' &&
        hasValidRate &&
        this.formData.location.trim() !== '' &&
        hasServiceType &&
        this.formData.bio.trim().length > 0
      );
    }
  },
  methods: {
    checkPasswordMatch() {
      if (this.formData.confirmPassword) {
        this.passwordMismatch = this.formData.password !== this.formData.confirmPassword;
      } else {
        this.passwordMismatch = false;
      }
    },
    addSkill() {
      const skillName = this.currentSkill.trim();
      
      if (!skillName) return;
      
      const exists = this.skills.some(
        s => s.toLowerCase() === skillName.toLowerCase()
      );
      
      if (exists) {
        this.errorMessage = 'This skill is already added';
        setTimeout(() => this.errorMessage = '', 3000);
        return;
      }

      if (this.skills.length >= 15) {
        this.errorMessage = 'Maximum 15 skills allowed';
        setTimeout(() => this.errorMessage = '', 3000);
        return;
      }

      this.skills.push(skillName);
      this.currentSkill = '';
      this.errorMessage = '';
    },
    removeSkill(index) {
      this.skills.splice(index, 1);
    },
    async handleSubmit() {
      // Validate passwords match
      if (this.formData.password !== this.formData.confirmPassword) {
        this.errorMessage = 'Passwords do not match!';
        return;
      }

      // Validate password length
      if (this.formData.password.length < 6) {
        this.errorMessage = 'Password must be at least 6 characters long';
        return;
      }

      if (!this.isFormValid) {
        this.errorMessage = 'Please fill in all required fields';
        return;
      }

      this.isLoading = true;
      this.errorMessage = '';

      try {
        // Step 1: Create auth user with email confirmation disabled
        console.log('Creating auth user...');
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: this.formData.email,
          password: this.formData.password,
          options: {
            data: {
              username: this.formData.username
            },
            emailRedirectTo: undefined // Disable email confirmation
          }
        });

        if (authError) {
          console.error('Auth error:', authError);
          throw authError;
        }

        if (!authData.user) {
          throw new Error('Failed to create user account');
        }

        console.log('Auth user created:', authData.user.id);

        // Step 2: Sign in immediately to get authenticated session
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: this.formData.email,
          password: this.formData.password
        });

        if (signInError) {
          console.error('Sign in error:', signInError);
          throw signInError;
        }

        console.log('User signed in successfully');

        // Step 3: Check if user profile already exists
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', authData.user.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 means "not found", which is what we want
          console.error('Error checking for existing user:', checkError);
          throw checkError;
        }

        // Step 4: Prepare service types
        const serviceTypes = [];
        if (this.formData.serviceTypes.inPerson) serviceTypes.push('in-person');
        if (this.formData.serviceTypes.remote) serviceTypes.push('remote');

        // Step 5: Create or update user profile in users table
        // Match the exact schema: skills as JSONB, hourly_rate as numeric(10,2)
        const profileData = {
          id: authData.user.id,
          email: this.formData.email,
          username: this.formData.username,
          user_role: 'adventurer',
          bio: this.formData.bio,
          expertise_level: this.formData.experienceLevel,
          skills: this.skills, // This will be stored as JSONB array
          hourly_rate: parseFloat(this.formData.hourlyRate),
          location: this.formData.location,
          service_types: serviceTypes, // PostgreSQL text array
          avatar_url: null,
          phone: null
        };

        let userData;
        
        if (existingUser) {
          // User profile already exists, update it
          console.log('User profile exists, updating:', profileData);
          const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update(profileData)
            .eq('id', authData.user.id)
            .select();

          if (updateError) {
            console.error('Profile update error:', updateError);
            throw updateError;
          }
          userData = updatedUser;
          console.log('Profile updated successfully:', userData);
        } else {
          // Create new user profile
          console.log('Creating new user profile:', profileData);
          const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([profileData])
            .select();

          if (insertError) {
            console.error('Profile creation error:', insertError);
            throw insertError;
          }
          userData = newUser;
          console.log('Profile created successfully:', userData);
        }

        // Step 6: Store user info in localStorage
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userId', authData.user.id);
        localStorage.setItem('userEmail', this.formData.email);
        localStorage.setItem('username', this.formData.username);
        localStorage.setItem('userRole', 'adventurer');
        localStorage.removeItem('selectedRole');

        // Step 7: Notify navbar
        window.dispatchEvent(new Event('user-logged-in'));

        // Step 8: Show success and redirect
        alert('Account created successfully! Welcome, Adventurer! ⚔️');
        this.$router.push('/jobs');

      } catch (error) {
        console.error('Error during signup:', error);
        
        if (error.message.includes('already registered') || error.message.includes('already been registered')) {
          this.errorMessage = 'This email is already registered. Please try logging in.';
        } else if (error.message.includes('invalid email')) {
          this.errorMessage = 'Please enter a valid email address.';
        } else if (error.message.includes('violates row-level security policy')) {
          this.errorMessage = 'Database permission error. Please contact support or check your Supabase RLS policies.';
        } else {
          this.errorMessage = 'Failed to create account: ' + (error.message || 'Please try again.');
        }
      } finally {
        this.isLoading = false;
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
  max-width: 800px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 2rem;
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
  margin-bottom: 2rem;
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

.section-hint {
  font-size: 0.9rem;
  color: #718096;
  margin-bottom: 1rem;
}

.divider {
  height: 2px;
  background: linear-gradient(90deg, transparent, #e2e8f0, transparent);
  margin: 2.5rem 0;
}

.skills-input-area {
  background: #f7fafc;
  padding: 1.5rem;
  border-radius: 12px;
  margin-top: 1rem;
}

.input-group {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.skill-input {
  flex: 1;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.3s ease;
}

.skill-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.add-button {
  padding: 0.875rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.add-button:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-1px);
}

.add-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.skill-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: white;
  padding: 0.5rem 0.75rem;
  border-radius: 20px;
  border: 2px solid #667eea;
  color: #667eea;
  font-weight: 500;
}

.remove-button {
  background: none;
  border: none;
  color: #667eea;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.2s;
}

.remove-button:hover {
  color: #e53e3e;
}

.empty-message {
  color: #a0aec0;
  font-style: italic;
  text-align: center;
}

.radio-group {
  display: grid;
  gap: 1rem;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: #f7fafc;
  border: 3px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.radio-option:hover {
  border-color: #cbd5e0;
  background: #edf2f7;
}

.radio-option.selected {
  border-color: #667eea;
  background: #f0f4ff;
}

.option-icon {
  font-size: 2rem;
}

.option-text {
  display: flex;
  flex-direction: column;
}

.option-label {
  font-weight: 700;
  color: #2d3748;
  font-size: 1.05rem;
}

.option-description {
  color: #718096;
  font-size: 0.9rem;
}

.rate-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f7fafc;
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  max-width: 250px;
}

.currency-symbol {
  font-size: 1.25rem;
  font-weight: 700;
  color: #4a5568;
}

.rate-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  padding: 0;
}

.rate-input:focus {
  outline: none;
}

.rate-suffix {
  color: #718096;
  font-size: 0.95rem;
}

.text-input {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  transition: all 0.3s ease;
  font-family: inherit;
}

.text-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.text-input.input-error {
  border-color: #e53e3e;
}

.text-input.input-error:focus {
  border-color: #e53e3e;
  box-shadow: 0 0 0 3px rgba(229, 62, 62, 0.1);
}

.field-error {
  color: #e53e3e;
  font-size: 0.85rem;
  margin-top: 0.5rem;
  font-weight: 500;
}

.checkbox-group {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 1rem;
  color: #2d3748;
}

.checkbox-option input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.bio-textarea {
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-family: inherit;
  resize: vertical;
  transition: all 0.3s ease;
}

.bio-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.character-count {
  text-align: right;
  font-size: 0.85rem;
  color: #a0aec0;
  margin-top: 0.5rem;
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

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 2rem;
  margin-bottom: 1.5rem;
}

.submit-button {
  width: 100%;
  max-width: 400px;
  padding: 1rem;
  font-size: 1.1rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
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

.login-prompt {
  text-align: center;
  color: #666;
  font-size: 0.95rem;
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

  .input-group {
    flex-direction: column;
  }

  .add-button {
    width: 100%;
  }

  .submit-button {
    max-width: 100%;
  }

  .radio-option {
    flex-wrap: wrap;
  }
}
</style>