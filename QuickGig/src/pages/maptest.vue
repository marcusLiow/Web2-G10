<template>
  <div class="test-container">
    <h1>Google Maps API Test</h1>
    
    <div class="status">
      <p><strong>API Key:</strong> {{ apiKey ? 'Found ✓' : 'Missing ✗' }}</p>
      <p><strong>Status:</strong> {{ status }}</p>
    </div>

    <div class="map-wrapper">
      <GoogleMap
        v-if="apiKey"
        :api-key="apiKey"
        style="width: 100%; height: 500px;"
        :center="center"
        :zoom="12"
      >
        <Marker :options="{ position: center }" />
      </GoogleMap>
      <div v-else class="error">
        ❌ No API key found. Check your .env file.
      </div>
    </div>

    <div class="controls">
      <h3>Test Geocoding</h3>
      <input 
        v-model="testAddress" 
        placeholder="Enter an address..."
        class="address-input"
      />
      <button @click="testGeocode" class="test-btn">
        Test Geocoding
      </button>
      
      <div v-if="geocodeResult" class="result">
        <p><strong>Result:</strong></p>
        <pre>{{ geocodeResult }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { GoogleMap, Marker } from 'vue3-google-map';

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY; // For displaying map
const geocodingKey = import.meta.env.VITE_GOOGLE_GEOCODING_API_KEY; // For geocoding
const status = ref('Initializing...');
const center = ref({ lat: 1.3521, lng: 103.8198 }); // Singapore
const testAddress = ref('Orchard Road, Singapore');
const geocodeResult = ref(null);

onMounted(() => {
  if (apiKey) {
    status.value = 'API Key loaded! Map should appear below.';
  } else {
    status.value = 'ERROR: No API key found in .env file';
  }
});

const testGeocode = async () => {
  if (!geocodingKey) {
    alert('No geocoding API key found!');
    return;
  }

  geocodeResult.value = 'Loading...';
  
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(testAddress.value)}&key=${geocodingKey}` // Use geocodingKey here
    );
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      center.value = { lat: location.lat, lng: location.lng };
      geocodeResult.value = {
        status: 'SUCCESS',
        address: data.results[0].formatted_address,
        coordinates: location
      };
    } else {
      geocodeResult.value = {
        status: 'FAILED',
        error: data.status,
        message: data.error_message || 'No results found'
      };
    }
  } catch (error) {
    geocodeResult.value = {
      status: 'ERROR',
      message: error.message
    };
  }
};
</script>

<style scoped>
.test-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
  font-family: system-ui, -apple-system, sans-serif;
}

h1 {
  color: #2563eb;
  margin-bottom: 1.5rem;
}

.status {
  background: #f3f4f6;
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.status p {
  margin: 0.5rem 0;
  font-size: 1rem;
}

.map-wrapper {
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  overflow: hidden;
  margin-bottom: 2rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.error {
  padding: 3rem;
  text-align: center;
  background: #fee;
  color: #c00;
  font-size: 1.125rem;
}

.controls {
  background: white;
  padding: 1.5rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
}

.controls h3 {
  margin-top: 0;
  color: #111827;
}

.address-input {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.address-input:focus {
  outline: none;
  border-color: #2563eb;
}

.test-btn {
  padding: 0.75rem 1.5rem;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.test-btn:hover {
  background: #1d4ed8;
}

.result {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.result pre {
  background: #1f2937;
  color: #10b981;
  padding: 1rem;
  border-radius: 0.375rem;
  overflow-x: auto;
  font-size: 0.875rem;
}
</style>