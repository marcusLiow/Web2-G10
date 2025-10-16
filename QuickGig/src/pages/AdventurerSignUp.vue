<template>
  <div class="signup-page">
    <div class="signup-container">
      <div class="header">
        <button class="back-button" @click="goBack">
          &lt; Back
        </button>
        <h1 class="title">⚔️ Welcome to SideQuest</h1>
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
          <p class="section-hint">Add the skills you can offer (e.g., "Graphic Design", "Coding", "Writing")</p>

          <div class="skills-input-area">
            <div class="input-group">
              <input 
                type="text"
                v-model="currentSkill"
                @keyup.enter="addSkill"
                class="skill-input"
                placeholder="Type a skill and press Add"
              />
              <button 
                type="button"
                @click="addSkill"
                :disabled="!currentSkill.trim()"
                class="add-button"
              >
                Add
              </button>
            </div>

            <div v-if="skills.length > 0" class="skills-list">
              <div v-for="(skill, index) in skills" :key="index" class="skill-tag">
                <span>{{ skill }}</span>
                <button 
                  type="button"
                  @click="removeSkill(index)"
                  class="remove-button"
                >
                  ×
                </button>
              </div>
            </div>
            <p v-else class="empty-message">
              No skills added yet. Add at least one skill.
            </p>
          </div>

          <div class="form-group">
            <label class="section-label">
              Experience Level <span class="required">*</span>
            </label>
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

          <div class="form-group">
            <label class="section-label">
              Hourly Rate (USD) <span class="required">*</span>
            </label>
            <input 
              type="number"
              v-model.number="formData.hourlyRate"
              class="text-input"
              placeholder="e.g., 25"
              min="1"
              step="0.01"
              required
            />
          </div>

          <div class="form-group">
            <label class="section-label">
              Location <span class="required">*</span>
            </label>
            <input 
              type="text"
              v-model="formData.location"
              class="text-input"
              placeholder="City, Country"
              required
            />
          </div>

          <div class="form-group">
            <label class="section-label">
              Service Types <span class="required">*</span>
            </label>
            <div class="checkbox-group">
              <label class="checkbox-option">
                <input 
                  type="checkbox"
                  v-model="formData.serviceTypes.inPerson"
                />
                <span>In-Person Services</span>
              </label>
              <label class="checkbox-option">
                <input 
                  type="checkbox"
                  v-model="formData.serviceTypes.remote"
                />
                <span>Remote Services</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label class="section-label">
              Bio <span class="required">*</span>
            </label>
            <p class="section-hint">Tell questors about yourself and your experience (minimum 50 characters)</p>
            <textarea 
              v-model="formData.bio"
              class="bio-textarea"
              placeholder="Describe your skills, experience, and what makes you great at what you do..."
              rows="6"
              required
            ></textarea>
            <p class="character-count">{{ formData.bio.length }} characters</p>
          </div>
        </div>

        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>

        <div class="form-actions">
          <button 
            type="button"
            @click="handleSubmit"
            class="submit-button"
            :disabled="!isFormValid || isLoading"
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
    goBack() {
      this.$router.push('/onboarding');
    },
    checkPasswordMatch() {
      if (this.formData.confirmPassword) {
        this.passwordMismatch = this.formData.password !== this.formData.confirmPassword;
      }
    },
    addSkill() {
      const skill = this.currentSkill.trim();
      if (skill && !this.skills.includes(skill)) {
        this.skills.push(skill);
        this.currentSkill = '';
      }
    },
    removeSkill(index) {
      this.skills.splice(index, 1);
    },
    async handleSubmit() {
      // Validation
      if (!this.formData.email || !this.formData.password || !this.formData.username) {
        this.errorMessage = 'Please fill in all required fields.';
        return;
      }

      if (this.formData.password !== this.formData.confirmPassword) {
        this.errorMessage = 'Passwords do not match.';
        return;
      }

      if (this.skills.length === 0) {
        this.errorMessage = 'Please add at least one skill.';
        return;
      }

      if (this.formData.bio.length < 50) {
        this.errorMessage = 'Bio must be at least 50 characters long.';
        return;
      }

      this.isLoading = true;
      this.errorMessage = '';

      try {
        // Step 1: Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: this.formData.email,
          password: this.formData.password,
          options: {
            data: {
              username: this.formData.username,
              role: 'adventurer'
            }
          }
        });

        if (authError) {
          throw authError;
        }

        if (authData?.user) {
          // Step 2: Update the users table with all the adventurer data
          const { error: updateError } = await supabase
            .from('users')
            .update({
              username: this.formData.username,
              user_role: 'adventurer',
              skills: this.skills, // JSONB array of skill strings
              expertise_level: this.formData.experienceLevel,
              hourly_rate: this.formData.hourlyRate,
              location: this.formData.location,
              service_types: [
                this.formData.serviceTypes.inPerson ? 'in-person' : null,
                this.formData.serviceTypes.remote ? 'remote' : null
              ].filter(Boolean), // Remove null values
              bio: this.formData.bio
            })
            .eq('id', authData.user.id);

          if (updateError) {
            console.error('User update error:', updateError);
            this.errorMessage = 'Account created, but profile setup failed. Please update your profile after logging in.';
            // Still allow them to continue since the auth account was created
          } else {
            alert('Account created successfully! Please check your email to verify your account.');
          }
          
          this.$router.push('/login');
        }
      } catch (error) {
        console.error('Signup error:', error);
        if (error.message.includes('already registered')) {
          this.errorMessage = 'This email is already registered. Please try logging in.';
        } else if (error.message.includes('invalid email')) {
          this.errorMessage = 'Please enter a valid email address.';
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

.input-error {
  border-color: #e53e3e !important;
}

.field-error {
  color: #e53e3e;
  font-size: 0.85rem;
  margin-top: 0.5rem;
  font-weight: 500;
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
  font-family: inherit;
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
  font-size: 1.1rem;
  color: #1a202c;
}

.option-description {
  font-size: 0.9rem;
  color: #718096;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: #f7fafc;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.checkbox-option:hover {
  background: #edf2f7;
}

.checkbox-option input[type="checkbox"] {
  width: 1.25rem;
  height: 1.25rem;
  cursor: pointer;
}

.checkbox-option span {
  font-weight: 600;
  color: #1a202c;
}

.bio-textarea {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
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

  .back-button {
    position: static;
    display: block;
    margin-bottom: 1rem;
    text-align: left;
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