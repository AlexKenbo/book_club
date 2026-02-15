
import { getDb, generateId } from '../db';
import { BookStatus, RequestStatus } from '../types';

export const MOCK_USER_A = {
  id: 'demo_user_librarian',
  name: 'Алексей Бивер',
  phoneNumber: '+7 (916) 123-45-67'
};

export const MOCK_USER_B = {
  id: 'demo_user_reader',
  name: 'Мария Кастелланос',
  phoneNumber: '+7 (903) 987-65-43'
};

export const MOCK_USER_C = {
  id: 'demo_user_fiction',
  name: 'Дмитрий Волков',
  phoneNumber: '+7 (999) 555-44-33'
};

let seedPromise: Promise<void> | null = null;

const generateCover = (title: string, author: string, colorFrom: string, colorTo: string) => {
  const words = title.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    if (currentLine.length + words[i].length < 10) { 
      currentLine += ' ' + words[i];
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);

  const titleSvg = lines.map((line, i) => 
    `<text x="50%" y="${40 + (i * 12)}%" font-family="'Playfair Display', serif" font-weight="bold" font-size="36" fill="white" text-anchor="middle" filter="url(#shadow)">${line}</text>`
  ).join('');

  const svg = `
    <svg width="400" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colorFrom};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colorTo};stop-opacity:1" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.5"/>
        </filter>
        <pattern id="pattern" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="20" stroke="white" stroke-width="1" opacity="0.1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <rect width="100%" height="100%" fill="url(#pattern)"/>
      <rect x="25" y="25" width="350" height="550" rx="4" fill="none" stroke="white" stroke-width="3" opacity="0.4"/>
      <text x="50%" y="15%" font-family="sans-serif" font-size="22" fill="white" text-anchor="middle" font-weight="600" letter-spacing="2" opacity="0.9" filter="url(#shadow)">${author.toUpperCase()}</text>
      ${titleSvg}
      <text x="50%" y="90%" font-family="sans-serif" font-size="14" fill="white" text-anchor="middle" opacity="0.6">BOOK CLUB EDITION</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

export async function seedDatabase() {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const db = await getDb();
    
    // RxDB count is async and requires a find query
    const [bookCount, profileCount] = await Promise.all([
      db.books.count().exec(),
      db.profiles.count().exec()
    ]);
    
    if (bookCount > 0 || profileCount > 0) return;

    // 1. Profiles (using upsert to prevent errors if partial data exists)
    await db.profiles.upsert({ id: MOCK_USER_A.id, name: MOCK_USER_A.name, phoneNumber: MOCK_USER_A.phoneNumber, isPublic: true });
    await db.profiles.upsert({ id: MOCK_USER_B.id, name: MOCK_USER_B.name, phoneNumber: MOCK_USER_B.phoneNumber, isPublic: true });
    await db.profiles.upsert({ id: MOCK_USER_C.id, name: MOCK_USER_C.name, phoneNumber: MOCK_USER_C.phoneNumber, isPublic: true });

    // 2. Books
    const alexBooks = [
      { title: 'Сокрушая робость', author: 'Джон Бивер', colorFrom: '#1f2937', colorTo: '#991b1b', cat: 'Христианские' },
      { title: 'Пробуждение львиц', author: 'Лиза Бивер', colorFrom: '#d97706', colorTo: '#f59e0b', cat: 'Христианские' },
      { title: 'Как реагировать', author: 'Джон Бивер', colorFrom: '#4c1d95', colorTo: '#3b82f6', cat: 'Христианские' },
      { title: 'Дверь дьявола', author: 'Джон Бивер', colorFrom: '#451a03', colorTo: '#78350f', cat: 'Христианские' },
      { title: 'Неотступный', author: 'Джон Бивер', colorFrom: '#1e3a8a', colorTo: '#06b6d4', cat: 'Христианские' },
    ];

    for (let i = 0; i < alexBooks.length; i++) {
      await db.books.insert({
        id: generateId(),
        ownerId: MOCK_USER_A.id,
        ownerName: MOCK_USER_A.name,
        imageUrl: generateCover(alexBooks[i].title, alexBooks[i].author, alexBooks[i].colorFrom, alexBooks[i].colorTo),
        category: alexBooks[i].cat as any,
        status: BookStatus.Available,
        createdAt: Date.now() - (i * 100000)
      });
    }

    const mariaBooks = [
      { title: 'Духовная ДНК', author: 'С. Кастелланос', colorFrom: '#4a044e', colorTo: '#a855f7', cat: 'Христианские' },
      { title: 'Мечтай', author: 'С. Кастелланос', colorFrom: '#0f172a', colorTo: '#1e40af', cat: 'Христианские' },
      { title: 'Откровение о Кресте', author: 'С. Кастелланос', colorFrom: '#78350f', colorTo: '#fbbf24', cat: 'Христианские' },
    ];

    for (let i = 0; i < mariaBooks.length; i++) {
      await db.books.insert({
        id: generateId(),
        ownerId: MOCK_USER_B.id,
        ownerName: MOCK_USER_B.name,
        imageUrl: generateCover(mariaBooks[i].title, mariaBooks[i].author, mariaBooks[i].colorFrom, mariaBooks[i].colorTo),
        category: mariaBooks[i].cat as any,
        status: BookStatus.Available,
        createdAt: Date.now() - (i * 100000)
      });
    }

    const dmitryBooks = [
      { title: 'Шерлок Холмс', author: 'А. Конан Дойл', colorFrom: '#312e81', colorTo: '#4338ca', cat: 'Художественные' },
      { title: 'Гарри Поттер', author: 'Дж. Роулинг', colorFrom: '#7f1d1d', colorTo: '#f59e0b', cat: 'Художественные' },
      { title: 'Властелин Колец', author: 'Дж. Р. Р. Толкин', colorFrom: '#064e3b', colorTo: '#10b981', cat: 'Художественные' },
      { title: '1984', author: 'Дж. Оруэлл', colorFrom: '#18181b', colorTo: '#52525b', cat: 'Художественные' }
    ];

    for (let i = 0; i < dmitryBooks.length; i++) {
      await db.books.insert({
        id: generateId(),
        ownerId: MOCK_USER_C.id,
        ownerName: MOCK_USER_C.name,
        imageUrl: generateCover(dmitryBooks[i].title, dmitryBooks[i].author, dmitryBooks[i].colorFrom, dmitryBooks[i].colorTo),
        category: dmitryBooks[i].cat as any,
        status: BookStatus.Available,
        createdAt: Date.now() - (i * 100000)
      });
    }

    // 3. Interactions
    const helper = async (
        lender: typeof MOCK_USER_A, 
        borrower: typeof MOCK_USER_B, 
        bookIndex: number, 
        type: 'BORROW' | 'REQUEST'
    ) => {
        // Find books by lender (RxDB: find returns documents)
        const booksDocs = await db.books.find({ selector: { ownerId: lender.id } }).exec();
        const book = booksDocs[bookIndex];
        
        if (!book) return;

        if (type === 'BORROW') {
            // Update book
            await book.patch({
                status: BookStatus.Borrowed, 
                currentBorrowerId: borrower.id, 
                currentBorrowerName: borrower.name 
            });

            await db.requests.insert({
              id: generateId(),
              bookId: book.id,
              bookImageUrl: book.imageUrl,
              lenderId: lender.id,
              lenderName: lender.name,
              lenderPhone: lender.phoneNumber,
              borrowerId: borrower.id,
              borrowerName: borrower.name,
              borrowerPhone: borrower.phoneNumber,
              status: RequestStatus.Approved,
              requestedAt: Date.now() - 250000000
            });
        } else {
            await db.requests.insert({
              id: generateId(),
              bookId: book.id,
              bookImageUrl: book.imageUrl,
              lenderId: lender.id,
              lenderName: lender.name,
              lenderPhone: lender.phoneNumber,
              borrowerId: borrower.id,
              borrowerName: borrower.name,
              borrowerPhone: borrower.phoneNumber,
              status: RequestStatus.Pending,
              requestedAt: Date.now() - 100000
            });
        }
    };

    await helper(MOCK_USER_A, MOCK_USER_B, 0, 'BORROW');
    await helper(MOCK_USER_A, MOCK_USER_C, 1, 'REQUEST');
    await helper(MOCK_USER_B, MOCK_USER_A, 0, 'BORROW');
    await helper(MOCK_USER_B, MOCK_USER_C, 1, 'BORROW');
    await helper(MOCK_USER_C, MOCK_USER_A, 0, 'REQUEST');
    await helper(MOCK_USER_C, MOCK_USER_B, 1, 'REQUEST');
  })();

  try {
    await seedPromise;
  } finally {
    seedPromise = null;
  }
}
