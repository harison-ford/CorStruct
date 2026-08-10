import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createRemoteJWKSet, jwtVerify } from "jose";

@Injectable()
export class JwtService {
  private readonly jwks;
  private readonly issuer:string;

  constructor(config: ConfigService) {
    this.jwks = createRemoteJWKSet(
      new URL(config.getOrThrow("SUPABASE_JWKS_URL")),
    );
    this.issuer = config.getOrThrow("SUPABASE_JWT_ISSUER");
  }

  async verify(token: string) {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: "authenticated",
      });

      const id = payload.sub;
      if (!id) {
        throw new UnauthorizedException("Token missing sub");
      }

      const email = payload["email"];
      const role = payload["role"];

      return {
        id,
        email: typeof email === "string" ? email : null,
        role: typeof role === "string" ? role : "authenticated",
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
