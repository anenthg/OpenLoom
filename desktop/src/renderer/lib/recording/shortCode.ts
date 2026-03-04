import { isShortCodeTaken } from '../backend'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

function randomCode(length = 8): string {
  let code = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    code += CHARS[array[i] % CHARS.length]
  }
  return code
}

export async function generateShortCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = randomCode()
    if (!(await isShortCodeTaken(code))) return code
  }
  throw new Error('Failed to generate unique short code after 10 attempts')
}
