const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// ─── CONFIG ───────────────────────────────────────
const TEST_EMAIL = 'admin@greenguard.com';
const TEST_PASSWORD = 'Admin@123';
const TEST_NAME = 'Admin User';
const TEST_ROLE = 'FARMER'; // Options: FARMER | GOVERNMENT | RESEARCHER
// ──────────────────────────────────────────────────

async function seedUser() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        console.log('🔌 Connecting to Neon PostgreSQL...');
        await pool.query('SELECT 1'); // test connection
        console.log('✅ Connected!\n');

        // Check if user already exists
        const existing = await pool.query(
            'SELECT id, email FROM "User" WHERE email = $1',
            [TEST_EMAIL]
        );

        if (existing.rows.length > 0) {
            console.log(`⚠️  User already exists: ${TEST_EMAIL}`);
            console.log('   Updating password...');

            const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);
            await pool.query(
                'UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE email = $2',
                [hashedPassword, TEST_EMAIL]
            );
            console.log('✅ Password updated successfully!\n');
        } else {
            // Create new user
            const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);
            const id = require('crypto').randomUUID().replace(/-/g, '').substring(0, 25); // cuid-like

            await pool.query(
                `INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
                 VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
                [id, TEST_NAME, TEST_EMAIL, hashedPassword, TEST_ROLE]
            );
            console.log('✅ User created successfully!\n');
        }

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔐 LOGIN CREDENTIALS:');
        console.log(`   Email    : ${TEST_EMAIL}`);
        console.log(`   Password : ${TEST_PASSWORD}`);
        console.log(`   Role     : ${TEST_ROLE}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🚀 Now run: npm run dev');
        console.log('   Then go to: http://localhost:3000/login');

    } catch (error) {
        console.error('\n❌ Error:', error.message);

        if (error.message.includes('does not exist')) {
            console.log('\n💡 Table "User" not found. Running Prisma migration first...');
            console.log('   Run: npx prisma db push');
            console.log('   Then run this script again: node seed_user.js');
        }
    } finally {
        await pool.end();
    }
}

seedUser();
