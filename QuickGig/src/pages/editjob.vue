<template>
  <div id="app">
    <section class="request-section">
      <div class="container">
        <div class="form-wrapper">
          <h1 class="form-title">Edit Your Listing</h1>
          <p class="form-subtitle">Update the details of your job request</p>
          
          <div v-if="loading" class="loading-state">
            <div class="spinner"></div>
            <p>Loading job details...</p>
          </div>

          <form v-else-if="jobLoaded" @submit.prevent="handleSubmit" class="request-form">
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

            <!-- IMAGE UPLOAD SECTION -->
            <div class="form-group">
              <label class="form-label">
                Images (Optional)
                <span class="label-hint">Up to 5 images, max 5MB each</span>
              </label>
              
              <div 
                class="image-upload-area"
                :class="{ 'drag-over': isDragging }"
                @dragover.prevent="handleDragOver"
                @dragleave.prevent="handleDragLeave"
                @drop.prevent="handleDrop"
              >
                <input 
                  type="file" 
                  ref="fileInput"
                  @change="handleFileSelect"
                  accept="image/*"
                  multiple
                  style="display: none;"
                />
                
                <div v-if="selectedImages.length === 0" class="upload-placeholder" @click="triggerFileInput">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                  </svg>
                  <p class="upload-text">Click to upload or drag and drop</p>
                  <p class="upload-subtext">PNG, JPG, GIF up to 5MB</p>
                </div>

                <div v-else class="image-preview-grid">
                  <div v-for="(image, index) in selectedImages" :key="index" class="image-preview-item">
                    <img :src="image.preview" :alt="`Preview ${index + 1}`" />
                    <button type="button" class="remove-image-btn" @click="removeImage(index)">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                    <div v-if="image.uploading" class="upload-overlay">
                      <div class="spinner-small"></div>
                    </div>
                  </div>
                  
                  <div v-if="selectedImages.length < 5" class="add-more-btn" @click="triggerFileInput">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <p>Add more</p>
                  </div>
                </div>
              </div>

              <div v-if="imageError" class="error-message">
                {{ imageError }}
              </div>
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

            <!-- MULTIPLE POSITIONS SECTION -->
            <div class="multiple-positions-section">
              <h3 class="section-header">Position Details</h3>
              
              <div class="form-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    v-model="formData.multiple_positions"
                    @change="handleMultiplePositionsChange"
                    class="checkbox-input"
                  />
                  <span class="checkbox-text">
                    This job requires multiple people
                  </span>
                </label>
                <small class="helper-text">
                  Check this if you need more than one person to complete this job
                </small>
              </div>

              <transition name="slide-fade">
                <div v-if="formData.multiple_positions" class="positions-config">
                  <div class="form-group">
                    <label for="positions_available" class="form-label">
                      Number of Positions
                      <span class="label-hint">How many people do you need?</span>
                    </label>
                    <input 
                      type="number" 
                      id="positions_available" 
                      v-model.number="formData.positions_available"
                      class="form-input"
                      placeholder="e.g., 3"
                      min="2"
                      max="50"
                      required
                    />
                    <small class="helper-text">
                      {{ positionsHelpText }}
                    </small>
                  </div>

                  <div class="form-group">
                    <label for="payment_type" class="form-label">Payment Distribution</label>
                    <select 
                      id="payment_type" 
                      v-model="formData.payment_type"
                      class="form-input"
                      required
                    >
                      <option value="per_person">Per Person</option>
                      <option value="total">Total (Split Among All)</option>
                    </select>
                    <small class="helper-text">
                      {{ paymentTypeHelpText }}
                    </small>
                  </div>
                </div>
              </transition>
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
              <small v-if="formData.multiple_positions" class="helper-text payment-summary">
                {{ paymentSummary }}
              </small>
            </div>

            <!-- Expiration Date Field -->
            <div class="form-group">
              <label for="expiration" class="form-label">Post Expiration</label>
              <div class="expiration-wrapper">
                <select 
                  v-model="expirationOption"
                  @change="handleExpirationChange"
                  class="form-input expiration-select"
                >
                  <option value="never">Never expires</option>
                  <option value="1week">1 Week</option>
                  <option value="2weeks">2 Weeks</option>
                  <option value="1month">1 Month</option>
                  <option value="custom">Custom date</option>
                </select>
                
                <input 
                  v-if="expirationOption === 'custom'"
                  type="date" 
                  v-model="formData.expiration_date"
                  :min="minDate"
                  class="form-input expiration-date-input"
                  required
                />
              </div>
              <small class="helper-text">
                {{ expirationHelpText }}
              </small>
            </div>

            <div v-if="submitError" class="error-message">
              {{ submitError }}
            </div>

            <div class="button-group">
              <button type="button" @click="cancelEdit" class="cancel-button">
                Cancel
              </button>
              <button type="submit" class="submit-button" :disabled="isSubmitting || !postalCodeValidated">
                {{ isSubmitting ? 'Updating...' : 'Update Listing' }}
              </button>
            </div>
            
            <small v-if="!postalCodeValidated" class="submit-hint">
              Please enter a valid postal code to continue
            </small>
          </form>

          <div v-else class="error-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h2>Failed to Load Job</h2>
            <p>{{ loadError }}</p>
            <button @click="$router.push('/jobs')" class="back-button-error">
              Back to Listings
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Toast Notifications -->
    <div class="toast-container">
      <transition-group name="toast">
        <div 
          v-for="toast in toasts" 
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`]"
          @click="removeToast(toast.id)"
        >
          <div class="toast-icon">
            <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <svg v-else-if="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x="12" y1="16" x2="12" y2="12"></line>
              <line x="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <span class="toast-message">{{ toast.message }}</span>
          <button class="toast-close" @click.stop="removeToast(toast.id)">✕</button>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script>
import { supabase } from '../supabase/config'

export default {
  name: 'EditJobPage',
  data() {
    return {
      jobId: null,
      originalJobData: null,
      loading: true,
      jobLoaded: false,
      loadError: null,
      formData: {
        title: '',
        description: '',
        category: '',
        postalCode: '',
        location: '',
        payment: '',
        expiration_date: null,
        multiple_positions: false,
        positions_available: 2,
        payment_type: 'per_person'
      },
      expirationOption: 'never',
      minDate: new Date().toISOString().split('T')[0],
      coordinates: null,
      postalCodeValidated: false,
      postalCodeStatus: 'Required for accurate map location',
      isSubmitting: false,
      submitError: null,
      apiKey: import.meta.env.VITE_GOOGLE_GEOCODING_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      
      // Image upload data
      selectedImages: [],
      isDragging: false,
      imageError: null,
      existingImageUrls: [],
      
      // Toast notifications
      toasts: [],
      toastId: 0
    };
  },
  computed: {
    expirationHelpText() {
      if (this.expirationOption === 'never') {
        return 'Your post will remain active until manually deleted';
      } else if (this.expirationOption === 'custom') {
        return 'Select a date when this post should be automatically removed';
      } else if (this.formData.expiration_date) {
        const date = new Date(this.formData.expiration_date);
        return `Post will be automatically removed on ${date.toLocaleDateString()}`;
      }
      return 'Choose when this post should expire';
    },
    positionsHelpText() {
      if (this.formData.positions_available > 0) {
        return `You'll be able to accept up to ${this.formData.positions_available} helpers for this job`;
      }
      return 'Specify how many people you need for this job';
    },
    paymentTypeHelpText() {
      if (this.formData.payment_type === 'per_person') {
        return 'Each person will receive the full payment amount';
      } else {
        return 'The total payment will be divided equally among all helpers';
      }
    },
    paymentSummary() {
      const payment = parseFloat(this.formData.payment) || 0;
      const positions = parseInt(this.formData.positions_available) || 2;
      
      if (this.formData.payment_type === 'per_person') {
        const total = payment * positions;
        return `Total cost: $${total.toFixed(2)} ($${payment.toFixed(2)} × ${positions} people)`;
      } else {
        const perPerson = payment / positions;
        return `Each helper receives: $${perPerson.toFixed(2)} ($${payment.toFixed(2)} ÷ ${positions} people)`;
      }
    }
  },
  async mounted() {
    this.jobId = this.$route.params.id;
    
    if (!this.jobId) {
      this.loadError = 'No job ID provided';
      this.loading = false;
      return;
    }
    
    await this.loadJobData();
  },
  methods: {
    handleMultiplePositionsChange() {
      if (!this.formData.multiple_positions) {
        // Reset to defaults when unchecked
        this.formData.positions_available = 2;
        this.formData.payment_type = 'per_person';
      }
    },
    
    // Toast notification methods
    showToast(message, type = 'info') {
      const id = this.toastId++;
      this.toasts.push({ id, message, type });
      
      setTimeout(() => {
        this.removeToast(id);
      }, 4000);
    },
    
    removeToast(id) {
      const index = this.toasts.findIndex(t => t.id === id);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    },
    
    async loadJobData() {
      try {
        const currentUserId = localStorage.getItem('userId');
        
        const { data, error } = await supabase
          .from('User-Job-Request')
          .select('*')
          .eq('id', this.jobId)
          .eq('user_id', currentUserId)
          .single();
        
        if (error) throw error;
        
        if (!data) {
          throw new Error('Job not found or you do not have permission to edit it');
        }
        
        this.originalJobData = data;
        
        // Populate form with existing data
        this.formData = {
          title: data.title || '',
          description: data.description || '',
          category: data.category || '',
          postalCode: data.postal_code || '',
          location: data.location || '',
          payment: data.payment || '',
          expiration_date: data.expiration_date || null,
          multiple_positions: data.multiple_positions || false,
          positions_available: data.positions_available || 2,
          payment_type: data.payment_type || 'per_person'
        };
        
        // Set expiration option based on existing data
        if (!data.expiration_date) {
          this.expirationOption = 'never';
        } else {
          this.expirationOption = 'custom';
        }
        
        // Load coordinates if available
        if (data.coordinates) {
          this.coordinates = data.coordinates;
          this.postalCodeValidated = true;
          this.postalCodeStatus = '✓ Valid postal code - map location confirmed';
        }
        
        // Load existing images
        if (data.images && data.images.length > 0) {
          this.existingImageUrls = [...data.images];
          this.selectedImages = data.images.map((url, index) => ({
            preview: url,
            url: url,
            isExisting: true
          }));
        }
        
        this.jobLoaded = true;
        console.log('Job data loaded:', data);
        
      } catch (error) {
        console.error('Error loading job:', error);
        this.loadError = error.message || 'Failed to load job data';
        this.showToast(this.loadError, 'error');
      } finally {
        this.loading = false;
      }
    },
    
    // Image upload methods
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    
    handleDragOver(e) {
      this.isDragging = true;
    },
    
    handleDragLeave(e) {
      this.isDragging = false;
    },
    
    handleDrop(e) {
      this.isDragging = false;
      const files = Array.from(e.dataTransfer.files);
      this.processFiles(files);
    },
    
    handleFileSelect(e) {
      const files = Array.from(e.target.files);
      this.processFiles(files);
    },
    
    processFiles(files) {
      this.imageError = null;
      
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      
      if (imageFiles.length === 0) {
        this.imageError = 'Please select valid image files';
        return;
      }
      
      const remainingSlots = 5 - this.selectedImages.length;
      if (imageFiles.length > remainingSlots) {
        this.imageError = `You can only upload ${remainingSlots} more image(s)`;
        return;
      }
      
      imageFiles.forEach(file => {
        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          this.imageError = `${file.name} is too large. Max size is 5MB`;
          return;
        }
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          this.selectedImages.push({
            file: file,
            preview: e.target.result,
            uploading: false,
            isExisting: false
          });
        };
        reader.readAsDataURL(file);
      });
    },
    
    removeImage(index) {
      this.selectedImages.splice(index, 1);
      this.imageError = null;
    },
    
    async uploadNewImages() {
      const uploadedUrls = [];
      
      // Keep existing images
      const existingImages = this.selectedImages.filter(img => img.isExisting);
      uploadedUrls.push(...existingImages.map(img => img.url));
      
      // Upload new images
      const newImages = this.selectedImages.filter(img => !img.isExisting);
      
      for (let i = 0; i < newImages.length; i++) {
        const imageData = newImages[i];
        imageData.uploading = true;
        
        try {
          const file = imageData.file;
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${fileName}`;
          
          console.log('Uploading new image:', filePath);
          
          const { data, error } = await supabase.storage
            .from('job-images')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (error) throw error;
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('job-images')
            .getPublicUrl(filePath);
          
          uploadedUrls.push(urlData.publicUrl);
          console.log('New image uploaded successfully:', urlData.publicUrl);
          
        } catch (error) {
          console.error('Error uploading image:', error);
          throw new Error(`Failed to upload image: ${error.message}`);
        } finally {
          imageData.uploading = false;
        }
      }
      
      return uploadedUrls;
    },
    
    async validatePostalCode() {
      const postalCode = this.formData.postalCode;
      
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
        this.postalCodeValidated = true;
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
        this.postalCodeValidated = true;
      }
    },
    
    cancelEdit() {
      if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        this.$router.back();
      }
    },
    
    // Handle expiration date selection
    handleExpirationChange() {
      const today = new Date();
      
      switch(this.expirationOption) {
        case 'never':
          this.formData.expiration_date = null;
          break;
        case '1week':
          const oneWeek = new Date(today);
          oneWeek.setDate(today.getDate() + 7);
          this.formData.expiration_date = oneWeek.toISOString().split('T')[0];
          break;
        case '2weeks':
          const twoWeeks = new Date(today);
          twoWeeks.setDate(today.getDate() + 14);
          this.formData.expiration_date = twoWeeks.toISOString().split('T')[0];
          break;
        case '1month':
          const oneMonth = new Date(today);
          oneMonth.setMonth(today.getMonth() + 1);
          this.formData.expiration_date = oneMonth.toISOString().split('T')[0];
          break;
        case 'custom':
          // User will select custom date
          this.formData.expiration_date = '';
          break;
      }
    },
    
    handleMultiplePositionsChange() {
      if (!this.formData.multiple_positions) {
        // Reset to defaults when unchecked
        this.formData.positions_available = 2;
        this.formData.payment_type = 'per_person';
      }
    },
    
    async handleSubmit() {
      if (!this.postalCodeValidated) {
        await this.validatePostalCode();
        if (!this.postalCodeValidated) {
          this.submitError = 'Please enter a valid postal code';
          this.showToast('Please enter a valid postal code', 'error');
          return;
        }
      }
      
      this.isSubmitting = true;
      this.submitError = null;

      try {
        // Upload new images if any
        let imageUrls = [];
        if (this.selectedImages.length > 0) {
          console.log('Processing images...');
          imageUrls = await this.uploadNewImages();
          console.log('Final image URLs:', imageUrls);
        }
        
        const updateData = {
          title: this.formData.title,
          description: this.formData.description,
          category: this.formData.category,
          postal_code: this.formData.postalCode,
          location: this.formData.location,
          coordinates: this.coordinates,
          payment: parseFloat(this.formData.payment),
          images: imageUrls,
          expiration_date: this.formData.expiration_date,
          
          // Multiple positions fields - save with both naming conventions
          multiple_positions: this.formData.multiple_positions,
          requiresMultipleHelpers: this.formData.multiple_positions,
          
          positions_available: this.formData.multiple_positions ? parseInt(this.formData.positions_available) : 1,
          numberOfHelpers: this.formData.multiple_positions ? parseInt(this.formData.positions_available) : 1,
          
          payment_type: this.formData.multiple_positions ? this.formData.payment_type : 'per_person'
        };

        console.log('Updating job with data:', updateData);

        const { data, error } = await supabase
          .from('User-Job-Request')
          .update(updateData)
          .eq('id', this.jobId)
          .select();

        if (error) throw error;
        
        console.log('Job updated:', data);
        this.showToast('Listing updated successfully!', 'success');
        
        // Navigate back after a short delay
        setTimeout(() => {
          this.$router.push('/jobs');
        }, 1000);
        
      } catch (error) {
        console.error('Error updating job:', error);
        this.submitError = error.message || 'Failed to update listing. Please try again.';
        this.showToast(this.submitError, 'error');
      } finally {
        this.isSubmitting = false;
      }
    }
  },
  watch: {
    'formData.postalCode': function(newVal) {
      if (this.postalCodeValidated && newVal !== this.originalJobData?.postal_code) {
        this.postalCodeValidated = false;
        this.postalCodeStatus = 'Required for accurate map location';
      }
    }
  }
};
</script>

<style scoped>
/* All styles from request-form.vue */
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

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: #6b7280;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #2563EB;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Error State */
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.error-state svg {
  color: #dc2626;
  margin-bottom: 1.5rem;
}

.error-state h2 {
  font-size: 1.5rem;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
}

.error-state p {
  color: #6b7280;
  margin-bottom: 2rem;
}

.back-button-error {
  background: #2563EB;
  color: white;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.back-button-error:hover {
  background: #1d4ed8;
  transform: translateY(-2px);
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
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label-hint {
  font-size: 0.875rem;
  font-weight: 400;
  color: #6b7280;
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

/* IMAGE UPLOAD STYLES */
.image-upload-area {
  border: 2px dashed #e5e7eb;
  border-radius: 12px;
  padding: 2rem;
  transition: all 0.3s ease;
  background: #f9fafb;
}

.image-upload-area.drag-over {
  border-color: #2563EB;
  background: #eff6ff;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 2rem;
  color: #6b7280;
}

.upload-placeholder svg {
  margin-bottom: 1rem;
  color: #9ca3af;
}

.upload-text {
  font-size: 1rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
}

.upload-subtext {
  font-size: 0.875rem;
  color: #9ca3af;
}

.image-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 1rem;
}

.image-preview-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid #e5e7eb;
}

.image-preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(220, 38, 38, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.remove-image-btn:hover {
  background: rgb(220, 38, 38);
  transform: scale(1.1);
}

.upload-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
}

.spinner-small {
  width: 24px;
  height: 24px;
  border: 3px solid #e5e7eb;
  border-top-color: #2563EB;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.add-more-btn {
  aspect-ratio: 1;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
  background: white;
}

.add-more-btn:hover {
  border-color: #2563EB;
  color: #2563EB;
  background: #eff6ff;
}

.add-more-btn p {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Location section styles */
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

/* Expiration date styles */
.expiration-wrapper {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.expiration-select {
  width: 100%;
}

.expiration-date-input {
  margin-top: 0;
}

@media (min-width: 640px) {
  .expiration-wrapper {
    grid-template-columns: 1fr 1fr;
  }
}

/* Button Group */
.button-group {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;
  margin-top: 1rem;
}

.submit-button,
.cancel-button {
  padding: 1.25rem 2rem;
  border: none;
  border-radius: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.submit-button {
  background: #2563EB;
  color: white;
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

.cancel-button {
  background: white;
  color: #374151;
  border: 2px solid #e5e7eb;
}

.cancel-button:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-2px);
}

.error-message {
  background: #fee2e2;
  color: #dc2626;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.95rem;
  text-align: center;
}

/* MULTIPLE POSITIONS SECTION */
.multiple-positions-section {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.checkbox-input {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #2563EB;
}

.checkbox-text {
  font-size: 1rem;
  font-weight: 500;
  color: #1a1a1a;
}

.positions-config {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Slide fade animation */
.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from {
  transform: translateY(-10px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

.payment-summary {
  background: #eff6ff;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  border: 2px solid #2563EB;
  color: #1e40af;
  font-weight: 600;
  margin-top: 0.5rem;
}

/* Toast Notifications */
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s ease;
}

.toast:hover {
  transform: translateX(-4px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}

.toast-success {
  border-left: 4px solid #10b981;
}

.toast-error {
  border-left: 4px solid #ef4444;
}

.toast-info {
  border-left: 4px solid #3b82f6;
}

.toast-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-success .toast-icon {
  color: #10b981;
}

.toast-error .toast-icon {
  color: #ef4444;
}

.toast-info .toast-icon {
  color: #3b82f6;
}

.toast-message {
  flex: 1;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.4;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #9ca3af;
  font-size: 1.125rem;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.toast-close:hover {
  color: #6b7280;
}

/* Toast Animations */
.toast-enter-active {
  animation: toastSlideIn 0.3s ease;
}

.toast-leave-active {
  animation: toastSlideOut 0.3s ease;
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes toastSlideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
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
  
  .image-preview-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
  
  .button-group {
    grid-template-columns: 1fr;
  }
  
  .toast-container {
    top: 0.5rem;
    right: 0.5rem;
    left: 0.5rem;
  }
  
  .toast {
    min-width: auto;
    max-width: none;
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
    margin-bottom: 1.5rem;
  }

  .form-input,
  .form-textarea {
    padding: 0.875rem;
    font-size: 0.95rem;
  }

  .submit-button,
  .cancel-button {
    padding: 1rem 1.5rem;
  }
  
  .form-label {
    font-size: 1.1rem;
  }

  .section-header {
    font-size: 1rem;
  }
  
  .multiple-positions-section {
    padding: 1rem;
  }
}
</style>