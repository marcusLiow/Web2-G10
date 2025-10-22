<template>
  <div id="app">
    <section class="request-section">
      <div class="container">
        <div class="form-wrapper">
          <h1 class="form-title">What do you need help with?</h1>
          <p class="form-subtitle">Tell us about your task and we'll connect you with the right helper</p>
          
          <form @submit.prevent="handleSubmit" class="request-form">
            <div class="form-group">
              <label for="title" class="form-label">Title</label>
              <input 
                type="text" 
                id="title" 
                v-model="formData.title"
                class="form-input"
                placeholder="e.g., Need plumbing help in kitchen"
                required
              />
            </div>

            <div class="form-group">
              <label for="description" class="form-label">Description</label>
              <textarea 
                id="description" 
                v-model="formData.description"
                class="form-textarea"
                placeholder="Provide detailed information about what you need..."
                rows="6"
                required
              ></textarea>
            </div>

            <div class="form-group">
              <label for="category" class="form-label">Category</label>
              <select 
                id="category" 
                v-model="formData.category"
                class="form-input"
                required
              >
                <option value="">-- Select a category --</option>
                <option value="Construction">Construction</option>
                <option value="Tech">Tech</option>
                <option value="Home">Home</option>
                <option value="Pets">Pets</option>
                <option value="Cleaning">Cleaning</option>
                <option value="Moving">Moving</option>
                <option value="Landscaping">Landscaping</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <!-- Location Fields - Both Postal Code and Address -->
            <div class="location-section">
              <h3 class="section-header">Location Details</h3>
              
              <div class="location-grid">
                <div class="form-group">
                  <label for="postalCode" class="form-label">Postal Code</label>
                  <input 
                    type="text" 
                    id="postalCode" 
                    v-model="formData.postalCode"
                    @blur="validatePostalCode"
                    class="form-input"
                    :class="{ 'validated': postalCodeValidated }"
                    placeholder="e.g., 238823"
                    maxlength="6"
                    pattern="[0-9]{6}"
                    required
                  />
                  <small class="helper-text" :class="{ 'success': postalCodeValidated }">
                    {{ postalCodeStatus }}
                  </small>
                </div>

                <div class="form-group">
                  <label for="location" class="form-label">Street Address</label>
                  <input 
                    type="text" 
                    id="location" 
                    v-model="formData.location"
                    class="form-input"
                    placeholder="e.g., Blk 123 Bedok North Street 1"
                    required
                  />
                  <small class="helper-text">
                    Enter your full address for display (map will use postal code for accuracy)
                  </small>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label for="payment" class="form-label">Willing to Pay</label>
              <div class="payment-input-wrapper">
                <span class="currency-symbol">$</span>
                <input 
                  type="number" 
                  id="payment" 
                  v-model="formData.payment"
                  class="form-input payment-input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div v-if="submitError" class="error-message">
              {{ submitError }}
            </div>

            <button type="submit" class="submit-button" :disabled="isSubmitting || !postalCodeValidated">
              {{ isSubmitting ? 'Posting...' : 'Post Request' }}
            </button>
            
            <small v-if="!postalCodeValidated" class="submit-hint">
              Please enter a valid postal code to continue
            </small>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { supabase } from '../supabase/config'

export default {
  name: 'RequestPage',
  data() {
    return {
      formData: {
        title: '',
        description: '',
        category: '',
        postalCode: '',
        location: '',
        payment: ''
      },
      coordinates: null,
      postalCodeValidated: false,
      postalCodeStatus: 'Required for accurate map location',
      isSubmitting: false,
      submitError: null,
      apiKey: import.meta.env.VITE_GOOGLE_GEOCODING_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    };
  },
  methods: {
    async validatePostalCode() {
      const postalCode = this.formData.postalCode;
      
      // Reset validation if postal code is empty or invalid
      if (!postalCode || postalCode.length !== 6 || !/^\d{6}$/.test(postalCode)) {
        this.postalCodeValidated = false;
        this.coordinates = null;
        this.postalCodeStatus = 'Please enter a valid 6-digit postal code';
        return;
      }
      
      this.postalCodeStatus = 'Validating postal code...';
      await this.geocodePostalCode(postalCode);
    },
    
    async geocodePostalCode(postalCode) {
      if (!this.apiKey) {
        this.postalCodeStatus = '⚠️ Map location may not be accurate (API key missing)';
        this.postalCodeValidated = true; // Allow submission anyway
        return;
      }
      
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?` +
          `address=${postalCode}+Singapore&` +
          `region=sg&` +
          `key=${this.apiKey}`
        );
        
        const data = await response.json();
        
        if (data.status === 'OK' && data.results.length > 0) {
          const result = data.results[0];
          
          // Store coordinates for map display (using postal code only)
          this.coordinates = {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          };
          
          this.postalCodeValidated = true;
          this.postalCodeStatus = '✓ Valid postal code - map location confirmed';
          
          console.log('Postal code validated with coordinates:', this.coordinates);
        } else {
          this.postalCodeStatus = '⚠️ Postal code not recognized - please verify';
          this.postalCodeValidated = false;
          this.coordinates = null;
        }
      } catch (error) {
        console.error('Geocoding error:', error);
        this.postalCodeStatus = '⚠️ Could not validate postal code - you may continue';
        this.postalCodeValidated = true; // Allow submission even if validation fails
      }
    },
    
    async handleSubmit() {
      // Final validation before submit
      if (!this.postalCodeValidated) {
        await this.validatePostalCode();
        if (!this.postalCodeValidated) {
          this.submitError = 'Please enter a valid postal code';
          return;
        }
      }
      
      this.isSubmitting = true;
      this.submitError = null;

      try {
        const userId = localStorage.getItem('userId');
        
        const requestData = {
          title: this.formData.title,
          description: this.formData.description,
          category: this.formData.category,
          postal_code: this.formData.postalCode,
          location: this.formData.location, // User-entered address for display
          coordinates: this.coordinates, // Accurate coordinates from postal code
          payment: parseFloat(this.formData.payment),
          status: 'open',
          user_id: userId
        };

        const { data, error } = await supabase
          .from('User-Job-Request')
          .insert([requestData])
          .select();

        if (error) throw error;
        
        console.log('Request created:', data);
        alert('Job posted successfully! Map will use postal code for precise location.');
        
        // Redirect to job board page
        this.$router.push('/jobs');
        
      } catch (error) {
        console.error('Error adding request:', error);
        this.submitError = 'Failed to post request. Please try again.';
      } finally {
        this.isSubmitting = false;
      }
    }
  },
  watch: {
    'formData.postalCode': function(newVal) {
      // Reset validation when postal code changes
      if (this.postalCodeValidated) {
        this.postalCodeValidated = false;
        this.postalCodeStatus = 'Required for accurate map location';
      }
    }
  }
};
</script>

<style scoped>
/* Keep all your existing styles plus these additions */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  width: 100%;
  min-height: 100vh;
  background: #f8f9fa;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.request-section {
  padding: 5rem 0;
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
}

.form-wrapper {
  max-width: 700px;
  margin: 0 auto;
  background: white;
  border-radius: 24px;
  padding: 3rem;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
}

.form-title {
  font-size: 2.5rem;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
  font-weight: 700;
  text-align: center;
}

.form-subtitle {
  font-size: 1.1rem;
  color: #666;
  text-align: center;
  margin-bottom: 3rem;
  line-height: 1.6;
}

.request-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 1rem;
  font-weight: 600;
  color: #1a1a1a;
}

.form-input,
.form-textarea {
  padding: 1rem;
  font-size: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.3s ease;
  font-family: Arial, sans-serif;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #2563EB;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* New location section styles */
.location-section {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.section-header {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.location-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1.5rem;
}

@media (max-width: 640px) {
  .location-grid {
    grid-template-columns: 1fr;
  }
}

.form-input.validated {
  border-color: #10b981;
  background-color: #f0fdf4;
}

.helper-text {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
  display: block;
}

.helper-text.success {
  color: #059669;
  font-weight: 500;
}

.submit-hint {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: -0.5rem;
}

select.form-input {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  padding-right: 2.5rem;
}

.form-textarea {
  resize: vertical;
  min-height: 150px;
}

.payment-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.currency-symbol {
  position: absolute;
  left: 1rem;
  font-size: 1.1rem;
  font-weight: 600;
  color: #666;
  pointer-events: none;
}

.payment-input {
  padding-left: 2.5rem;
}

.submit-button {
  background: #2563EB;
  color: white;
  padding: 1.25rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1rem;
}

.submit-button:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
}

.submit-button:active {
  transform: translateY(0);
}

.submit-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  opacity: 0.6;
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.95rem;
  text-align: center;
}

/* Responsive Design */
@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }

  .request-section {
    padding: 3rem 0;
  }

  .form-wrapper {
    padding: 2rem;
  }

  .form-title {
    font-size: 2rem;
  }

  .form-subtitle {
    font-size: 1rem;
    margin-bottom: 2rem;
  }

  .request-form {
    gap: 1.5rem;
  }
}

@media (max-width: 480px) {
  .form-wrapper {
    padding: 1.5rem;
    border-radius: 16px;
  }

  .form-title {
    font-size: 1.75rem;
  }

  .form-subtitle {
    font-size: 0.95rem;
  }

  .form-input,
  .form-textarea {
    padding: 0.875rem;
    font-size: 0.95rem;
  }

  .submit-button {
    padding: 1rem 1.5rem;
    font-size: 1rem;
  }
  
  .location-section {
    padding: 1rem;
  }
}
</style>