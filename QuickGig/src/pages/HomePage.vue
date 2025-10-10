<template>
  <div id="app">
    <section class="hero">
      <div class="hero-background"></div>
      <div class="container">
        <div class="hero-content">
          <h1 class="hero-title">What do you need help with?</h1>
          
          <div class="search-container">
            <input 
              v-model="searchQuery"
              type="text" 
              class="search-input" 
              placeholder="Search for a service..."
              @keyup.enter="handleSearch"
            />
            <button class="search-button" @click="handleSearch">
              Search
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="community-section">
      <div class="container">
        <div class="community-content">
          <div class="community-text">
            <h2 class="community-title">
              Do you need help with
              <div class="word-container">
                <transition name="slide-fade" mode="out-in">
                  <span :key="currentWord" class="changing-word">{{ currentWord }}</span>
                </transition>
              </div>
              Just request
            </h2>
            <p class="community-description">
              QuickGig connects you with skilled locals in your area who are ready to help with any task. From home repairs to event planning, find the perfect match for your needs.
            </p>
          </div>
          <div class="community-visual">
            <div class="image-placeholder">
              <img src="https://ichef.bbci.co.uk/ace/standard/1008/cpsprodpb/583e/live/9b3811d0-a2ec-11f0-8009-71dc5acedc16.jpg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  data() {
    return {
      searchQuery: '',
      words: ['cleaning', 'assembling', 'building', 'photography', 'repairs', 'organizing', 'delivery', 'design', 'moving', 'gardening'],
      currentWord: 'cleaning',
      wordIndex: 0
    };
  },
  mounted() {
    this.startWordRotation();
  },
  beforeUnmount() {
    if (this.wordInterval) {
      clearInterval(this.wordInterval);
    }
  },
  methods: {
    handleSearch() {
      if (this.searchQuery.trim()) {
        console.log('Searching for:', this.searchQuery);
        alert(`Searching for: ${this.searchQuery}`);
      }
    },
    startWordRotation() {
      this.wordInterval = setInterval(() => {
        this.wordIndex = (this.wordIndex + 1) % this.words.length;
        this.currentWord = this.words[this.wordIndex];
      }, 2500);
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
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.hero {
  position: relative;
  min-height: 400px;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #1a7f64 0%, #2d9c7f 50%, #4db89d 100%);
  z-index: -1;
}

.hero-content {
  width: 100%;
  padding: 4rem 0;
}

.hero-title {
  font-size: 3rem;
  color: white;
  text-align: center;
  margin-bottom: 2.5rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.search-container {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.search-input {
  flex: 1;
  padding: 1.25rem 1.5rem;
  border: none;
  font-size: 1.1rem;
  outline: none;
}

.search-button {
  background: #1a7f64;
  border: none;
  padding: 1.25rem 2rem;
  cursor: pointer;
  transition: background 0.3s;
  color: white;
  font-weight: 600;
  font-size: 1rem;
}

.search-button:hover {
  background: #156d56;
}

.community-section {
  padding: 5rem 0;
  background: white;
}

.community-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.community-text {
  padding-right: 2rem;
}

.community-title {
  font-size: 3.5rem;
  color: #1a1a1a;
  margin-bottom: 1.5rem;
  line-height: 1.3;
  font-weight: 700;
}

.word-container {
  display: inline-block;
  min-width: 280px;
  position: relative;
}

.changing-word {
  color: #ff6b6b;
  display: inline-block;
  font-weight: 700;
}

.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s ease-in;
}

.slide-fade-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

.community-description {
  font-size: 1.2rem;
  color: #666;
  line-height: 1.6;
}

.community-visual {
  position: relative;
}

.image-placeholder {
  width: 100%;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.image-placeholder:hover {
  transform: translateY(-5px);
  box-shadow: 0 15px 50px rgba(0, 0, 0, 0.15);
}

.image-placeholder img {
  width: 100%;
  height: auto;
  display: block;
}

@media (max-width: 968px) {
  .community-content {
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  .community-text {
    padding-right: 0;
    text-align: center;
  }

  .community-title {
    font-size: 2.5rem;
  }

  .word-container {
    min-width: 220px;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }

  .hero-title {
    font-size: 2rem;
  }

  .search-container {
    flex-direction: column;
  }

  .search-button {
    padding: 1rem;
  }

  .community-title {
    font-size: 2rem;
  }

  .word-container {
    min-width: 180px;
  }

  .community-description {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 1.5rem;
  }

  .community-title {
    font-size: 1.75rem;
  }

  .word-container {
    min-width: 150px;
  }
}
</style>