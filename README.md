# Vacation Photo Contest App

A fun family vacation photo contest app that helps families create togetherness during trips by organizing photo contests with categories.

## Features

### Admin/Planner Section
- **Create Contests**: Set up photo contests with location and date (month/year)
- **Manage Categories**: Add and remove photo categories (e.g., Animal, Flora, Architecture, etc.)
- **Add Participants**: Invite family members with email/phone, generate unique login codes
- **Email Notifications**: Automatically sends login codes via email when participants are added
- **Track Status**: Monitor contest status (draft, active, voting, completed)
- **View Results**: See winners and vote counts for each category

### Participant Section
- **Login System**: Simple login code-based authentication
- **Category Overview**: See all categories for the contest
- **Photo Upload**: Upload multiple photos per category during the trip
- **Photo Ranking**: Rank photos within each category (1 = best)
- **Submission Tracking**: See which categories you haven't submitted photos for yet
- **Final Submission**: Submit exactly one photo per category when ready
- **Submission Status**: View who has submitted and who hasn't

### Voting System
- **Automatic Activation**: Voting mode activates when all participants have submitted
- **Anonymous Voting**: Photos are displayed randomly and anonymously
- **One Vote Per Category**: Each participant votes for one photo per category
- **Honorable Mentions**: Vote for both 1st place and 2nd place (honorable mention)
- **Self-Vote Prevention**: Users cannot vote for their own photos (but their photos are still displayed)
- **Results Display**: View winners and vote counts

### Winner Reveal
- **TV-Friendly Presentation**: Fullscreen reveal mode for displaying winners
- **Category-by-Category**: Reveals winners one category at a time
- **All Winners Summary**: Final view showing all winners with photos
- **Collage View**: Beautiful grid of all winning photos

## Getting Started

### Installation

```bash
npm install
```

### Email Configuration

To enable email notifications when participants are added:

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. For Gmail:
   - Go to [Google Account Settings](https://myaccount.google.com/)
   - Enable 2-Step Verification
   - Generate an App Password at [App Passwords](https://myaccount.google.com/apppasswords)
   - Use your Gmail address and the generated App Password

3. Update `.env.local`:
```env
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. For other email providers (SendGrid, Mailgun, etc.), update the transporter configuration in `app/api/send-email/route.ts`

**Note**: If email is not configured, the app will still work but will show the login code to the admin instead of sending an email.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## How to Use

### For Planners/Admins

1. Go to **Admin Dashboard** from the home page
2. Click **"Create New Contest"**
3. Enter the location and date (month/year)
4. Add categories for the contest
5. Add participants (they'll receive login codes via email)
6. Monitor submission status
7. View results once voting is complete
8. Use **Winner Reveal** mode for the final presentation

### For Participants

1. Check your email for your login code
2. Go to **Participant Login** from the home page
3. Enter your login code (received via email)
4. View all categories for your contest
5. Upload photos to each category throughout the trip
6. Rank your photos (1 = best)
7. Submit your best photo for each category when ready
8. Once all participants submit, voting mode activates
9. Vote for your favorite photo in each category (can't vote for your own)
10. View results

## Data Storage

The app currently uses **localStorage** for data persistence. This means:
- Data persists in your browser
- Data is local to each device/browser
- For production use, you'd want to replace this with a proper database

## Technology Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **localStorage** - Data persistence (client-side)
- **Nodemailer** - Email sending

## Mobile Optimizations

- Fully responsive design
- iPhone-optimized with direct camera access
- Touch-friendly interface
- PWA support (can be added to home screen)
- Large, readable text throughout

## Future Enhancements

- SMS notifications when participants are added
- Real database backend (PostgreSQL, MongoDB, etc.)
- User authentication system
- Photo storage (cloud storage like S3, Cloudinary)
- Real-time updates
- Mobile app version
- Social sharing of winners

## License

MIT
