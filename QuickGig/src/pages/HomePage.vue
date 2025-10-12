<template>
  <div id="app">
    <!-- Title Section -->
    <section class="title-section">
      <div class="container">
        <div class="title-content">
          <div class="title-text">
            <h1 class="main-title">
              Do you need help with<br>
              <div class="word-container">
                <transition name="slide-fade" mode="out-in">
                  <span :key="currentWord" class="changing-word">{{ currentWord }}</span>
                </transition>
              </div>
              Just <span class="request-link" @click="navigateToLogin">request</span>
            </h1>
            <p class="main-description">
              QuickGig connects you with skilled locals in your area who are ready to help with any task. 
              From home repairs to event planning, find the perfect match for your needs.
            </p>
          </div>
          <div class="title-image">
            <div class="reviews-container">
              <div class="review-card">
                <div class="stars">
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                </div>
                <p class="review-text">"Found someone to fix my sink in minutes! The whole process was so smooth and easy."</p>
                <p class="reviewer-name">- Sarah M.</p>
              </div>
              
              <div class="review-card">
                <div class="stars">
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                </div>
                <p class="review-text">"Amazing service! The photographer was professional and delivered exactly what I needed."</p>
                <p class="reviewer-name">- James L.</p>
              </div>
              
              <div class="review-card">
                <div class="stars">
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                  <span class="star">★</span>
                </div>
                <p class="review-text">"Best decision ever! Got my furniture assembled quickly and the helper was super friendly."</p>
                <p class="reviewer-name">- Maria K.</p>
              </div>
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

    <!-- Secure Payments Section -->
    <section class="secure-payments-section">
      <div class="container">
        <div class="secure-content">
          <p class="secure-label">SECURE PAYMENTS</p>
          <h2 class="secure-title">Safe payments, every time</h2>
          <p class="secure-description">
            All payments are held securely until you confirm the job is complete. Browse verified profiles, check ratings, and choose helpers with confidence knowing your money is protected.
          </p>
          <img src="https://www.eposhybrid.uk/ihybridnew//upload/ck/2035148938.png" alt="Powered by Stripe" class="stripe-badge-image">
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
    },
    navigateToLogin() {
      // Replace with your actual login/signup route
      window.location.href = '/login';
      // Or if using Vue Router: this.$router.push('/login');
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
}

.title-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
}

.title-text {
  text-align: left;
}

.main-title {
  font-size: 5rem;
  color: #1a1a1a;
  margin-bottom: 1.5rem;
  line-height: 1.2;
  font-weight: 700;
}

.word-container {
  display: block;
  min-height: 1.2em;
}

.changing-word {
  color: #2563EB;
  display: inline-block;
  font-weight: 700;
}

.request-link {
  color: #2563EB;
  cursor: pointer;
  text-decoration: underline;
  font-weight: 700;
  transition: all 0.3s ease;
}

.request-link:hover {
  color: #1d4ed8;
  text-decoration: none;
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
  max-width: 600px;
}

.title-image {
  display: flex;
  justify-content: center;
  align-items: center;
}

.reviews-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
}

.review-card {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.review-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.stars {
  margin-bottom: 0.75rem;
  display: flex;
  gap: 0.25rem;
}

.star {
  color: #FFA500;
  font-size: 1.3rem;
}

.review-text {
  font-size: 1rem;
  color: #333;
  line-height: 1.6;
  margin-bottom: 0.75rem;
  font-style: italic;
}

.reviewer-name {
  font-size: 0.9rem;
  color: #2563EB;
  font-weight: 600;
}


/* How It Works Section */
.how-it-works-section {
  padding: 5rem 0;
  background: #f8f9fa;
}

.section-title {
  font-size: 2.5rem;
  color: #2563EB;
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
  border: 4px solid #2563EB;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 700;
  color: #2563EB;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
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

/* Secure Payments Section */
.secure-payments-section {
  padding: 5rem 0;
  background: #1a1a1a;
  color: white;
}

.secure-content {
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.secure-label {
  font-size: 0.9rem;
  color: #10b981;
  font-weight: 600;
  letter-spacing: 2px;
  margin-bottom: 1rem;
}

.secure-title {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1.5rem;
  line-height: 1.2;
}

.secure-description {
  font-size: 1.1rem;
  line-height: 1.6;
  color: #d1d5db;
  margin-bottom: 2rem;
}

.stripe-badge-image {
  max-width: 220px;
  height: auto;
}

/* Responsive Design */
@media (max-width: 968px) {
  .title-content {
    grid-template-columns: 1fr;
    gap: 3rem;
  }

  .title-text {
    text-align: center;
  }

  .main-title {
    font-size: 3.5rem;
  }

  .main-description {
    margin: 0 auto;
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
    font-size: 2.5rem;
  }

  .main-description {
    font-size: 1rem;
  }

  .reviews-container {
    margin-top: 2rem;
  }

  .secure-title {
    font-size: 2.5rem;
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
    font-size: 2rem;
  }

  .review-card {
    padding: 1.25rem;
  }

  .review-text {
    font-size: 0.9rem;
  }

  .secure-description {
    font-size: 1rem;
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