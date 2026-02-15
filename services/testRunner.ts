
import { getDb, generateId } from '../db';
import { BookStatus, RequestStatus } from '../types';
import { getSupabase, SUPABASE_URL } from '../lib/supabaseClient';

export async function runSystemCheck() {
  const logs: string[] = [];
  const log = (msg: string) => logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
  
  log('🚀 ЗАПУСК ПОЛНОЙ ДИАГНОСТИКИ...');

  try {
      // 1. Проверка Supabase подключения
      log('🌐 Шаг 0: Проверка сети и Supabase...');
      if (!SUPABASE_URL) {
          log('⚠️ SUPABASE_URL не задан.');
      } else {
          try {
              const start = Date.now();
              // Простой запрос к корню проекта Supabase (обычно возвращает JSON или 404, главное что сеть работает)
              // Более надежный способ - простой select, если таблицы есть
              const supabase = getSupabase();
              if (supabase) {
                  const { data, error } = await supabase.from('profiles').select('count').limit(1);
                  if (error) {
                       log(`❌ Ошибка запроса к Supabase: ${error.message}`);
                  } else {
                       log(`✅ Supabase доступен (${Date.now() - start}ms). Данные получены.`);
                  }
              } else {
                  log('⚠️ Supabase клиент не инициализирован (возможно offline режим).');
              }
          } catch (netErr: any) {
              log(`❌ Сетевая ошибка при обращении к Supabase: ${netErr.message}`);
          }
      }

      const testBookId = 'test_book_1_' + generateId();
      const testBookId2 = 'test_book_2_' + generateId();
      const lenderId = 'test_lender_sys';
      const borrowerId = 'test_borrower_sys';

      const cleanup = async () => {
        const db = await getDb();
        
        // Find docs
        const books = await db.books.find({ selector: { id: { $in: [testBookId, testBookId2] } } }).exec();
        await Promise.all(books.map(b => b.remove()));

        const reqs = await db.requests.find({ selector: { lenderId: lenderId } }).exec();
        await Promise.all(reqs.map(r => r.remove()));
      };

    const db = await getDb();
    await cleanup();

    // ==========================================
    // СЦЕНАРИЙ 1: Успешный цикл
    // ==========================================
    log('🔷 СЦЕНАРИЙ 1: Успешный обмен (Local RxDB)');

    // 1. Создание
    await db.books.insert({
      id: testBookId,
      ownerId: lenderId,
      ownerName: 'Test Lender',
      imageUrl: '',
      category: 'Саморазвитие',
      status: BookStatus.Available,
      createdAt: Date.now()
    });
    log('✅ Книга создана локально.');

    // 2. Запрос
    const reqId = generateId();
    await db.requests.insert({
      id: reqId,
      bookId: testBookId,
      bookImageUrl: '',
      lenderId: lenderId,
      lenderName: 'Test Lender',
      borrowerId: borrowerId,
      borrowerName: 'Test Borrower',
      status: RequestStatus.Pending,
      requestedAt: Date.now()
    });
    log('✅ Запрос отправлен локально.');

    // 3. Проверка дублей
    const duplicateDocs = await db.requests.find({
        selector: { bookId: testBookId, borrowerId: borrowerId, status: RequestStatus.Pending }
    }).exec();
    
    if (duplicateDocs.length !== 1) throw new Error(`Найдено ${duplicateDocs.length} заявок, ожидалась 1`);
    log('✅ Проверка целостности пройдена.');

    // 4. Одобрение
    const reqDoc = await db.requests.findOne(reqId).exec();
    const bookDoc = await db.books.findOne(testBookId).exec();

    if (!reqDoc || !bookDoc) throw new Error("Documents not found");

    await reqDoc.patch({ status: RequestStatus.Approved });
    await bookDoc.patch({ 
      status: BookStatus.Borrowed, 
      currentBorrowerId: borrowerId, 
      currentBorrowerName: 'Test Borrower' 
    });
    
    const bookAfterApprove = await db.books.findOne(testBookId).exec();
    if (bookAfterApprove?.status !== BookStatus.Borrowed) throw new Error('Статус книги не изменился на Borrowed');
    log('✅ Одобрение прошло успешно.');

    // 5. Возврат
    await bookAfterApprove.patch({ 
      status: BookStatus.Available, 
      currentBorrowerId: undefined, 
      currentBorrowerName: undefined 
    });
    await reqDoc.patch({ status: RequestStatus.Returned });
    log('✅ Возврат прошел успешно.');

    await cleanup();
    log('✨ Все тесты пройдены успешно!');
    return { success: true, logs };

  } catch (e: any) {
    log(`❌ ОШИБКА: ${e.message}`);
    console.error(e);
    return { success: false, logs };
  }
}
