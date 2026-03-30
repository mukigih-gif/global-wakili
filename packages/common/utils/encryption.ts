import crypto from "crypto";

export function encrypt(text: string, secret: string) {
  const cipher = crypto.createCipher("aes-256-ctr", secret);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

export function decrypt(encrypted: string, secret: string) {
  const decipher = crypto.createDecipher("aes-256-ctr", secret);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}