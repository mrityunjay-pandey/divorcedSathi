import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

/** Never store or compare plaintext passwords — argon2id everywhere. */
@Injectable()
export class PasswordService {
  async hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      // Malformed/foreign hash — never throw on this path, just fail closed.
      return false;
    }
  }
}
