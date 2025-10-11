<template>
  <div id="app">
    <!-- Main Title Section -->
    <section class="title-section">
      <div class="container">
        <div class="title-content">
          <div class="title-text">
            <h1 class="main-title">
              Do you need help<br>
              <div class="second-line">
                <span class="with-text">with </span>
                <div class="word-container">
                  <transition name="slide-fade" mode="out-in">
                    <span :key="currentWord" class="changing-word">{{ currentWord }}</span>
                  </transition>
                </div>
              </div>
            </h1>
            <p class="main-description">
              QuickGig connects you with skilled locals in your area who are ready to help with any task. 
              From home repairs to event planning, find the perfect match for your needs.
            </p>
          </div>
          <div class="title-image">
            <!-- Space reserved for your image -->
            <div class="image-placeholder">
              Your image here
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works-section">
      <div class="container">
        <h2 class="section-title">How It Works</h2>
        <p class="section-subtitle">The process is easy!</p>
        
        <div class="steps-grid">
          <div class="step-card">
            <div class="step-number">1</div>
            <div class="step-image">
              <img src="https://www.reuters.com/resizer/v2/ZA4VDDIHVJMDHKFQZDTQGY5FLQ.jpg?auth=fcc8692434f2e20349dcd96036b2c6ff745c2a0e31480e8641e6a0886e34c54c&width=2965&quality=80" alt="Post a request" />
            </div>
            <h3 class="step-title">Post a Request</h3>
            <p class="step-description">Let others know in detail what you need done!</p>
          </div>

          <div class="step-card">
            <div class="step-number">2</div>
            <div class="step-image">
              <img src="https://www.reuters.com/resizer/v2/ZA4VDDIHVJMDHKFQZDTQGY5FLQ.jpg?auth=fcc8692434f2e20349dcd96036b2c6ff745c2a0e31480e8641e6a0886e34c54c&width=2965&quality=80" alt="Choose helper" />
            </div>
            <h3 class="step-title">Choose the Helper</h3>
            <p class="step-description">Receive offers within seconds and look at their reviews to see who's best.</p>
          </div>

          <div class="step-card">
            <div class="step-number">3</div>
            <div class="step-image">
              <img src="https://www.reuters.com/resizer/v2/ZA4VDDIHVJMDHKFQZDTQGY5FLQ.jpg?auth=fcc8692434f2e20349dcd96036b2c6ff745c2a0e31480e8641e6a0886e34c54c&width=2965&quality=80" alt="Pay safely" />
            </div>
            <h3 class="step-title">Pay Safely</h3>
            <p class="step-description">Only release your payment once the request is done to your satisfaction.</p>
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

/* Title Section */
.title-section {
  padding: 5rem 0 3rem;
  background: white;
  text-align: center;
}

.main-title {
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

.main-description {
  font-size: 1.2rem;
  color: #666;
  line-height: 1.6;
  max-width: 800px;
  margin: 0 auto;
}

/* How It Works Section */
.how-it-works-section {
  padding: 5rem 0;
  background: #f8f9fa;
}

.section-title {
  font-size: 2.5rem;
  color: #e85d75;
  text-align: center;
  margin-bottom: 0.5rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.section-subtitle {
  font-size: 2rem;
  color: #1a1a1a;
  text-align: center;
  margin-bottom: 4rem;
  font-weight: 700;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3rem;
  max-width: 1100px;
  margin: 0 auto;
}

.step-card {
  background: white;
  border-radius: 20px;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
}

.step-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
}

.step-number {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 60px;
  background: white;
  border: 4px solid #e85d75;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
  color: #e85d75;
  box-shadow: 0 4px 12px rgba(232, 93, 117, 0.2);
}

.step-image {
  width: 100%;
  height: 250px;
  border-radius: 16px;
  overflow: hidden;
  margin: 2rem 0 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.step-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.step-title {
  font-size: 1.5rem;
  color: #1a1a1a;
  margin-bottom: 0.75rem;
  font-weight: 700;
}

.step-description {
  font-size: 1rem;
  color: #666;
  line-height: 1.6;
}

/* Responsive Design */
@media (max-width: 968px) {
  .main-title {
    font-size: 2.5rem;
  }

  .word-container {
    min-width: 220px;
  }

  .steps-grid {
    grid-template-columns: 1fr;
    gap: 4rem;
  }

  .step-card {
    max-width: 500px;
    margin: 0 auto;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }

  .title-section {
    padding: 3rem 0 2rem;
  }

  .main-title {
    font-size: 2rem;
  }

  .word-container {
    min-width: 180px;
  }

  .main-description {
    font-size: 1rem;
  }

  .section-title {
    font-size: 2rem;
  }

  .section-subtitle {
    font-size: 1.5rem;
    margin-bottom: 3rem;
  }

  .step-image {
    height: 200px;
  }
}

@media (max-width: 480px) {
  .main-title {
    font-size: 1.75rem;
  }

  .word-container {
    min-width: 150px;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .section-subtitle {
    font-size: 1.25rem;
  }

  .step-number {
    width: 50px;
    height: 50px;
    font-size: 1.5rem;
  }

  .step-title {
    font-size: 1.25rem;
  }

  .step-description {
    font-size: 0.95rem;
  }
}
</style>

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
  min-height: 600px;
  display: flex;
  align-items: center;
  overflow: hidden;
  padding: 4rem 0;
}

.hero-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #e85d75 0%, #ef7d8e 50%, #f59aa8 100%);
  z-index: -1;
}

.hero-content {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.hero-text {
  max-width: 600px;
}

.hero-title {
  font-size: 3.5rem;
  color: white;
  margin-bottom: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.hero-subtitle {
  font-size: 1.2rem;
  color: white;
  margin-bottom: 2.5rem;
  line-height: 1.6;
  opacity: 0.95;
}

.search-container {
  max-width: 100%;
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
  font-size: 1rem;
  outline: none;
}

.search-button {
  background: #e85d75;
  border: none;
  padding: 1.25rem 2.5rem;
  cursor: pointer;
  transition: background 0.3s;
  color: white;
  font-weight: 600;
  font-size: 1rem;
}

.search-button:hover {
  background: #d64961;
}

/* Floating Cards */
.hero-cards {
  position: relative;
  height: 500px;
}

.floating-card {
  position: absolute;
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  animation: float 3s ease-in-out infinite;
}

.card-1 {
  top: 0;
  right: 20%;
  display: flex;
  align-items: center;
  gap: 1rem;
  animation-delay: 0s;
}

.card-2 {
  top: 30%;
  right: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  animation-delay: 0.5s;
}

.card-3 {
  bottom: 25%;
  right: 15%;
  max-width: 280px;
  animation-delay: 1s;
}

.card-4 {
  bottom: 0;
  right: 35%;
  animation-delay: 1.5s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.card-icon {
  font-size: 2rem;
}

.card-content {
  text-align: left;
}

.card-label {
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.25rem;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #e85d75;
}

.stars {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.rating {
  font-size: 1.25rem;
  font-weight: 700;
  color: #e85d75;
  margin-bottom: 0.5rem;
}

.review-text {
  font-size: 0.95rem;
  color: #666;
  font-style: italic;
}

.helper-badge {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.helper-icon {
  width: 50px;
  height: 50px;
  background: #e85d75;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.helper-info {
  text-align: left;
}

.helper-name {
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 0.25rem;
}

.helper-location {
  font-size: 0.9rem;
  color: #666;
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

/* How It Works Section */
.how-it-works {
  width: 100%;
}

.section-title {
  font-size: 2rem;
  color: #e85d75;
  text-align: center;
  margin-bottom: 2rem;
  font-weight: 700;
}

.carousel {
  position: relative;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.carousel-wrapper {
  position: relative;
  width: 100%;
  height: 400px;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.slide-card {
  position: relative;
  width: 100%;
  height: 100%;
}

.slide-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.slide-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.5) 70%, transparent 100%);
  padding: 2.5rem 2rem 2rem;
  color: white;
  text-align: center;
}

.slide-number {
  width: 50px;
  height: 50px;
  background: #1a7f64;
  color: white;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.slide-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.slide-description {
  font-size: 1.1rem;
  line-height: 1.5;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  opacity: 0.95;
}

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(26, 127, 100, 0.9);
  color: white;
  border: none;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  font-size: 2rem;
  cursor: pointer;
  z-index: 10;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.carousel-arrow:hover {
  background: rgba(21, 109, 86, 0.95);
  transform: translateY(-50%) scale(1.15);
}

.carousel-arrow.left {
  left: -60px;
}

.carousel-arrow.right {
  right: -60px;
}

.carousel-indicators {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ddd;
  cursor: pointer;
  transition: all 0.3s ease;
}

.indicator.active {
  background: #1a7f64;
  width: 30px;
  border-radius: 5px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 968px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .hero-cards {
    height: 300px;
    margin-top: 2rem;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .floating-card {
    font-size: 0.9rem;
    padding: 1rem;
  }

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

  .carousel-arrow.left {
    left: 10px;
  }

  .carousel-arrow.right {
    right: 10px;
  }

  .carousel-wrapper {
    height: 350px;
  }

  .carousel-indicators {
    bottom: 15px;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }

  .hero {
    min-height: 500px;
    padding: 3rem 0;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 0.95rem;
    margin-bottom: 2rem;
  }

  .search-container {
    flex-direction: column;
  }

  .search-button {
    padding: 1rem;
  }

  .hero-cards {
    display: none;
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

  .carousel-content {
    padding: 1.5rem;
    min-height: 350px;
  }

  .slide img {
    max-width: 250px;
  }

  .carousel-wrapper {
    height: 300px;
  }

  .carousel-indicators {
    bottom: 12px;
  }

  .carousel-arrow {
    width: 38px;
    height: 38px;
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .hero {
    min-height: 450px;
    padding: 2rem 0;
  }

  .hero-title {
    font-size: 1.75rem;
  }

  .hero-subtitle {
    font-size: 0.9rem;
  }

  .community-title {
    font-size: 1.75rem;
  }

  .word-container {
    min-width: 150px;
  }

  .carousel-arrow {
    width: 35px;
    height: 35px;
    font-size: 1.4rem;
  }

  .carousel-arrow.left {
    left: 8px;
  }

  .carousel-arrow.right {
    right: 8px;
  }

  .carousel-indicators {
    bottom: 10px;
  }

  .section-title {
    font-size: 1.5rem;
  }
}
</style>