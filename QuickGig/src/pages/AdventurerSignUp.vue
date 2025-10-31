<template>
  <div class="signup-page">
    <div class="signup-container">
      <div class="header">
        <button class="back-button" @click="goBack">
          &lt; Back
        </button>
        <div class="title-container">
          <h1 class="title">Create Adventurer Account <img 
            src="../assets/knight.gif" 
            alt="Knight" 
            class="title-gif"
          /></h1>
          
        </div>
        <p class="subtitle">Showcase your skills and start finding quests</p>
      </div>

      <div class="signup-card">
        <!-- Success Message -->
        <div v-if="successMessage" class="success-banner">
          <span class="banner-icon">✓</span>
          {{ successMessage }}
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="error-banner">
          <span class="banner-icon">⚠</span>
          {{ errorMessage }}
        </div>

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
          <p class="section-hint">Add your skills with experience levels (e.g., "Python - Expert", "HTML - Intermediate")</p>

          <div class="skills-input-area">
            <div class="skill-add-section">
              <div class="input-group">
                <input 
                  type="text"
                  v-model="currentSkill.name"
                  @keyup.enter="addSkill"
                  class="skill-input"
                  :class="{ 'input-error': skillErrorMessage }"
                  placeholder="Type a skill (e.g., Python, Graphic Design)"
                />
                <p v-if="skillErrorMessage" class="field-error">
                  {{ skillErrorMessage }}
                </p>
              </div>

              <div class="experience-selector">
                <label class="mini-label">Experience Level</label>
                <div class="experience-buttons">
                  <button
                    v-for="level in experienceLevels"
                    :key="level.value"
                    type="button"
                    class="exp-button"
                    :class="{ 'selected': currentSkill.level === level.value }"
                    @click="currentSkill.level = level.value"
                  >
                    <span class="exp-icon">{{ level.icon }}</span>
                    <span class="exp-label">{{ level.label }}</span>
                  </button>
                </div>
              </div>

              <button 
                type="button"
                @click="addSkill"
                :disabled="!currentSkill.name.trim() || !currentSkill.level"
                class="add-button"
              >
                Add Skill
              </button>
            </div>

            <div v-if="skills.length > 0" class="skills-list">
              <div v-for="(skill, index) in skills" :key="index" class="skill-tag">
                <span class="skill-icon">{{ getSkillIcon(skill.level) }}</span>
                <div class="skill-info">
                  <span class="skill-name">{{ skill.name }}</span>
                  <span class="skill-level">{{ skill.level }}</span>
                </div>
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
              No skills added yet. Add at least one skill with an experience level.
            </p>
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
            <p class="section-hint">Tell questors about yourself and your experience</p>
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
      currentSkill: {
        name: '',
        level: ''
      },
      skills: [],
      passwordMismatch: false,
      formData: {
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        location: '',
        serviceTypes: {
          inPerson: false,
          remote: false
        },
        bio: ''
      },
      isLoading: false,
      errorMessage: '',
      successMessage: '',
      skillErrorMessage: '',
      experienceLevels: [
        {
          value: 'Beginner',
          label: 'Beginner',
          icon: '🌱',
          description: '0-2 years'
        },
        {
          value: 'Intermediate',
          label: 'Intermediate',
          icon: '⚡',
          description: '2-5 years'
        },
        {
          value: 'Expert',
          label: 'Expert',
          icon: '🏆',
          description: '5+ years'
        }
      ]
    };
  },
  computed: {
    isFormValid() {
      const hasServiceType = this.formData.serviceTypes.inPerson || this.formData.serviceTypes.remote;
      
      return (
        this.formData.email.trim() !== '' &&
        this.formData.username.trim() !== '' &&
        this.formData.password.trim() !== '' &&
        this.formData.confirmPassword.trim() !== '' &&
        this.formData.password === this.formData.confirmPassword &&
        this.formData.password.length >= 6 &&
        this.skills.length >= 1 &&
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
      const skillName = this.currentSkill.name.trim();
      const skillLevel = this.currentSkill.level;
      
      // Clear previous error
      this.skillErrorMessage = '';
      
      if (skillName && skillLevel) {
        const existingSkill = this.skills.find(s => s.name.toLowerCase() === skillName.toLowerCase());
        if (!existingSkill) {
          this.skills.push({
            name: skillName,
            level: skillLevel
          });
          this.currentSkill = { name: '', level: '' };
        } else {
          this.skillErrorMessage = 'This skill has already been added';
          setTimeout(() => {
            this.skillErrorMessage = '';
          }, 3000);
        }
      }
    },
    removeSkill(index) {
      this.skills.splice(index, 1);
    },
    getSkillIcon(level) {
      const levelData = this.experienceLevels.find(l => l.value === level);
      return levelData ? levelData.icon : '📌';
    },
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    async handleSubmit() {
      // Clear previous messages
      this.errorMessage = '';
      this.successMessage = '';

      // Validation
      if (!this.formData.email || !this.formData.password || !this.formData.username) {
        this.errorMessage = 'Please fill in all required fields.';
        this.scrollToTop();
        return;
      }

      if (this.formData.password.length < 6) {
        this.errorMessage = 'Password must be at least 6 characters long.';
        this.scrollToTop();
        return;
      }

      if (this.formData.password !== this.formData.confirmPassword) {
        this.errorMessage = 'Passwords do not match.';
        this.scrollToTop();
        return;
      }

      if (this.skills.length === 0) {
        this.errorMessage = 'Please add at least one skill.';
        this.scrollToTop();
        return;
      }

      if (!this.formData.serviceTypes.inPerson && !this.formData.serviceTypes.remote) {
        this.errorMessage = 'Please select at least one service type.';
        this.scrollToTop();
        return;
      }

      if (this.formData.bio.trim().length === 0) {
        this.errorMessage = 'Please enter a bio.';
        this.scrollToTop();
        return;
      }

      this.isLoading = true;

      try {
        // 1. Sign up the user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: this.formData.email,
          password: this.formData.password,
        });

        if (authError) {
          throw new Error(authError.message);
        }

        // 2. Get the user ID from auth
        const userId = authData.user?.id;

        if (!userId) {
          throw new Error('Failed to retrieve user ID after signup');
        }

        // 3. Build service_types array
        const serviceTypes = [];
        if (this.formData.serviceTypes.inPerson) serviceTypes.push('in-person');
        if (this.formData.serviceTypes.remote) serviceTypes.push('remote');

        // 4. Upsert user data into the users table
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            id: userId,
            email: this.formData.email,
            username: this.formData.username,
            user_role: 'adventurer',
            skills: this.skills,
            location: this.formData.location,
            bio: this.formData.bio,
            service_types: serviceTypes,
            is_helper: true, // ← Mark them as a helper
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id'
          });

        if (upsertError) {
          throw new Error(upsertError.message);
        }

        // 5. Create helper_profiles entry to make them visible in HelpersPage
        const { error: helperProfileError } = await supabase
          .from('helper_profiles')
          .insert({
            user_id: userId,
            title: this.formData.username, // Use username as their title
            description: this.formData.bio || 'Available to help with various tasks',
            skills: this.skills.map(s => ({ 
              name: s.name, 
              level: s.level || 'Beginner', 
              jobs: 0 
            })),
            availability: 'Contact for availability', // Default availability
            response_time: 'Usually responds within 24 hours', // Default response time
            bio: this.formData.bio,
            experience: ['New adventurer'], // Default experience
            location: this.formData.location,
            is_active: true, // ← This makes them visible in HelpersPage
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (helperProfileError) {
          throw new Error(helperProfileError.message);
        }

        // Store user info in localStorage
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userId', userId);
        localStorage.setItem('userEmail', this.formData.email);
        localStorage.setItem('username', this.formData.username);

        // Emit event for app to update nav
        window.dispatchEvent(new Event('user-logged-in'));

        // Show success message
        this.successMessage = 'Account created successfully! Redirecting...';
        this.scrollToTop();
        
        // Redirect after a short delay
        setTimeout(() => {
          this.$router.push('/jobs');
        }, 1500);
      } catch (error) {
        console.error('Signup error:', error);
        this.errorMessage = error.message || 'An error occurred during signup. Please try again.';
        this.scrollToTop();
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>

<style scoped>
@font-face {
  font-family: 'Jersey10';
  src: url('../assets/fonts/Jersey10-Regular.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.signup-page {
  min-height: 100vh;
  background: white;
  padding: 2rem 1rem;
  font-family: 'Jersey10', sans-serif;
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

.title-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.title-gif {
  width: 60px;
  height: 60px;
  object-fit: contain;
  flex-shrink: 0;
  image-rendering: pixelated;
}

.back-button {
  position: absolute;
  left: 0;
  top: 0;
  background: none;
  border: none;
  font-size: 1.8rem;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  padding: 0.5rem 1rem;
  transition: all 0.3s ease;
}

.back-button:hover {
  color: #667eea;
}

.title {
  font-size: 2.55rem;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.35rem;
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

.form-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
}

.form-group {
  margin-bottom: 1.25rem;
}

.section-label {
  display: block;
  font-size: 1.65rem;
  font-weight: 600;
  color: #1a202c;
  margin-bottom: 0.5rem;
}

.mini-label {
  display: block;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 0.5rem;
  font-size: 1.525rem;
}

.section-hint {
  color: #718096;
  font-size: 1.45rem;
  margin-bottom: 1rem;
}

.required {
  color: #e53e3e;
}

.text-input, .bio-textarea {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1.45rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  transition: all 0.3s ease;
  font-family: inherit;
}

.text-input:focus, .bio-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.bio-textarea {
  resize: vertical;
  min-height: 120px;
}

.character-count {
  text-align: right;
  font-size: 1.525rem;
  color: #718096;
  margin-top: 0.5rem;
}

.input-error {
  border-color: #e53e3e !important;
}

.field-error {
  color: #e53e3e;
  font-size: 1.5rem;
  margin-top: 0.5rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
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
  margin-bottom: 1.5rem;
}

.skill-add-section {
  margin-bottom: 1.5rem;
}

.input-group {
  margin-bottom: 1rem;
}

.skill-input {
  width: 100%;
  padding: 0.875rem 1rem;
  font-size: 1.65rem;
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

.experience-selector {
  margin-bottom: 1rem;
}

.experience-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.exp-button {
  flex: 1;
  min-width: 120px;
  padding: 0.75rem 1rem;
  background: white;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.exp-button:hover {
  border-color: #667eea;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
}

.exp-button.selected {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.exp-icon {
  font-size: 1.5rem;
}

.exp-label {
  font-size: 1.525rem;
  font-weight: 600;
}

.add-button {
  width: 100%;
  padding: 0.875rem 1.5rem;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1.65rem;
}

.add-button:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.add-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.skills-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skill-tag {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: white;
  padding: 0.875rem 1rem;
  border-radius: 12px;
  border: 2px solid #667eea;
}

.skill-icon {
  font-size: 1.5rem;
}

.skill-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.skill-name {
  font-weight: 600;
  color: #2d3748;
  font-size: 1.65rem;
}

.skill-level {
  font-size: 1.525rem;
  color: #667eea;
  font-weight: 500;
}

.remove-button {
  background: none;
  border: none;
  color: #e53e3e;
  font-size: 1.75rem;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.remove-button:hover {
  background: #fee;
  transform: scale(1.1);
}

.empty-message {
  text-align: center;
  color: #718096;
  padding: 1.5rem;
  font-style: italic;
  font-size: 1.55rem;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.checkbox-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f7fafc;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.checkbox-option:hover {
  background: #edf2f7;
}

.checkbox-option input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-option span {
  font-weight: 500;
  color: #2d3748;
  font-size: 1.65rem;
}

.success-banner {
  background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  color: #155724;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 1.5rem;
  font-weight: 600;
  border: 2px solid #b1dfbb;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  animation: slideDown 0.3s ease-out;
  font-size: 1.65rem;
}

.error-banner {
  background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
  color: #c53030;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  text-align: center;
  margin-bottom: 1.5rem;
  font-weight: 600;
  border: 2px solid #fc8181;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  animation: slideDown 0.3s ease-out;
  font-size: 1.65rem;
}

.banner-icon {
  font-size: 1.25rem;
  font-weight: bold;
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

.form-actions {
  margin-top: 2rem;
}

.submit-button {
  width: 100%;
  padding: 0.65rem;
  font-size: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 700;
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
}

.login-prompt {
  text-align: center;
  color: #666;
  font-size: 1.25rem;
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

  .experience-buttons {
    flex-direction: column;
  }

  .exp-button {
    min-width: 100%;
  }
}
</style>