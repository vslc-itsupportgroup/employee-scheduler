import pool from '../config/database';

const disableEmailConfirmation = async () => {
  try {
    console.log('🔄 Disabling email confirmation system...');

    // 1. Add email_verified column if it doesn't exist
    try {
      await pool.query('ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT true');
      console.log('✓ Added email_verified column');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('ℹ email_verified column already exists');
      } else {
        throw e;
      }
    }

    // 2. Mark all users as email verified
    const verifyResult = await pool.query(
      'UPDATE users SET email_verified = true WHERE email_verified = false'
    );
    console.log(`✓ Marked ${verifyResult.rowCount} users as email verified`);

    // 3. Disable confirmation emails for all users
    const disableEmailResult = await pool.query(
      'UPDATE users SET confirmation_email_enabled = false'
    );
    console.log(`✓ Disabled confirmation emails for ${disableEmailResult.rowCount} users`);

    // 4. Disable 2FA for all users (optional - can be kept enabled)
    // Commented out to preserve any existing 2FA setups
    // const disable2FAResult = await pool.query(
    //   'UPDATE users SET two_fa_enabled = false'
    // );
    // console.log(`✓ Disabled 2FA for ${disable2FAResult.rowCount} users (can be re-enabled when email is ready)`);

    // 5. Clear all pending email confirmations
    try {
      const clearResult = await pool.query(
        'DELETE FROM email_confirmations'
      );
      console.log(`✓ Cleared ${clearResult.rowCount} pending confirmation codes`);
    } catch (e: any) {
      if (e.message.includes('does not exist')) {
        console.log('ℹ email_confirmations table does not exist');
      } else {
        throw e;
      }
    }

    console.log('\n✅ Email confirmation system disabled!');
    console.log('\n📋 Summary:');
    console.log('   • All users marked as email verified');
    console.log('   • Login confirmation emails disabled for all users');
    console.log('   • Pending confirmation codes cleared');
    console.log('   • 2FA remains available for users to enable manually');
    console.log('\n📝 Note: Once SMTP is configured, users can enable confirmation emails via security settings');

    await pool.end();
  } catch (error) {
    console.error('❌ Failed to disable email confirmation:', error);
    process.exit(1);
  }
};

disableEmailConfirmation();
