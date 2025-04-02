# UI/UX Design System for Worker Hiring Application

## Color Palette

### Primary Colors
- Primary Blue: #4A80F0 - Main brand color, used for primary buttons, key UI elements
- Primary Dark Blue: #2D5BDB - Used for hover states, accents
- Primary Light Blue: #7AA1F7 - Used for backgrounds, secondary elements

### Secondary Colors
- Secondary Green: #36B37E - Success states, positive actions
- Secondary Red: #FF5630 - Error states, alerts, warnings
- Secondary Yellow: #FFAB00 - Notifications, highlights

### Neutral Colors
- Dark Gray: #172B4D - Primary text
- Medium Gray: #6B778C - Secondary text
- Light Gray: #DFE1E6 - Borders, dividers
- Extra Light Gray: #F4F5F7 - Backgrounds
- White: #FFFFFF - Card backgrounds, content areas

## Typography

### Font Families
- Primary Font: 'SF Pro Display' (iOS) / 'Roboto' (Android)
- Secondary Font: 'SF Pro Text' (iOS) / 'Roboto' (Android)

### Font Sizes
- Heading 1: 28px (Bold)
- Heading 2: 24px (Bold)
- Heading 3: 20px (Bold)
- Heading 4: 18px (Medium)
- Body Large: 16px (Regular)
- Body: 14px (Regular)
- Caption: 12px (Regular)
- Small: 10px (Regular)

### Line Heights
- Heading: 1.3
- Body: 1.5
- Caption: 1.4

## Spacing System

Using 8-point grid system:
- Tiny: 4px
- Small: 8px
- Medium: 16px
- Large: 24px
- Extra Large: 32px
- 2XL: 40px
- 3XL: 48px
- 4XL: 64px

## UI Components

### Buttons
- Primary Button: Filled with Primary Blue, rounded corners (8px)
- Secondary Button: Outlined with Primary Blue, transparent background
- Tertiary Button: Text only, no background or border
- Disabled Button: Light Gray background, Medium Gray text

### Input Fields
- Text Input: Light border, rounded corners (8px)
- Dropdown: Light border, rounded corners with dropdown icon
- Checkbox: Custom design with Primary Blue for checked state
- Radio Button: Custom design with Primary Blue for selected state
- Toggle Switch: Sliding toggle with Primary Blue for active state

### Cards
- Standard Card: White background, subtle shadow, rounded corners (12px)
- Service Card: White background, image at top, content below
- Profile Card: White background, avatar, name, rating, key info

### Navigation
- Bottom Tab Bar: White background, icons with labels
- Top Navigation Bar: White background, title centered, actions on right
- Drawer Navigation: Slide-in menu from left with user info at top

### Status Indicators
- Success: Secondary Green
- Error: Secondary Red
- Warning: Secondary Yellow
- Info: Primary Light Blue
- Progress: Primary Blue

## Iconography
- Line style icons with 2px stroke
- Consistent 24x24px sizing for navigation
- Smaller 16x16px for inline use

## Animations & Transitions
- Subtle fade transitions between screens (300ms)
- Button press feedback (scale down slightly)
- Smooth loading states with skeleton screens
- Pull-to-refresh with custom animation

## Accessibility
- High contrast between text and backgrounds
- Touch targets minimum 44x44px
- Support for dynamic text sizing
- Voice-over/TalkBack compatible components

## Dark Mode
- Dark Background: #121212
- Surface: #1E1E1E
- Primary Dark Mode Blue: #5B8DF6
- Text on Dark: #FFFFFF (primary), #AAAAAA (secondary)

## Screen-Specific Guidelines

### Onboarding & Authentication
- Clean, minimal design with focus on key actions
- Large, clear CTAs
- Progressive disclosure of information
- Visual indicators for multi-step processes

### Home & Discovery
- Card-based layout for browsing services
- Quick filters at top
- Search prominently displayed
- Pull-to-refresh for content updates

### Profile Screens
- Visual hierarchy emphasizing key information
- Clear sections for different types of content
- Actionable elements clearly distinguished
- Edit mode with inline validation

### Booking Flow
- Step indicators for multi-stage process
- Summary information always visible
- Clear pricing breakdown
- Prominent CTAs for next steps

### Messaging
- Conversation bubbles with clear sender/receiver distinction
- Timestamp and read indicators
- Attachment previews
- Quick action buttons

### Reviews & Ratings
- Star visualization for ratings
- Progress bars for rating breakdowns
- Verified badge for authentic reviews
- Helpful sorting and filtering options
