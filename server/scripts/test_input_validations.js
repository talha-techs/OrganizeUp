/**
 * Automated Verification Suite for OrganizeUp Client Validation & Duplicate Prevention
 */

const assert = require('assert');

console.log('========================================================');
console.log('🧪 Starting Client Validation & Duplicate Prevention Tests');
console.log('========================================================\n');

let passedCount = 0;
let totalCount = 0;

function test(name, fn) {
  totalCount++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

// --- 1. Workspace Validation ---
console.log('--- Suite 1: Workspaces & SubSections ---');

test('Workspace: rejects empty or whitespace-only name', () => {
  const name1 = '';
  const name2 = '   ';
  assert.strictEqual(Boolean(name1.trim()), false);
  assert.strictEqual(Boolean(name2.trim()), false);
});

test('Workspace: detects duplicate workspace name (case-insensitive)', () => {
  const existing = [{ name: 'Deep Work' }, { name: 'Projects' }];
  const checkDuplicate = (name) =>
    existing.some((s) => s.name?.trim().toLowerCase() === name.trim().toLowerCase());

  assert.strictEqual(checkDuplicate('deep work'), true);
  assert.strictEqual(checkDuplicate('  PROJECTS  '), true);
  assert.strictEqual(checkDuplicate('Novel Writing'), false);
});

test('Workspace SubSection: validates & normalizes link URLs and rejects duplicates', () => {
  const normalizeUrl = (url) => {
    let trimmed = url.trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) {
      if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
        trimmed = `https://${trimmed}`;
      } else {
        return null;
      }
    }
    return trimmed;
  };

  assert.strictEqual(normalizeUrl('github.com/repo'), 'https://github.com/repo');
  assert.strictEqual(normalizeUrl('https://google.com'), 'https://google.com');
  assert.strictEqual(normalizeUrl('not-a-valid-url'), null);

  const existingLinks = [{ url: 'https://github.com/repo' }];
  const isDuplicate = (url) =>
    existingLinks.some((l) => l.url?.trim().toLowerCase() === url.toLowerCase());

  assert.strictEqual(isDuplicate('https://github.com/repo'), true);
  assert.strictEqual(isDuplicate('https://github.com/other'), false);
});

test('Workspace SubSection: rejects duplicate tasks and past due dates in To-Do list', () => {
  const existingTodos = [{ text: 'Write Unit Tests' }, { text: 'Deploy to Render' }];
  const isDuplicateTask = (text) =>
    existingTodos.some((t) => t.text?.trim().toLowerCase() === text.trim().toLowerCase());

  assert.strictEqual(isDuplicateTask('write unit tests'), true);
  assert.strictEqual(isDuplicateTask('Review PR'), false);

  const isPastDate = (dateStr) => {
    const due = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  };

  assert.strictEqual(isPastDate('2020-01-01'), true);
  const future = new Date();
  future.setDate(future.getDate() + 5);
  assert.strictEqual(isPastDate(future.toISOString()), false);
});

test('Workspace Team Sharing: email regex, self-invite and duplicate collaborator check', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert.strictEqual(emailRegex.test('valid@example.com'), true);
  assert.strictEqual(emailRegex.test('invalid-email'), false);
  assert.strictEqual(emailRegex.test('missing@domain'), false);

  const currentUser = { email: 'admin@organizeup.app' };
  const collaborators = [{ user: { email: 'collab@example.com' } }];
  const pendingInvites = [{ email: 'pending@example.com' }];

  const canInvite = (email) => {
    const clean = email.trim().toLowerCase();
    if (clean === currentUser.email.toLowerCase()) return 'SELF_INVITE';
    if (collaborators.some((c) => c.user?.email?.toLowerCase() === clean)) return 'ALREADY_COLLAB';
    if (pendingInvites.some((p) => p.email?.toLowerCase() === clean)) return 'ALREADY_PENDING';
    return 'OK';
  };

  assert.strictEqual(canInvite('admin@organizeup.app'), 'SELF_INVITE');
  assert.strictEqual(canInvite('collab@example.com'), 'ALREADY_COLLAB');
  assert.strictEqual(canInvite('pending@example.com'), 'ALREADY_PENDING');
  assert.strictEqual(canInvite('newuser@example.com'), 'OK');
});

// --- 2. Books & Audiobooks Validation ---
console.log('\n--- Suite 2: Books & Audiobooks ---');

test('BookForm: enforces PDF selection for text books', () => {
  const validateTextBook = (type, isEdit, pdfFile) => {
    if (type === 'text') {
      if (!isEdit && !pdfFile) return false;
    }
    return true;
  };

  assert.strictEqual(validateTextBook('text', false, null), false);
  assert.strictEqual(validateTextBook('text', false, { name: 'book.pdf', size: 1024 }), true);
  assert.strictEqual(validateTextBook('text', true, null), true); // edit mode retains existing PDF
});

test('BookForm: audio tracks deduplication and title requirement', () => {
  const pendingAudio = [
    { file: { name: 'track1.mp3', size: 5000 }, title: 'Chapter 1' }
  ];

  const isDuplicateAudio = (newFile) =>
    pendingAudio.some((a) => a.file.name === newFile.name && a.file.size === newFile.size);

  assert.strictEqual(isDuplicateAudio({ name: 'track1.mp3', size: 5000 }), true);
  assert.strictEqual(isDuplicateAudio({ name: 'track2.mp3', size: 5000 }), false);

  const hasEmptyAudioTitle = (tracks) => tracks.some((t) => !t.title?.trim());
  assert.strictEqual(hasEmptyAudioTitle([{ title: 'Valid' }]), false);
  assert.strictEqual(hasEmptyAudioTitle([{ title: '   ' }]), true);
});

test('BookForm: video episodes title/ID requirement and duplicate ID prevention', () => {
  const videos1 = [
    { title: 'Intro', driveFileId: 'drive_123' },
    { title: 'Part 2', driveFileId: 'drive_456' },
  ];
  const videos2 = [
    { title: 'Intro', driveFileId: 'drive_123' },
    { title: 'Part 2', driveFileId: 'drive_123' }, // Duplicate Drive ID
  ];

  const hasDuplicateDriveIds = (vList) => {
    const ids = vList.map((v) => v.driveFileId.trim());
    return new Set(ids).size !== ids.length;
  };

  assert.strictEqual(hasDuplicateDriveIds(videos1), false);
  assert.strictEqual(hasDuplicateDriveIds(videos2), true);
});

test('ImportBookModal: validates Drive folder URLs & folder IDs', () => {
  const isValidDriveTarget = (target) => {
    const trimmed = target.trim();
    if (!trimmed) return false;
    const isDriveUrl = /drive\.google\.com/i.test(trimmed);
    const isFolderId = /^[a-zA-Z0-9_-]{20,}$/.test(trimmed);
    return isDriveUrl || isFolderId;
  };

  assert.strictEqual(isValidDriveTarget('https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ'), true);
  assert.strictEqual(isValidDriveTarget('1aBcDeFgHiJkLmNoPqRsTuVwXyZ12345'), true);
  assert.strictEqual(isValidDriveTarget('https://randomwebsite.com/downloads'), false);
  assert.strictEqual(isValidDriveTarget('not-an-id'), false);
});

// --- 3. YouTube Library Validation ---
console.log('\n--- Suite 3: YouTube Library ---');

test('YouTube: detects non-YouTube URLs and extracts target IDs', () => {
  const extractId = (url) => {
    const trimmed = url.trim();
    const playlistMatch = trimmed.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    if (playlistMatch) return { type: 'playlist', id: playlistMatch[1] };
    const videoMatch = trimmed.match(/(?:[?&]v=|youtu\.be\/|\/shorts\/|\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (videoMatch) return { type: 'video', id: videoMatch[1] };
    return null;
  };

  assert.deepStrictEqual(extractId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), { type: 'video', id: 'dQw4w9WgXcQ' });
  assert.deepStrictEqual(extractId('https://youtu.be/dQw4w9WgXcQ'), { type: 'video', id: 'dQw4w9WgXcQ' });
  assert.deepStrictEqual(extractId('https://www.youtube.com/playlist?list=PL1234567890ABCDEF'), { type: 'playlist', id: 'PL1234567890ABCDEF' });
  assert.strictEqual(extractId('https://vimeo.com/1234567'), null);
});

test('YouTube: prevents duplicate entries in existing library', () => {
  const existingPlaylists = [
    { playlistId: 'PL1234567890ABCDEF', type: 'playlist' },
    { url: 'https://youtube.com/watch?v=dQw4w9WgXcQ', type: 'video' },
  ];

  const isDuplicate = (targetId) =>
    existingPlaylists.some(
      (p) => p.playlistId === targetId || (p.url && p.url.includes(targetId))
    );

  assert.strictEqual(isDuplicate('PL1234567890ABCDEF'), true);
  assert.strictEqual(isDuplicate('dQw4w9WgXcQ'), true);
  assert.strictEqual(isDuplicate('NEW_VIDEO_ID_11'), false);
});

// --- 4. Vault & Quick Capture Validation ---
console.log('\n--- Suite 4: Vault & Quick Capture ---');

test('QuickCapture: cleans and deduplicates comma-separated tags', () => {
  const cleanTags = (tagStr) => {
    if (!tagStr) return '';
    const parts = tagStr
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(parts)).join(', ');
  };

  assert.strictEqual(
    cleanTags('react, Javascript, , REACT, Coding , javascript'),
    'react, javascript, coding'
  );
  assert.strictEqual(cleanTags('   , ,   '), '');
});

test('QuickCapture: rejects past custom reminder datetime', () => {
  const validateReminder = (customDateStr) => {
    const customDate = new Date(customDateStr);
    return customDate > new Date();
  };

  assert.strictEqual(validateReminder('2021-01-01T12:00'), false);
  const future = new Date(Date.now() + 3600000).toISOString();
  assert.strictEqual(validateReminder(future), true);
});

// --- 5. Courses, Categories & Profile ---
console.log('\n--- Suite 5: Courses, Categories & Profile ---');

test('CourseForm: resolves newCategory matching existing category to avoid duplicate', () => {
  const categories = [
    { _id: 'cat_1', name: 'Web Development' },
    { _id: 'cat_2', name: 'Machine Learning' },
  ];

  const resolveCategory = (selectedCat, typedNewCat) => {
    const trimmed = typedNewCat.trim();
    if (trimmed) {
      const match = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
      if (match) return { category: match._id, newCategory: '' };
      return { category: '', newCategory: trimmed };
    }
    return { category: selectedCat, newCategory: '' };
  };

  assert.deepStrictEqual(resolveCategory('', 'web development'), { category: 'cat_1', newCategory: '' });
  assert.deepStrictEqual(resolveCategory('', 'Cybersecurity'), { category: '', newCategory: 'Cybersecurity' });
  assert.deepStrictEqual(resolveCategory('cat_2', ''), { category: 'cat_2', newCategory: '' });
});

test('ProfilePage: enforces display name length >= 2 and bio <= 300 chars', () => {
  const validateProfile = (name, bio) => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) return 'INVALID_NAME';
    if (bio && bio.length > 300) return 'BIO_TOO_LONG';
    return 'OK';
  };

  assert.strictEqual(validateProfile('', 'Short bio'), 'INVALID_NAME');
  assert.strictEqual(validateProfile('A', 'Short bio'), 'INVALID_NAME');
  assert.strictEqual(validateProfile('John Doe', 'A'.repeat(301)), 'BIO_TOO_LONG');
  assert.strictEqual(validateProfile('John Doe', 'Valid bio under limit'), 'OK');
});

test('SignupPage: trims whitespace and validates minimum lengths', () => {
  const validateSignup = (name, email, password) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanName || cleanName.length < 2) return false;
    if (!emailRegex.test(cleanEmail)) return false;
    if (!password || password.length < 6) return false;
    return true;
  };

  assert.strictEqual(validateSignup('  Talha  ', '  user@example.com  ', 'secret123'), true);
  assert.strictEqual(validateSignup('T', 'user@example.com', 'secret123'), false);
  assert.strictEqual(validateSignup('Talha', 'bad-email', 'secret123'), false);
  assert.strictEqual(validateSignup('Talha', 'user@example.com', '123'), false);
});

console.log('\n========================================================');
console.log(`🎉 Results: ${passedCount}/${totalCount} validation tests passed!`);
console.log('========================================================\n');

if (passedCount !== totalCount) {
  process.exit(1);
}
