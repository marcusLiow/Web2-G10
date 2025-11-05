<template>
  <div id="app">
    <section class="request-section">
      <div class="container">
        <div class="form-wrapper">
          <h1 class="form-title">What do you need help with?</h1>
          <p class="form-subtitle">Tell us about your task and we'll connect you with the right helper</p>
          
          <form @submit.prevent="handleSubmit" class="request-form">
            <div class="form-group">
              <label for="title" class="form-label">Title<span class="required">*</span></label>
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
              <label for="description" class="form-label">Description<span class="required">*</span></label>
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
              <label for="category" class="form-label">Category<span class="required">*</span></label>
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

            <!-- GOOGLE PLACES AUTOCOMPLETE LOCATION FIELD -->
            <div class="location-section">
              <h3 class="section-header">Location Details<span class="required">*</span></h3>
              
              <div class="form-group">
                <label for="locationSearch" class="form-label">
                  Search Location
                  <span class="label-hint">Address, postal code, or landmark</span>
                </label>
                
                <div class="location-search-wrapper">
                  <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <input 
                    type="text" 
                    id="locationSearch" 
                    ref="locationInput"
                    v-model="locationSearchText"
                    @input="onLocationInput"
                    @focus="showSuggestions = true"
                    @blur="handleBlur"
                    class="form-input location-search-input"
                    :class="{ 'validated': locationValidated, 'has-error': locationError }"
                    placeholder="Start typing an address or postal code..."
                    required
                    autocomplete="off"
                  />
                  <button 
                    v-if="locationSearchText" 
                    type="button" 
                    class="clear-location-btn"
                    @mousedown.prevent="clearLocation"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                
                <!-- Suggestions dropdown -->
                <div v-if="showSuggestions && suggestions.length > 0" class="suggestions-dropdown">
                  <div 
                    v-for="(suggestion, index) in suggestions" 
                    :key="index"
                    class="suggestion-item"
                    @mousedown.prevent="selectSuggestion(suggestion)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <div class="suggestion-text">
                      <div class="suggestion-main">{{ suggestion.structured_formatting.main_text }}</div>
                      <div class="suggestion-secondary">{{ suggestion.structured_formatting.secondary_text }}</div>
                    </div>
                  </div>
                </div>
                
                <!-- Only show helper text if location is not validated or there's an error -->
                <small v-if="!locationValidated || locationError" class="helper-text" :class="{ 'error': locationError }">
                  {{ locationStatus }}
                </small>
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
              <label for="payment" class="form-label">Willing to Pay<span class="required">*</span></label>
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

            <button type="submit" class="submit-button" :disabled="isSubmitting || !locationValidated">
              {{ isSubmitting ? 'Posting...' : 'Post Request' }}
            </button>
            
            <small v-if="!locationValidated" class="submit-hint">
              Please select a valid location to continue
            </small>
          </form>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { supabase } from '../supabase/config'
import { useToast } from '../composables/useToast'

export default {
  name: 'RequestPage',
  setup() {
    const toast = useToast();
    return { toast };
  },
  data() {
    return {
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
      isSubmitting: false,
      submitError: null,
      apiKey: import.meta.env.VITE_GOOGLE_GEOCODING_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      
      // Image upload data
      selectedImages: [],
      isDragging: false,
      imageError: null,
      uploadedImageUrls: [],
      
      // Google Places Autocomplete data
      locationSearchText: '',
      suggestions: [],
      showSuggestions: false,
      autocompleteService: null,
      placesService: null,
      sessionToken: null,
      locationValidated: false,
      locationStatus: 'Start typing to search for a location',
      locationError: false,
      debounceTimer: null
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
        return `Total cost: $${total.toFixed(2)} `;
      } else {
        const perPerson = payment / positions;
        return `Each helper receives: $${perPerson.toFixed(2)} `;
      }
    }
  },
  mounted() {
    this.initGooglePlaces();
  },
  methods: {
    handleMultiplePositionsChange() {
      if (!this.formData.multiple_positions) {
        // Reset to defaults when unchecked
        this.formData.positions_available = 2;
        this.formData.payment_type = 'per_person';
      }
    },
    
    // Initialize Google Places API
    initGooglePlaces() {
      if (!window.google) {
        // Load Google Maps API script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places&region=sg`;
        script.async = true;
        script.defer = true;
        script.onload = () => {
          this.setupPlacesServices();
        };
        script.onerror = () => {
          console.error('Failed to load Google Maps API');
          this.locationStatus = '⚠️ Unable to load location services. Please check your API key.';
          this.locationError = true;
        };
        document.head.appendChild(script);
      } else {
        this.setupPlacesServices();
      }
    },
    
    setupPlacesServices() {
      if (window.google && window.google.maps && window.google.maps.places) {
        this.autocompleteService = new window.google.maps.places.AutocompleteService();
        
        // Create a hidden div for PlacesService (required)
        const div = document.createElement('div');
        this.placesService = new window.google.maps.places.PlacesService(div);
        
        // Create a new session token
        this.sessionToken = new window.google.maps.places.AutocompleteSessionToken();
        
        console.log('Google Places services initialized');
      } else {
        console.error('Google Maps Places library not available');
        this.locationStatus = '⚠️ Location services unavailable';
        this.locationError = true;
      }
    },
    
    onLocationInput() {
      this.locationValidated = false;
      this.locationError = false;
      this.locationStatus = 'Searching...';
      this.showSuggestions = true;
      
      // Clear previous debounce timer
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      
      // Don't search if input is too short
      if (this.locationSearchText.length < 2) {
        this.suggestions = [];
        this.locationStatus = 'Start typing to search for a location';
        return;
      }
      
      // Debounce the API call
      this.debounceTimer = setTimeout(() => {
        this.searchPlaces();
      }, 300);
    },
    
    searchPlaces() {
      if (!this.autocompleteService) {
        console.error('Autocomplete service not initialized');
        return;
      }
      
      const request = {
        input: this.locationSearchText,
        componentRestrictions: { country: 'sg' }, // Restrict to Singapore
        sessionToken: this.sessionToken
      };
      
      this.autocompleteService.getPlacePredictions(request, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          this.suggestions = predictions;
          this.locationStatus = `${predictions.length} location(s) found`;
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          this.suggestions = [];
          this.locationStatus = 'No locations found. Try a different search term.';
        } else {
          console.error('Places API error:', status);
          this.suggestions = [];
          this.locationStatus = '⚠️ Unable to search locations';
        }
      });
    },
    
    handleBlur() {
      // Delay hiding to allow click events to fire
      setTimeout(() => {
        this.showSuggestions = false;
      }, 200);
    },
    
    selectSuggestion(suggestion) {
      this.locationSearchText = suggestion.description;
      this.showSuggestions = false;
      this.locationStatus = 'Retrieving location details...';
      
      // Get place details including geometry
      const request = {
        placeId: suggestion.place_id,
        fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        sessionToken: this.sessionToken
      };
      
      this.placesService.getDetails(request, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          this.extractLocationData(place);
          
          // Create a new session token for the next search
          this.sessionToken = new window.google.maps.places.AutocompleteSessionToken();
        } else {
          console.error('Place details error:', status);
          this.locationStatus = '⚠️ Failed to retrieve location details';
          this.locationError = true;
        }
      });
    },
    
    extractLocationData(place) {
      // Extract postal code from address components
      let postalCode = '';
      if (place.address_components) {
        for (const component of place.address_components) {
          if (component.types.includes('postal_code')) {
            postalCode = component.long_name;
            break;
          }
        }
      }
      
      // Extract coordinates
      if (place.geometry && place.geometry.location) {
        this.coordinates = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        };
      }
      
      // Set form data
      this.formData.location = place.formatted_address || place.name;
      this.formData.postalCode = postalCode;
      
      this.locationValidated = true;
      this.locationError = false;
      this.locationStatus = '✓ Location confirmed';
      
      console.log('Location data extracted:', {
        address: this.formData.location,
        postalCode: this.formData.postalCode,
        coordinates: this.coordinates
      });
    },
    
    clearLocation() {
      this.locationSearchText = '';
      this.formData.location = '';
      this.formData.postalCode = '';
      this.coordinates = null;
      this.suggestions = [];
      this.showSuggestions = false;
      this.locationValidated = false;
      this.locationError = false;
      this.locationStatus = 'Start typing to search for a location';
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
            uploading: false
          });
        };
        reader.readAsDataURL(file);
      });
    },
    
    removeImage(index) {
      this.selectedImages.splice(index, 1);
      this.imageError = null;
    },
    
    // Expiration date handling
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
    
    async uploadImages() {
      const uploadedUrls = [];
      
      for (let i = 0; i < this.selectedImages.length; i++) {
        const imageData = this.selectedImages[i];
        imageData.uploading = true;
        
        try {
          const file = imageData.file;
          const fileExt = file.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${fileName}`;
          
          console.log('Uploading image:', filePath);
          
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
          console.log('Image uploaded successfully:', urlData.publicUrl);
          
        } catch (error) {
          console.error('Error uploading image:', error);
          throw new Error(`Failed to upload image: ${error.message}`);
        } finally {
          imageData.uploading = false;
        }
      }
      
      return uploadedUrls;
    },
    
    async handleSubmit() {
      if (!this.locationValidated) {
        this.submitError = 'Please select a valid location from the suggestions';
        return;
      }
      
      this.isSubmitting = true;
      this.submitError = null;

      try {
        const userId = localStorage.getItem('userId');
        
        // Upload images first if any are selected
        let imageUrls = [];
        if (this.selectedImages.length > 0) {
          console.log('Uploading images...');
          imageUrls = await this.uploadImages();
          console.log('All images uploaded:', imageUrls);
        }
        
        const requestData = {
          title: this.formData.title,
          description: this.formData.description,
          category: this.formData.category,
          postal_code: this.formData.postalCode,
          location: this.formData.location,
          coordinates: this.coordinates,
          payment: parseFloat(this.formData.payment),
          status: 'open',
          user_id: userId,
          images: imageUrls,
          expiration_date: this.formData.expiration_date,
          
          // Save with both naming conventions for compatibility
          multiple_positions: this.formData.multiple_positions,
          requiresMultipleHelpers: this.formData.multiple_positions,  // ✅ ADD THIS
          
          positions_available: this.formData.multiple_positions ? parseInt(this.formData.positions_available) : 1,
          numberOfHelpers: this.formData.multiple_positions ? parseInt(this.formData.positions_available) : 1,  // ✅ ADD THIS
          
          positions_filled: 0,
          payment_type: this.formData.multiple_positions ? this.formData.payment_type : 'per_person'
        };

        console.log('Creating job request with data:', requestData);

        const { data, error } = await supabase
          .from('User-Job-Request')
          .insert([requestData])
          .select();

        if (error) throw error;
        
        console.log('Request created:', data);
        this.toast.success('Job posted successfully!', 'Success', 8000);
        
        this.$router.push('/jobs');
        
      } catch (error) {
        console.error('Error adding request:', error);
        this.submitError = error.message || 'Failed to post request. Please try again.';
      } finally {
        this.isSubmitting = false;
      }
    }
  },
  beforeUnmount() {
    // Clear debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
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
  font-size: 2.75rem;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
  font-weight: 600;
  text-align: center;
}

.form-subtitle {
  font-size: 1.25rem;
  color: #666;
  text-align: center;
  margin-bottom: 3rem;
  line-height: 1.6;
  font-weight: 400;
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
  position: relative;
}

.form-label {
  font-size: 1.125rem;
  font-weight: 500;
  color: #1a1a1a;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.required {
  color: #dc2626;
  margin-left: 0.25rem;
}

.label-hint {
  font-size: 0.875rem;
  font-weight: 400;
  color: #6b7280;
}

.form-input,
.form-textarea {
  padding: 1.125rem 1.25rem;
  font-size: 1.0625rem;
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

@keyframes spin {
  to { transform: rotate(360deg); }
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

/* LOCATION SEARCH STYLES */
.location-section {
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.section-header {
  font-size: 1.25rem;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.location-search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 1rem;
  color: #6b7280;
  pointer-events: none;
  z-index: 1;
}

.location-search-input {
  padding-left: 3rem !important;
  padding-right: 3rem !important;
  width: 100%;
}

.location-search-input.validated {
  border-color: #10b981;
  background-color: #f0fdf4;
}

.location-search-input.has-error {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.clear-location-btn {
  position: absolute;
  right: 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 0.25rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 1;
}

.clear-location-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.suggestions-dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.suggestion-item {
  padding: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;
  border-bottom: 1px solid #f3f4f6;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: #f9fafb;
}

.suggestion-item svg {
  flex-shrink: 0;
  margin-top: 0.25rem;
  color: #2563EB;
}

.suggestion-text {
  flex: 1;
}

.suggestion-main {
  font-weight: 400;
  color: #1a1a1a;
  margin-bottom: 0.25rem;
}

.suggestion-secondary {
  font-size: 0.875rem;
  color: #6b7280;
}

.helper-text {
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.25rem;
  display: block;
}

.helper-text.error {
  color: #dc2626;
  font-weight: 500;
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
  font-weight: 400;
  font-size: 1.25rem;
  margin-top: 0.5rem;
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
    font-size: 2.25rem;
  }

  .form-subtitle {
    font-size: 1.125rem;
    margin-bottom: 2rem;
  }

  .request-form {
    gap: 1.5rem;
  }
  
  .image-preview-grid {
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  }
}

@media (max-width: 480px) {
  .form-wrapper {
    padding: 1.5rem;
    border-radius: 16px;
  }

  .form-title {
    font-size: 1.875rem;
  }

  .form-subtitle {
    font-size: 1rem;
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
  
  .location-section,
  .multiple-positions-section {
    padding: 1rem;
  }
  
  .image-preview-grid {
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 0.75rem;
  }
}
</style>