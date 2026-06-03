export type HelpSection = {
  id: string;
  title: string;
  summary?: string;
  paragraphs?: string[];
  steps?: string[];
  tips?: string[];
};

export type HelpGuide = {
  audience: 'admin' | 'participants';
  title: string;
  subtitle: string;
  sections: HelpSection[];
};

export const ADMIN_HELP_GUIDE: HelpGuide = {
  audience: 'admin',
  title: 'Organizer guide',
  subtitle: 'How to run a Photo Hunt from setup through results.',
  sections: [
    {
      id: 'overview',
      title: 'What you are running',
      paragraphs: [
        'Photo Hunt is a group photo contest in four stages: Setup, Photo Collection, Voting, and Results.',
        'You create the contest, invite people with a join code, collect photos by category, let everyone vote once per category, then reveal winners.',
      ],
    },
    {
      id: 'create',
      title: 'Create a contest',
      steps: [
        'From the home page, choose Create or manage a contest (or go to Admin).',
        'Tap + Create New Contest.',
        'Enter a location or event name (this is the contest name participants will see) and the month/year.',
        'Tap Create Contest — you land on the contest admin page in Setup.',
      ],
    },
    {
      id: 'setup',
      title: 'Stage 1 — Setup',
      summary: 'Add categories before anyone can join.',
      steps: [
        'Add categories using Suggested Categories or + Add Custom Category. Each category is a theme (Food, Transportation, Best View, etc.).',
        'Give each category a clear name and optional description so participants know what to photograph.',
        'When your category list looks good, move the contest to Open Photo Collection using the stage stepper.',
      ],
      tips: [
        'You can stay in Setup as long as you need — participants cannot join until Photo Collection starts.',
        'The join code appears only after you leave Setup.',
      ],
    },
    {
      id: 'collection',
      title: 'Stage 2 — Open Photo Collection',
      summary: 'Invite people and let them upload photos.',
      steps: [
        'After moving to Photo Collection, copy the invite message under What to do next (or use the join code shown at the top).',
        'Send that message by text, email, or group chat. It includes your site link and the 4-character join code.',
        'Watch the Participants section: green ✓ Submitted means they locked in their picks; the count shows how many categories they submitted photos for.',
        'When everyone who plans to participate has submitted (or time is up), move the contest to Voting.',
      ],
      tips: [
        'Participants can submit photos for some categories and skip others — they confirm when ready.',
        'After someone submits, they cannot upload more photos for that contest.',
      ],
    },
    {
      id: 'voting',
      title: 'Stage 3 — Voting',
      summary: 'Collection is closed; participants pick one favorite per category.',
      steps: [
        'Move the contest to Voting when photo collection should end.',
        'Copy the voting message under What to do next and send it to your group.',
        'Use the Voting progress bar to see how many participants finished (voted in every category).',
        'Each participant row shows X of Y votes submitted so you can see who still needs to vote.',
        'When voting is complete — or your deadline passes — move the contest to Results.',
      ],
      tips: [
        'Participants cannot vote for their own photo.',
        'They pick one favorite per category; ties for most votes can share a win.',
      ],
    },
    {
      id: 'results',
      title: 'Stage 4 — Results',
      summary: 'Share winners and celebrate.',
      steps: [
        'Move the contest to Results when voting is done.',
        'Copy the results message under What to do next so participants can view winning photos.',
        'Tap View Results for the full scoreboard, or Start Winner Reveal for a TV-friendly slideshow.',
        'Use download links to save all photos, winners only, or individual images (Save to Photos works on phones).',
      ],
      tips: [
        'Categories and add-category buttons are hidden in Results — the focus is on viewing and sharing outcomes.',
        'You can move a stage backward if you need to reopen collection or voting, but confirm carefully with your group first.',
      ],
    },
    {
      id: 'troubleshooting',
      title: 'Quick troubleshooting',
      paragraphs: [
        'Someone cannot join: double-check the join code (4 characters, letters and numbers) and that the contest is in Photo Collection or later.',
        'Someone was logged out: they can log in again — the app keeps them signed in on the same browser until they tap Logout.',
        'Wrong stage: use the stage stepper to move forward or back; read the confirmation text before accepting.',
      ],
    },
  ],
};

export const PARTICIPANT_HELP_GUIDE: HelpGuide = {
  audience: 'participants',
  title: 'Participant guide',
  subtitle: 'How to join, submit photos, vote, and see results.',
  sections: [
    {
      id: 'overview',
      title: 'What you will do',
      paragraphs: [
        'Your organizer runs a Photo Hunt — a themed photo contest with several categories.',
        'You join with a code, upload your best photos, vote for favorites, then see who won.',
        'The app walks you through each stage; you only need to do what is active for your contest right now.',
      ],
    },
    {
      id: 'join',
      title: 'Join a contest',
      steps: [
        'Open the link your organizer sent, or go to the Photo Hunt home page.',
        'Enter the 4-character join code and tap Continue.',
        'Log in if you already have an account, or create one (name, email, password).',
        'After joining, open your contest from the home page under Your Contests.',
      ],
      tips: [
        'If you received a link with the code in it, the code may already be filled in.',
        'You stay logged in on this device until you choose Logout.',
      ],
    },
    {
      id: 'collection',
      title: 'Photo Collection — upload your photos',
      summary: 'Active when your organizer opens photo collection.',
      steps: [
        'Open your contest. Each section is a category with instructions from the organizer.',
        'Tap Take or Choose Photo to upload from your camera or photo library.',
        'If you add more than one photo in a category, use Move Up / Move Down to rank them — the top photo is the one that will be submitted.',
        'You do not need a photo in every category; skip any theme you want.',
        'When you are happy with your choices, turn on Ready to Submit and confirm. This locks your uploads — you cannot change them after.',
      ],
      tips: [
        'Only one photo per category is submitted — your top-ranked photo in that category.',
        'If you only have one photo in a category, you will not see reorder buttons.',
      ],
    },
    {
      id: 'voting',
      title: 'Voting — pick your favorites',
      summary: 'Active after the organizer closes photo collection.',
      steps: [
        'Open your contest when the organizer says voting has started.',
        'For each category, browse the submitted photos in the gallery.',
        'Tap Vote for this photo on your favorite. You get one vote per category.',
        'You can change your vote before moving on — browse again and pick a different photo.',
        'Work through every category until you have voted where you want to.',
      ],
      tips: [
        'You cannot vote for your own photo.',
        'Swipe or use thumbnails to move between photos in a category.',
      ],
    },
    {
      id: 'results',
      title: 'Results — see the winners',
      summary: 'Active after the organizer closes voting.',
      steps: [
        'Open your contest to see full results: winners and all submissions sorted by votes.',
        'Tap Save to Photos on a phone to add an image to your camera roll (choose Save Image in the share menu).',
        'On desktop, use Download for individual photos or zip files.',
      ],
    },
    {
      id: 'troubleshooting',
      title: 'Quick troubleshooting',
      paragraphs: [
        'Invalid code: check with your organizer — codes are 4 characters and only work while the contest is open.',
        'Cannot upload: the contest may have moved to Voting or Results, or you may have already submitted.',
        'Logged out: log in again with the same email and password — your account and contest membership are saved.',
      ],
    },
  ],
};
