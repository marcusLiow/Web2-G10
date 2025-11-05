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
      
      console.log('🔍 Full session object:', session);
      console.log('🔍 User metadata:', session?.user?.user_metadata);
      
      if (error) throw error;
      
      if (session) {
        // Extract username from Google metadata or email
        const googleName = session.user.user_metadata?.full_name || 
                          session.user.user_metadata?.name ||
                          session.user.email?.split('@')[0] || 
                          'User';
        
        const googleAvatar = session.user.user_metadata?.avatar_url || 
                            session.user.user_metadata?.picture || 
                            null;
        
        console.log('📝 Extracted googleName:', googleName);
        console.log('📝 Extracted googleAvatar:', googleAvatar);
        
        // Check if user exists in users table
        let { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        console.log('👤 User data from database:', userData);
        console.log('❌ User error:', userError);
        
        // If user doesn't exist, create one
        if (userError && userError.code === 'PGRST116') {
          console.log('✨ Creating new user...');
          const newUser = {
            id: session.user.id,
            email: session.user.email,
            username: googleName,
            avatar_url: googleAvatar,
            bio: null,
            location: null,
            phone: null
          };
          
          console.log('📦 New user object:', newUser);
          
          const { data: insertedUser, error: insertError } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .single();
          
          if (insertError) {
            console.error('❌ Insert error:', insertError);
            throw insertError;
          }
          console.log('✅ User created:', insertedUser);
          userData = insertedUser;
        } else if (userError) {
          throw userError;
        }
        
        // Store user info in localStorage
        const usernameToStore = userData.username || googleName;
        const avatarToStore = userData.avatar_url || googleAvatar || '';
        
        console.log('💾 Storing in localStorage:');
        console.log('  - username:', usernameToStore);
        console.log('  - avatar:', avatarToStore);
        
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userId', session.user.id);
        localStorage.setItem('userEmail', session.user.email || '');
        localStorage.setItem('username', usernameToStore);
        localStorage.setItem('avatarUrl', avatarToStore);
        
        console.log('✅ LocalStorage set. Dispatching event...');
        window.dispatchEvent(new Event('user-logged-in'));
        
        // Redirect to jobs page
        this.$router.push('/jobs');
      } else {
        this.$router.push('/login');
      }
    } catch (error) {
      console.error('❌ Error in auth callback:', error);
      this.toast.error('Error logging in. Please try again.', 'Authentication Error', 8000);
      this.$router.push('/login');
    }
  }
};
</script>