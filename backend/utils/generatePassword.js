import crypto from "crypto";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function generatePassword(length = 10) {
  let password = "";
  for (let i = 0; i < length; i++) {
    password += CHARS[crypto.randomInt(0, CHARS.length)];
  }
  return password;
}
