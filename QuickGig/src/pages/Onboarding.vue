<template>
  <div class="role-selection-page">
    <div class="role-container">
      <div class="header">
        <h1 class="title">Welcome to SideQuest!</h1>
        <p class="subtitle">Choose your path to get started</p>
      </div>

      <div class="role-cards">
        <!-- Adventurer Card -->
        <div 
          class="role-card adventurer-card"
          :class="{ selected: selectedRole === 'adventurer' }"
          @click="selectRole('adventurer')"
        >
          <div class="card-icon">⚔️</div>
          <h2 class="card-title">Adventurer</h2>
          <p class="card-description">
            You are here to offer your skills and expertise to earn money
          </p>
        </div>

        <!-- Questor Card -->
        <div 
          class="role-card questor-card"
          :class="{ selected: selectedRole === 'questor' }"
          @click="selectRole('questor')"
        >
          <div class="card-icon">📜</div>
          <h2 class="card-title">Questor</h2>
          <p class="card-description">
            You are here to post tasks and find skilled adventurers to help you
          </p>
        </div>
      </div>

      <button 
        class="back-button" 
        @click="goBack"
      >
        ← Go Back
      </button>

      <p class="switch-note">
        You can switch roles anytime in your profile settings
      </p>
    </div>
  </div>
</template>

<script>
import { useToast } from '../composables/useToast'

export default {
  name: 'RoleSelectionPage',
  setup() {
    const toast = useToast();
    return { toast };
  },
  data() {
    return {
      selectedRole: null,
      isLoading: false
    };
  },
  methods: {
    selectRole(role) {
      this.selectedRole = role;
      this.handleContinue();
    },
    async handleContinue() {
      if (!this.selectedRole) return;

      this.isLoading = true;

      try {
        // Store the selected role temporarily in localStorage
        localStorage.setItem('selectedRole', this.selectedRole);

        // Redirect to signup page with the role stored
        if (this.selectedRole === 'adventurer') {
          this.$router.push('/signup/adventurer');  // Changed
        }
        else{
          this.$router.push('/signup');
        }
      } catch (error) {
        console.error('Error:', error);
        this.toast.error('Something went wrong. Please try again.', 'Error', 8000);
        this.isLoading = false;
      }
    },
    goBack() {
      this.$router.push('/login');
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

.role-selection-page {
  min-height: calc(100vh - 80px);
  max-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 245, 247, 0.9);
  padding: 2rem 1rem;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
}

.role-selection-page::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60vh;
  background-image: url('../assets/signup_bg.gif');
  background-size: cover;
  background-position: center bottom;
  background-repeat: no-repeat;
  z-index: 0;
  pointer-events: none;
}

.role-selection-page::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60vh;
  background: linear-gradient(to bottom, 
    #EFF5F7 0%,
    rgba(239, 245, 247, 0.95) 5%,
    rgba(220, 235, 240, 0.85) 15%,
    rgba(200, 225, 235, 0.6) 30%,
    rgba(173, 216, 230, 0.3) 50%,
    rgba(173, 216, 230, 0) 70%
  );
  z-index: 0;
  pointer-events: none;
}

.role-container {
  width: 100%;
  max-width: 900px;
  position: relative;
  z-index: 1;
}

.header {
  text-align: center;
  margin-bottom: 1.75rem;
}

.title {
  font-size: 4.75rem;
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 0.5rem;
  font-family: 'Jersey10', sans-serif;
}

.subtitle {
  font-size: 1.95rem;
  color: #666;
  font-family: 'Jersey10', sans-serif;
}

.role-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 8.25rem;
}

.role-card {
  background: white;
  border-radius: 20px;
  padding: 2rem 1.75rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 4px solid #e5e7eb;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.role-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: linear-gradient(90deg, #4fb6e1, 0%, #4fb6e1 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.role-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.role-card:hover::before {
  opacity: 1;
}

.role-card.selected {
  border-color: #4fb6e1;
  box-shadow: 0 12px 30px #4fb6e1;
}

.role-card.selected::before {
  opacity: 1;
  height: 8px;
}

.card-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  text-align: center;
}

.card-title {
  font-size: 3rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 0.85rem;
  text-align: center;
  font-family: 'Jersey10', sans-serif;
}

.card-description {
  font-size: 1.2rem;
  color: #4a5568;
  text-align: center;
  line-height: 1.55;
  font-family: 'Jersey10', sans-serif;
}

.back-button {
  width: 100%;
  padding: 0.95rem;
  font-size: 1.65rem;
  font-weight: 600;
  color: #666;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 0.75rem;
  font-family: 'Jersey10', sans-serif;
}

.back-button:hover {
  background: #f9fafb;
  border-color: #eb2825;
  color: #eb2825;
  transform: translateY(-2px);
}

.switch-note {
  text-align: center;
  color: #000000;
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 0.5rem;
  font-family: 'Jersey10', sans-serif;
}

@media (max-width: 768px) {
  .title {
    font-size: 2rem;
  }

  .subtitle {
    font-size: 1rem;
  }

  .role-cards {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .role-card {
    padding: 2rem;
  }

  .card-icon {
    font-size: 3rem;
  }

  .card-title {
    font-size: 1.5rem;
  }
}
</style>