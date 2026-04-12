import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    console.log('🔗 Đang kết nối MySQL...');
    await connection.query('DROP DATABASE IF EXISTS medequip_db;');
    
    const sqlPath = path.join(__dirname, '../database/medequip_database.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔄 Đang chạy script khởi tạo CSDL...');
    await connection.query(sqlScript);

    console.log('✅ Khởi tạo CSDL medequip_db thành công!');
  } catch (err) {
    console.error('❌ Lỗi khởi tạo CSDL:', err);
  } finally {
    await connection.end();
  }
}

seed();
