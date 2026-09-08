import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom menyediakan window tetapi tidak menyediakan IndexedDB, sedangkan
// src/lib/storage.js membuat default store saat modul dimuat. fake-indexeddb
// mengisi global itu supaya tes komponen bisa mengimpor domain/storage.
// Di environment node ini tidak berpengaruh: storage.test.js tetap menyuntik
// IDBFactory sendiri, dan defaultStore memang null tanpa window.
import 'fake-indexeddb/auto';

// Matchers seperti toBeInTheDocument untuk tes komponen.
import '@testing-library/jest-dom/vitest';

// Auto-cleanup Testing Library hanya aktif jika globals:true, dan konfigurasi
// ini sengaja tidak memakainya. Tanpa ini DOM menumpuk antar tes.
afterEach(() => cleanup());
