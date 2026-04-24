require('dotenv').config({ path: '../../.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ai_productivity_hub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../models/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);
    console.log('Schema created successfully');

    // Clear existing data
    await pool.query('TRUNCATE users, bookmarks, files, passwords, screen_time, focus_sessions, ai_analysis_history, user_settings, notifications, audit_logs, feedback, contact_messages RESTART IDENTITY CASCADE');
    console.log('Existing data cleared');

    // Create demo user (admin)
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const userResult = await pool.query(
      `INSERT INTO users (email, password, name, email_verified, is_admin, onboarding_completed, avatar_url, bio, phone, timezone, language)
       VALUES ($1, $2, $3, TRUE, TRUE, TRUE, $4, $5, $6, $7, $8) RETURNING id`,
      ['demo@example.com', hashedPassword, 'Demo User', 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo', 'Productivity enthusiast and tech lover. Always looking for ways to optimize my workflow.', '+1-555-0123', 'America/New_York', 'en']
    );
    const userId = userResult.rows[0].id;
    console.log('Demo user created');

    // Create second user
    const hashedPassword2 = await bcrypt.hash('test123', 10);
    const user2Result = await pool.query(
      `INSERT INTO users (email, password, name, email_verified, is_admin, onboarding_completed)
       VALUES ($1, $2, $3, TRUE, FALSE, FALSE) RETURNING id`,
      ['test@example.com', hashedPassword2, 'Test User']
    );
    const userId2 = user2Result.rows[0].id;

    // Create user settings
    await pool.query(
      `INSERT INTO user_settings (user_id, theme, notifications_enabled, email_notifications, sound_enabled, compact_view, items_per_page, keyboard_shortcuts, auto_categorize, default_focus_duration, default_break_duration)
       VALUES ($1, 'dark', TRUE, TRUE, TRUE, FALSE, 10, TRUE, TRUE, 25, 5)`,
      [userId]
    );
    await pool.query('INSERT INTO user_settings (user_id) VALUES ($1)', [userId2]);
    console.log('User settings created');

    // Seed Bookmarks (20 items)
    const bookmarks = [
      { title: 'GitHub', url: 'https://github.com', description: 'Code hosting platform for version control and collaboration', category: 'Technology', tags: ['code', 'git', 'development'] },
      { title: 'Stack Overflow', url: 'https://stackoverflow.com', description: 'Developer Q&A community for programming questions', category: 'Technology', tags: ['programming', 'qa', 'help'] },
      { title: 'Medium', url: 'https://medium.com', description: 'Online publishing platform for articles and stories', category: 'Education', tags: ['articles', 'blog', 'reading'] },
      { title: 'YouTube', url: 'https://youtube.com', description: 'Video sharing and streaming platform', category: 'Entertainment', tags: ['video', 'streaming', 'music'] },
      { title: 'Twitter', url: 'https://twitter.com', description: 'Social microblogging platform', category: 'Social', tags: ['social', 'news', 'updates'] },
      { title: 'LinkedIn', url: 'https://linkedin.com', description: 'Professional networking platform', category: 'Business', tags: ['jobs', 'networking', 'career'] },
      { title: 'Amazon', url: 'https://amazon.com', description: 'Online shopping marketplace', category: 'Shopping', tags: ['shopping', 'ecommerce', 'retail'] },
      { title: 'Netflix', url: 'https://netflix.com', description: 'Movies and TV streaming service', category: 'Entertainment', tags: ['movies', 'tv', 'streaming'] },
      { title: 'Coursera', url: 'https://coursera.org', description: 'Online learning platform with university courses', category: 'Education', tags: ['learning', 'courses', 'education'] },
      { title: 'Reddit', url: 'https://reddit.com', description: 'Social news aggregation and discussion', category: 'Social', tags: ['forums', 'community', 'news'] },
      { title: 'Hacker News', url: 'https://news.ycombinator.com', description: 'Technology and startup news', category: 'Technology', tags: ['tech', 'startup', 'news'] },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', description: 'Web development documentation and reference', category: 'Technology', tags: ['web', 'documentation', 'reference'] },
      { title: 'NPM', url: 'https://npmjs.com', description: 'JavaScript package registry', category: 'Technology', tags: ['nodejs', 'packages', 'javascript'] },
      { title: 'Spotify', url: 'https://spotify.com', description: 'Music and podcast streaming service', category: 'Entertainment', tags: ['music', 'streaming', 'audio'] },
      { title: 'Notion', url: 'https://notion.so', description: 'All-in-one productivity workspace', category: 'Business', tags: ['productivity', 'notes', 'organization'] },
      { title: 'Figma', url: 'https://figma.com', description: 'Design collaboration and prototyping tool', category: 'Technology', tags: ['design', 'ui', 'collaboration'] },
      { title: 'Khan Academy', url: 'https://khanacademy.org', description: 'Free online education platform', category: 'Education', tags: ['learning', 'free', 'math'] },
      { title: 'Vercel', url: 'https://vercel.com', description: 'Frontend deployment and hosting platform', category: 'Technology', tags: ['hosting', 'deployment', 'frontend'] },
      { title: 'Dribbble', url: 'https://dribbble.com', description: 'Designer portfolio and showcase platform', category: 'Design', tags: ['design', 'portfolio', 'inspiration'] },
      { title: 'Product Hunt', url: 'https://producthunt.com', description: 'Platform for discovering new tech products', category: 'Technology', tags: ['products', 'startup', 'launch'] }
    ];

    for (const bookmark of bookmarks) {
      await pool.query(
        'INSERT INTO bookmarks (user_id, title, url, description, category, tags) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, bookmark.title, bookmark.url, bookmark.description, bookmark.category, bookmark.tags]
      );
    }
    console.log(`Seeded ${bookmarks.length} bookmarks`);

    // Seed Files (20 items)
    const files = [
      { filename: 'project_report.docx', filepath: '/Documents/Work/project_report.docx', extension: 'docx', size_bytes: 245760, current_folder: '/Documents/Work' },
      { filename: 'vacation_photo.jpg', filepath: '/Downloads/vacation_photo.jpg', extension: 'jpg', size_bytes: 3145728, current_folder: '/Downloads' },
      { filename: 'budget_2024.xlsx', filepath: '/Desktop/budget_2024.xlsx', extension: 'xlsx', size_bytes: 102400, current_folder: '/Desktop' },
      { filename: 'presentation.pptx', filepath: '/Downloads/presentation.pptx', extension: 'pptx', size_bytes: 5242880, current_folder: '/Downloads' },
      { filename: 'music_track.mp3', filepath: '/Desktop/music_track.mp3', extension: 'mp3', size_bytes: 8388608, current_folder: '/Desktop' },
      { filename: 'screenshot_001.png', filepath: '/Downloads/screenshot_001.png', extension: 'png', size_bytes: 524288, current_folder: '/Downloads' },
      { filename: 'video_clip.mp4', filepath: '/Downloads/video_clip.mp4', extension: 'mp4', size_bytes: 52428800, current_folder: '/Downloads' },
      { filename: 'notes.txt', filepath: '/Desktop/notes.txt', extension: 'txt', size_bytes: 2048, current_folder: '/Desktop' },
      { filename: 'backup.zip', filepath: '/Downloads/backup.zip', extension: 'zip', size_bytes: 104857600, current_folder: '/Downloads' },
      { filename: 'invoice_march.pdf', filepath: '/Documents/Finance/invoice_march.pdf', extension: 'pdf', size_bytes: 153600, current_folder: '/Documents/Finance' },
      { filename: 'app_code.js', filepath: '/Projects/app/app_code.js', extension: 'js', size_bytes: 15360, current_folder: '/Projects/app' },
      { filename: 'styles.css', filepath: '/Downloads/styles.css', extension: 'css', size_bytes: 8192, current_folder: '/Downloads' },
      { filename: 'database.sql', filepath: '/Desktop/database.sql', extension: 'sql', size_bytes: 20480, current_folder: '/Desktop' },
      { filename: 'readme.md', filepath: '/Projects/readme.md', extension: 'md', size_bytes: 4096, current_folder: '/Projects' },
      { filename: 'config.json', filepath: '/Downloads/config.json', extension: 'json', size_bytes: 1024, current_folder: '/Downloads' },
      { filename: 'family_photo.heic', filepath: '/Downloads/family_photo.heic', extension: 'heic', size_bytes: 4194304, current_folder: '/Downloads' },
      { filename: 'resume_2024.pdf', filepath: '/Documents/Personal/resume_2024.pdf', extension: 'pdf', size_bytes: 204800, current_folder: '/Documents/Personal' },
      { filename: 'logo_final.svg', filepath: '/Desktop/logo_final.svg', extension: 'svg', size_bytes: 32768, current_folder: '/Desktop' },
      { filename: 'meeting_recording.m4a', filepath: '/Downloads/meeting_recording.m4a', extension: 'm4a', size_bytes: 15728640, current_folder: '/Downloads' },
      { filename: 'tax_docs_2023.pdf', filepath: '/Documents/Finance/tax_docs_2023.pdf', extension: 'pdf', size_bytes: 1048576, current_folder: '/Documents/Finance' }
    ];

    for (const file of files) {
      await pool.query(
        'INSERT INTO files (user_id, filename, filepath, extension, size_bytes, current_folder) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, file.filename, file.filepath, file.extension, file.size_bytes, file.current_folder]
      );
    }
    console.log(`Seeded ${files.length} files`);

    // Seed Passwords (20 items)
    const passwords = [
      { site_name: 'Google', site_url: 'https://google.com', username: 'user@gmail.com', strength: 'Strong', score: 85, has_2fa: true, last_changed: '2024-01-15' },
      { site_name: 'Facebook', site_url: 'https://facebook.com', username: 'user@email.com', strength: 'Medium', score: 60, has_2fa: true, last_changed: '2023-11-20' },
      { site_name: 'Amazon', site_url: 'https://amazon.com', username: 'user@email.com', strength: 'Strong', score: 80, has_2fa: false, last_changed: '2024-02-01' },
      { site_name: 'Netflix', site_url: 'https://netflix.com', username: 'user@email.com', strength: 'Weak', score: 35, has_2fa: false, last_changed: '2022-06-10' },
      { site_name: 'GitHub', site_url: 'https://github.com', username: 'devuser', strength: 'Very Strong', score: 95, has_2fa: true, last_changed: '2024-01-28' },
      { site_name: 'LinkedIn', site_url: 'https://linkedin.com', username: 'user@email.com', strength: 'Medium', score: 55, has_2fa: false, last_changed: '2023-08-15' },
      { site_name: 'Twitter', site_url: 'https://twitter.com', username: 'twitteruser', strength: 'Strong', score: 75, has_2fa: true, last_changed: '2023-12-01' },
      { site_name: 'Dropbox', site_url: 'https://dropbox.com', username: 'user@email.com', strength: 'Medium', score: 65, has_2fa: true, last_changed: '2023-09-22' },
      { site_name: 'Bank of America', site_url: 'https://bankofamerica.com', username: 'bankuser', strength: 'Very Strong', score: 92, has_2fa: true, last_changed: '2024-01-05' },
      { site_name: 'PayPal', site_url: 'https://paypal.com', username: 'user@email.com', strength: 'Strong', score: 82, has_2fa: true, last_changed: '2023-10-18' },
      { site_name: 'Spotify', site_url: 'https://spotify.com', username: 'musiclover', strength: 'Weak', score: 40, has_2fa: false, last_changed: '2022-03-25' },
      { site_name: 'Adobe', site_url: 'https://adobe.com', username: 'creative@email.com', strength: 'Medium', score: 58, has_2fa: false, last_changed: '2023-07-08' },
      { site_name: 'Slack', site_url: 'https://slack.com', username: 'workuser', strength: 'Strong', score: 78, has_2fa: true, last_changed: '2024-01-20' },
      { site_name: 'Discord', site_url: 'https://discord.com', username: 'gamer123', strength: 'Medium', score: 62, has_2fa: false, last_changed: '2023-05-14' },
      { site_name: 'Reddit', site_url: 'https://reddit.com', username: 'redditor', strength: 'Weak', score: 45, has_2fa: false, last_changed: '2021-12-30' },
      { site_name: 'Apple ID', site_url: 'https://apple.com', username: 'user@icloud.com', strength: 'Very Strong', score: 90, has_2fa: true, last_changed: '2024-02-10' },
      { site_name: 'Microsoft', site_url: 'https://microsoft.com', username: 'user@outlook.com', strength: 'Strong', score: 83, has_2fa: true, last_changed: '2024-01-12' },
      { site_name: 'Zoom', site_url: 'https://zoom.us', username: 'user@work.com', strength: 'Medium', score: 68, has_2fa: false, last_changed: '2023-06-15' },
      { site_name: 'Uber', site_url: 'https://uber.com', username: 'rider@email.com', strength: 'Weak', score: 38, has_2fa: false, last_changed: '2022-09-01' },
      { site_name: 'Airbnb', site_url: 'https://airbnb.com', username: 'traveler@email.com', strength: 'Medium', score: 56, has_2fa: false, last_changed: '2023-04-20' }
    ];

    for (const pwd of passwords) {
      await pool.query(
        'INSERT INTO passwords (user_id, site_name, site_url, username, password_strength, strength_score, has_2fa, last_changed) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [userId, pwd.site_name, pwd.site_url, pwd.username, pwd.strength, pwd.score, pwd.has_2fa, pwd.last_changed]
      );
    }
    console.log(`Seeded ${passwords.length} passwords`);

    // Seed Screen Time (20 items)
    const screenTime = [
      { app_name: 'Chrome', category: 'Productivity', limit: 180, usage: 210, is_blocked: false },
      { app_name: 'Slack', category: 'Work', limit: 120, usage: 95, is_blocked: false },
      { app_name: 'VS Code', category: 'Development', limit: 480, usage: 320, is_blocked: false },
      { app_name: 'Twitter', category: 'Social Media', limit: 30, usage: 85, is_blocked: false },
      { app_name: 'Instagram', category: 'Social Media', limit: 30, usage: 45, is_blocked: false },
      { app_name: 'YouTube', category: 'Entertainment', limit: 60, usage: 120, is_blocked: false },
      { app_name: 'Netflix', category: 'Entertainment', limit: 90, usage: 150, is_blocked: false },
      { app_name: 'Spotify', category: 'Music', limit: 240, usage: 180, is_blocked: false },
      { app_name: 'TikTok', category: 'Social Media', limit: 20, usage: 75, is_blocked: true },
      { app_name: 'Reddit', category: 'Social Media', limit: 45, usage: 90, is_blocked: false },
      { app_name: 'Zoom', category: 'Work', limit: 180, usage: 120, is_blocked: false },
      { app_name: 'Notion', category: 'Productivity', limit: 120, usage: 60, is_blocked: false },
      { app_name: 'Discord', category: 'Social', limit: 60, usage: 95, is_blocked: false },
      { app_name: 'Figma', category: 'Design', limit: 180, usage: 140, is_blocked: false },
      { app_name: 'Gmail', category: 'Work', limit: 90, usage: 55, is_blocked: false },
      { app_name: 'Facebook', category: 'Social Media', limit: 30, usage: 40, is_blocked: true },
      { app_name: 'WhatsApp', category: 'Communication', limit: 60, usage: 42, is_blocked: false },
      { app_name: 'Telegram', category: 'Communication', limit: 45, usage: 28, is_blocked: false },
      { app_name: 'Pinterest', category: 'Social Media', limit: 20, usage: 35, is_blocked: false },
      { app_name: 'Twitch', category: 'Entertainment', limit: 60, usage: 105, is_blocked: false }
    ];

    for (const st of screenTime) {
      await pool.query(
        'INSERT INTO screen_time (user_id, app_name, category, daily_limit_minutes, actual_usage_minutes, is_blocked, date) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)',
        [userId, st.app_name, st.category, st.limit, st.usage, st.is_blocked]
      );
    }
    console.log(`Seeded ${screenTime.length} screen time entries`);

    // Seed Focus Sessions (20 items)
    const focusSessions = [
      { name: 'Morning Coding', duration: 25, break_duration: 5, target: 4, completed: 4, status: 'completed', rating: 5, blocked_sites: ['twitter.com', 'reddit.com'] },
      { name: 'Project Planning', duration: 30, break_duration: 10, target: 3, completed: 3, status: 'completed', rating: 4, blocked_sites: ['youtube.com'] },
      { name: 'Deep Work Session', duration: 50, break_duration: 10, target: 2, completed: 2, status: 'completed', rating: 5, blocked_sites: ['facebook.com', 'instagram.com'] },
      { name: 'Bug Fixing', duration: 25, break_duration: 5, target: 4, completed: 3, status: 'completed', rating: 3, blocked_sites: [] },
      { name: 'Learning React', duration: 25, break_duration: 5, target: 4, completed: 4, status: 'completed', rating: 4, blocked_sites: ['twitter.com'] },
      { name: 'Writing Documentation', duration: 25, break_duration: 5, target: 2, completed: 2, status: 'completed', rating: 4, blocked_sites: [] },
      { name: 'Code Review', duration: 30, break_duration: 5, target: 3, completed: 3, status: 'completed', rating: 5, blocked_sites: ['youtube.com'] },
      { name: 'Database Design', duration: 45, break_duration: 15, target: 2, completed: 1, status: 'completed', rating: 3, blocked_sites: [] },
      { name: 'API Development', duration: 25, break_duration: 5, target: 4, completed: 4, status: 'completed', rating: 5, blocked_sites: ['reddit.com'] },
      { name: 'Testing Sprint', duration: 25, break_duration: 5, target: 3, completed: 2, status: 'completed', rating: 4, blocked_sites: [] },
      { name: 'Refactoring', duration: 25, break_duration: 5, target: 4, completed: 0, status: 'pending', rating: null, blocked_sites: ['twitter.com', 'facebook.com'] },
      { name: 'UI Design Review', duration: 30, break_duration: 10, target: 2, completed: 0, status: 'pending', rating: null, blocked_sites: [] },
      { name: 'Performance Optimization', duration: 45, break_duration: 10, target: 3, completed: 0, status: 'pending', rating: null, blocked_sites: ['youtube.com'] },
      { name: 'Security Audit', duration: 25, break_duration: 5, target: 4, completed: 0, status: 'pending', rating: null, blocked_sites: [] },
      { name: 'Client Meeting Prep', duration: 25, break_duration: 5, target: 2, completed: 0, status: 'pending', rating: null, blocked_sites: ['instagram.com'] },
      { name: 'Email Cleanup', duration: 25, break_duration: 5, target: 1, completed: 0, status: 'pending', rating: null, blocked_sites: ['twitter.com', 'reddit.com', 'youtube.com'] },
      { name: 'Sprint Retrospective', duration: 30, break_duration: 5, target: 2, completed: 2, status: 'completed', rating: 4, blocked_sites: [] },
      { name: 'CSS Styling', duration: 25, break_duration: 5, target: 3, completed: 3, status: 'completed', rating: 4, blocked_sites: ['twitter.com'] },
      { name: 'Backend Integration', duration: 45, break_duration: 10, target: 2, completed: 0, status: 'pending', rating: null, blocked_sites: ['facebook.com'] },
      { name: 'DevOps Pipeline', duration: 25, break_duration: 5, target: 4, completed: 0, status: 'pending', rating: null, blocked_sites: [] }
    ];

    for (const session of focusSessions) {
      await pool.query(
        `INSERT INTO focus_sessions (user_id, session_name, duration_minutes, break_duration_minutes, target_pomodoros, completed_pomodoros, status, productivity_rating, blocked_sites)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, session.name, session.duration, session.break_duration, session.target, session.completed, session.status, session.rating, session.blocked_sites]
      );
    }
    console.log(`Seeded ${focusSessions.length} focus sessions`);

    // Seed Notifications (20 items)
    const notifications = [
      { title: 'Welcome to AI Productivity Hub!', message: 'Get started by exploring your dashboard and setting up your profile.', type: 'info', category: 'system' },
      { title: 'Password Alert', message: '3 of your passwords are weak and should be updated immediately.', type: 'warning', category: 'security' },
      { title: 'Focus Goal Achieved!', message: 'You completed 4 pomodoros today. Great job!', type: 'success', category: 'focus' },
      { title: 'Screen Time Warning', message: 'You have exceeded your daily limit for YouTube by 60 minutes.', type: 'warning', category: 'detox' },
      { title: 'New AI Insight Available', message: 'Your weekly productivity analysis is ready to view.', type: 'info', category: 'ai' },
      { title: 'Bookmark Organized', message: '16 bookmarks have been auto-categorized by AI.', type: 'success', category: 'bookmarks' },
      { title: 'File Suggestions Ready', message: 'AI has suggestions for organizing 8 files in your Downloads folder.', type: 'info', category: 'files' },
      { title: 'Security Alert', message: 'Netflix password has not been changed in over 2 years.', type: 'error', category: 'security' },
      { title: 'Daily Streak!', message: 'You have maintained a 7-day focus streak. Keep it up!', type: 'success', category: 'focus' },
      { title: 'TikTok Blocked', message: 'TikTok has been blocked as per your digital detox settings.', type: 'info', category: 'detox' },
      { title: 'Profile Incomplete', message: 'Complete your profile to get personalized AI recommendations.', type: 'info', category: 'profile' },
      { title: 'Data Export Ready', message: 'Your requested data export is ready for download.', type: 'success', category: 'export' },
      { title: 'New Feature Available', message: 'Check out the new keyboard shortcuts for faster navigation.', type: 'info', category: 'system' },
      { title: 'Breach Alert', message: 'One of your passwords may have been compromised in a data breach.', type: 'error', category: 'security' },
      { title: 'Weekly Report', message: 'Your weekly productivity report shows a 15% improvement.', type: 'success', category: 'ai' },
      { title: 'Bookmark Duplicate Found', message: 'We found 2 duplicate bookmarks in your collection.', type: 'warning', category: 'bookmarks' },
      { title: 'Focus Timer Reminder', message: 'You have 3 pending focus sessions for today.', type: 'info', category: 'focus' },
      { title: 'Storage Update', message: 'You have uploaded 5 files this week totaling 25MB.', type: 'info', category: 'files' },
      { title: 'App Update Available', message: 'A new version of AI Productivity Hub is available with bug fixes.', type: 'info', category: 'system' },
      { title: 'Goal Completed', message: 'You reached your weekly screen time reduction goal!', type: 'success', category: 'detox' }
    ];

    for (let i = 0; i < notifications.length; i++) {
      const n = notifications[i];
      await pool.query(
        `INSERT INTO notifications (user_id, title, message, type, category, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${i} hours')`,
        [userId, n.title, n.message, n.type, n.category, i > 5]
      );
    }
    console.log(`Seeded ${notifications.length} notifications`);

    // Seed Audit Logs (20 items)
    const auditLogs = [
      { action: 'user.login', entity_type: 'user', entity_id: userId },
      { action: 'bookmark.create', entity_type: 'bookmark', entity_id: 1 },
      { action: 'bookmark.create', entity_type: 'bookmark', entity_id: 2 },
      { action: 'password.audit', entity_type: 'password', entity_id: 1 },
      { action: 'file.create', entity_type: 'file', entity_id: 1 },
      { action: 'settings.update', entity_type: 'settings', entity_id: null },
      { action: 'focus_session.start', entity_type: 'focus_session', entity_id: 1 },
      { action: 'focus_session.complete', entity_type: 'focus_session', entity_id: 1 },
      { action: 'screen_time.block', entity_type: 'screen_time', entity_id: 9 },
      { action: 'bookmark.ai_categorize', entity_type: 'bookmark', entity_id: 3 },
      { action: 'profile.update', entity_type: 'user', entity_id: userId },
      { action: 'password.create', entity_type: 'password', entity_id: 5 },
      { action: 'file.suggest', entity_type: 'file', entity_id: 2 },
      { action: 'export.bookmarks', entity_type: 'export', entity_id: null },
      { action: 'notification.read', entity_type: 'notification', entity_id: 1 },
      { action: 'user.login', entity_type: 'user', entity_id: userId },
      { action: 'bookmark.delete', entity_type: 'bookmark', entity_id: null },
      { action: 'focus_session.create', entity_type: 'focus_session', entity_id: 11 },
      { action: 'screen_time.analyze', entity_type: 'screen_time', entity_id: null },
      { action: 'user.change_password', entity_type: 'user', entity_id: userId }
    ];

    for (let i = 0; i < auditLogs.length; i++) {
      const log = auditLogs[i];
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, '127.0.0.1', 'Mozilla/5.0', NOW() - INTERVAL '${i * 2} hours')`,
        [userId, log.action, log.entity_type, log.entity_id]
      );
    }
    console.log(`Seeded ${auditLogs.length} audit logs`);

    // Seed Feedback (16 items)
    const feedbackItems = [
      { type: 'feature', subject: 'Dark mode toggle', message: 'Would love a quick toggle for dark/light mode in the sidebar.', rating: 4, status: 'reviewed' },
      { type: 'bug', subject: 'Timer not resetting', message: 'The focus timer does not reset properly after completing all pomodoros.', rating: 3, status: 'in_progress' },
      { type: 'improvement', subject: 'Better search', message: 'Search should include results from all sections, not just bookmarks.', rating: 4, status: 'pending' },
      { type: 'general', subject: 'Great app!', message: 'Really loving the AI-powered categorization. Saves so much time.', rating: 5, status: 'reviewed' },
      { type: 'feature', subject: 'Mobile app', message: 'Any plans for a mobile app? Would be great to track on the go.', rating: 4, status: 'pending' },
      { type: 'bug', subject: 'Export CSV formatting', message: 'CSV export has issues with special characters in descriptions.', rating: 2, status: 'pending' },
      { type: 'improvement', subject: 'Keyboard navigation', message: 'Add keyboard shortcuts for common actions like creating bookmarks.', rating: 4, status: 'reviewed' },
      { type: 'feature', subject: 'Browser extension', message: 'A browser extension to quickly save bookmarks would be amazing.', rating: 5, status: 'pending' },
      { type: 'general', subject: 'Onboarding experience', message: 'The tutorial flow was helpful but could be more interactive.', rating: 3, status: 'pending' },
      { type: 'bug', subject: 'Notification sound', message: 'Notification sound plays even when sound is disabled in settings.', rating: 2, status: 'in_progress' },
      { type: 'improvement', subject: 'File upload size', message: 'Increase the file upload limit from 10MB to at least 50MB.', rating: 3, status: 'pending' },
      { type: 'feature', subject: 'Team collaboration', message: 'Would love to share bookmarks and files with team members.', rating: 4, status: 'pending' },
      { type: 'general', subject: 'Privacy concerns', message: 'How is my password data stored? Is it encrypted?', rating: 3, status: 'reviewed' },
      { type: 'improvement', subject: 'Dashboard widgets', message: 'Let users customize which widgets appear on the dashboard.', rating: 4, status: 'pending' },
      { type: 'bug', subject: 'Login redirect', message: 'After session expires, redirect goes to wrong page.', rating: 2, status: 'pending' },
      { type: 'feature', subject: 'API access', message: 'Provide a personal API key for automation and integrations.', rating: 5, status: 'pending' }
    ];

    for (const fb of feedbackItems) {
      await pool.query(
        'INSERT INTO feedback (user_id, type, subject, message, rating, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, fb.type, fb.subject, fb.message, fb.rating, fb.status]
      );
    }
    console.log(`Seeded ${feedbackItems.length} feedback items`);

    // Seed Contact Messages (16 items)
    const contactMessages = [
      { name: 'John Smith', email: 'john@example.com', subject: 'Account Recovery', message: 'I forgot my password and cannot access my account.', status: 'resolved' },
      { name: 'Sarah Johnson', email: 'sarah@company.com', subject: 'Enterprise Pricing', message: 'We are interested in using AI Productivity Hub for our team of 50.', status: 'new' },
      { name: 'Mike Brown', email: 'mike@dev.io', subject: 'API Integration', message: 'Looking to integrate with our existing workflow tools.', status: 'in_progress' },
      { name: 'Emily Davis', email: 'emily@school.edu', subject: 'Educational License', message: 'Can students get free access for academic purposes?', status: 'new' },
      { name: 'Alex Wilson', email: 'alex@startup.com', subject: 'Bug Report', message: 'Found a security vulnerability in the login flow.', status: 'resolved' },
      { name: 'Lisa Chen', email: 'lisa@design.co', subject: 'Feature Request', message: 'Would love integration with Figma and Adobe tools.', status: 'new' },
      { name: 'David Kim', email: 'david@tech.org', subject: 'Data Privacy', message: 'What data do you collect and how is it processed?', status: 'resolved' },
      { name: 'Rachel Green', email: 'rachel@email.com', subject: 'Account Deletion', message: 'Please delete my account and all associated data.', status: 'in_progress' },
      { name: 'Tom Harris', email: 'tom@freelance.me', subject: 'Partnership Inquiry', message: 'Interested in becoming a reseller or affiliate.', status: 'new' },
      { name: 'Anna Martinez', email: 'anna@corp.com', subject: 'SSO Integration', message: 'Do you support SAML or OAuth for single sign-on?', status: 'new' },
      { name: 'Chris Taylor', email: 'chris@dev.com', subject: 'Open Source', message: 'Is the code open source? Would love to contribute.', status: 'new' },
      { name: 'Jessica Lee', email: 'jessica@media.co', subject: 'Press Inquiry', message: 'We would like to feature your app in our tech review.', status: 'new' },
      { name: 'Ryan White', email: 'ryan@email.com', subject: 'Mobile Support', message: 'When will the mobile app be available?', status: 'new' },
      { name: 'Nicole Clark', email: 'nicole@health.org', subject: 'Accessibility', message: 'Is the app accessible for users with screen readers?', status: 'in_progress' },
      { name: 'Kevin Adams', email: 'kevin@email.com', subject: 'Data Export', message: 'Need to export all my data in a portable format.', status: 'resolved' },
      { name: 'Laura Hall', email: 'laura@edu.org', subject: 'Training Materials', message: 'Do you have documentation or training videos?', status: 'new' }
    ];

    for (const msg of contactMessages) {
      await pool.query(
        'INSERT INTO contact_messages (user_id, name, email, subject, message, status) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, msg.name, msg.email, msg.subject, msg.message, msg.status]
      );
    }
    console.log(`Seeded ${contactMessages.length} contact messages`);

    console.log('\nDatabase seeding completed successfully!');
    console.log('\nDemo user credentials:');
    console.log('  Email: demo@example.com');
    console.log('  Password: demo123');
    console.log('\nTest user credentials:');
    console.log('  Email: test@example.com');
    console.log('  Password: test123');

    await pool.end();
  } catch (error) {
    console.error('Seeding error:', error);
    await pool.end();
    process.exit(1);
  }
}

seedDatabase();
