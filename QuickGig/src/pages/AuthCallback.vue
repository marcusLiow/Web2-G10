<template>
  <div class="auth-callback">
    <div class="spinner"></div>
    <p>Processing login...</p>
  </div>
</template>

<script>
import { supabase } from '../supabase/config'
import { useToast } from '../composables/useToast'

export default {
  name: 'AuthCallback',
  setup() {
    const toast = useToast();
    return { toast };
  },
  async mounted() {
    try {
      // Get session after OAuth redirect
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;
      
      if (session) {
        // Check if user exists in users table
        let { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        // If user doesn't exist, create one
        if (userError && userError.code === 'PGRST116') {
          const newUser = {
            id: session.user.id,
            email: session.user.email,
            username: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
            avatar_url: session.user.user_metadata?.avatar_url || null,
            bio: null,
            location: null,
            phone: null
          };
          
          const { data: insertedUser, error: insertError } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();
          
          if (insertError) throw insertError;
          userData = insertedUser;
        } else if (userError) {
          throw userError;
        }
        
        // Store user info in localStorage
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userId', session.user.id);
        localStorage.setItem('userEmail', session.user.email);
        localStorage.setItem('username', userData?.username || session.user.email.split('@')[0]);
        
        if (userData?.avatar_url) {
          localStorage.setItem('avatarUrl', userData.avatar_url);
        }
        
        window.dispatchEvent(new Event('user-logged-in'));
        
        // Redirect to jobs page
        this.$router.push('/jobs');
      } else {
        this.$router.push('/login');
      }
    } catch (error) {
      console.error('Error in auth callback:', error);
      this.toast.error('Error logging in. Please try again.', 'Authentication Error', 8000);
      this.$router.push('/login');
    }
  }
};
</script>

<style scoped>
.auth-callback {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  gap: 1rem;
  background: #f8f9fa;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #e5e7eb;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.auth-callback p {
  font-size: 1.2rem;
  color: #6b7280;
}
</style>