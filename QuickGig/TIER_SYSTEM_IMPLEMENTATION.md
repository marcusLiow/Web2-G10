# Helper Tier System Implementation

## Overview
A gamified tier system has been implemented for helper users in the ProfilePage. The system rewards helpers based on their monthly earnings with visual progression through different tiers.

## Features Implemented

### 1. Tier Levels
Four tiers are available, each requiring 600 XP to progress:
- **Emerald** (0 - 600 XP) - Entry level
- **Ruby** (600 - 1,200 XP) - Second tier
- **Sapphire** (1,200 - 1,800 XP) - Third tier  
- **Diamond** (1,800+ XP) - Maximum tier

### 2. XP Calculation
- XP is calculated based on monthly earnings from the `Earnings` table
- Formula: **$1 = 1 XP**
- Only earnings for the current month are counted
- Uses `net_amount` field from the Earnings table
- Only users with a profile in `helper_profiles` can earn XP

### 3. Visual Display
The tier section appears between the profile header and stats grid, displaying:
- **Tier Badge**: PNG image representing current tier (emerald.png, ruby.png, sapphire.png, diamond.png)
- **Tier Name**: Current tier level
- **Current XP / Next Tier XP**: Progress tracker
- **Progress Bar**: Visual representation of progress to next tier
- **XP to Next**: Shows how much XP needed to reach the next tier

### 4. Design
- Beautiful gradient background (purple gradient)
- Responsive design for mobile and desktop
- Smooth progress bar animation
- Drop shadow effects on tier images
- Glass-morphism effect on XP display

## Technical Implementation

### Database Integration
```javascript
// Checks if user is a helper
supabase.from('helper_profiles').select('user_id').eq('user_id', uid)

// Fetches monthly earnings
supabase.from('Earnings')
  .select('net_amount')
  .eq('user_id', uid)
  .gte('created_at', firstDayOfMonth)
```

### Key Functions
- `calculateTierInfo(uid)` - Calculates XP, determines tier, and updates tier display
- Called automatically when profile loads in `loadAll()`

### Data Structure
```javascript
tierInfo = {
  isHelper: boolean,
  currentXP: number,
  name: string,
  image: string,
  progress: number (0-100),
  nextTier: string,
  nextTierXP: number,
  xpToNext: number
}
```

## Display Conditions
The tier section only displays when:
1. `user.is_helper` is true (user is registered as a helper)
2. `tierInfo.isHelper` is true (user exists in helper_profiles table)

## Files Modified
- `src/pages/ProfilePage.vue` - Added tier section, calculation logic, and styling

## Assets Used
- `/src/assets/emerald.png`
- `/src/assets/ruby.png`
- `/src/assets/sapphire.png`
- `/src/assets/diamond.png`

## User Experience
1. Helpers log in and navigate to their profile
2. If they are a helper (have helper_profile), they see their tier badge above the stats
3. The progress bar shows visual progress toward the next tier
4. XP resets at the beginning of each month, encouraging consistent earnings
5. Reaching Diamond tier (1,800+ XP) shows max tier status

## Future Enhancements (Optional)
- Add tier history tracking
- Implement rewards/perks for each tier
- Add tier achievement notifications
- Display all-time highest tier achieved
- Add leaderboard for top earners
