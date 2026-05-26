// crypto-helper.js
// نسخه بدون ماژول ES - توابع را روی window قرار می‌دهد

(() => {
  const encoder = new TextEncoder();

  async function deriveKey(password, salt) {
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    return window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );
  }

  function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function hexToBuffer(hex) {
    const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    return bytes.buffer;
  }

  async function hashPassword(password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const hash = await deriveKey(password, salt);
    return bufferToHex(salt) + ':' + bufferToHex(hash);
  }

  async function verifyPassword(password, storedHash) {
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex) return false;
    const salt = new Uint8Array(hexToBuffer(saltHex));
    const newHash = await deriveKey(password, salt);
    return bufferToHex(newHash) === hashHex;
  }

  // قرار دادن توابع در فضای سراسری
  window.CryptoHelper = {
    hashPassword,
    verifyPassword,
    hashAnswer: hashPassword,   // هم‌نام برای پاسخ‌های امنیتی
    verifyAnswer: verifyPassword
  };
})();