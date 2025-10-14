<template>
  <div class="container">
    <div class="card">
      <h1>JobSeeker Sign Up</h1>
      <form>
        <input type="text" placeholder="Username" />
        <input type="password" placeholder="Password" />
        <input type="password" placeholder="Confirm Password" />
        <button type="submit">Sign Up</button>
      </form>
      <p>
        Already have an account?
        <router-link to="/login">Login</router-link>
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: "SignupPage",
};
</script>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background:  #f8f9fa;
}

.card {
  background-color: white;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  width: 90%;
  max-width: 600px;
  text-align: center;
}

h1 {
  margin-bottom: 1.5rem;
  color: #333;
}

form {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}

button {
  padding: 0.6rem;
  background-color: #6c5ce7;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #341f97;
}

p {
  margin-top: 1rem;
  font-size: 0.9rem;
}

router-link {
  color: #6c5ce7;
  font-weight: bold;
  text-decoration: none;
}

router-link:hover {
  text-decoration: underline;
}
</style>