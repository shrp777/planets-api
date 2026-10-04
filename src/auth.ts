import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { sign, verify } from "hono/jwt";

export const TOKEN_TTL_SECONDS = 3600;
export const AUTH_COOKIE = "access_token";

const ALGORITHM = "HS256";

// L'API n'a qu'un seul utilisateur. Seule l'empreinte argon2id du mot de passe
// est conservée
const user = {
  email: "john@doe.com",
  passwordHash:
    "$argon2id$v=19$m=65536,t=2,p=1$QzwBTdR82Taq8ha/ReAhvTKaqa0q6tIPh5rTdWSIzOI$RTCyi48plkZiaiWuh5QZLqp016Ik0AVp9B3O5q9KRJY",
};

export type AuthUser = { email: string };

// Lu à chaque appel : un secret manquant provoque une erreur explicite au lieu
// de signer des tokens avec une clé vide
const secret = () => {
  const value = Bun.env.JWT_SECRET;
  if (!value) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return value;
};

export const checkCredentials = async (email: string, password: string) => {
  // Le mot de passe est toujours vérifié, pour que le temps de réponse ne
  // révèle pas si l'email est connu
  const validPassword = await Bun.password.verify(password, user.passwordHash);
  return validPassword && email.toLowerCase() === user.email;
};

export const createToken = (email: string) => {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: email.toLowerCase(), iat: now, exp: now + TOKEN_TTL_SECONDS },
    secret(),
    ALGORITHM,
  );
};

// httpOnly met le token hors de portée de JavaScript (XSS), SameSite=Lax
// empêche le navigateur de l'envoyer sur les requêtes POST venant d'un autre
// site (CSRF)
export const setAuthCookie = (c: Context, token: string) => {
  setCookie(c, AUTH_COOKIE, token, {
    httpOnly: true,
    secure: Bun.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS,
  });
};

export const clearAuthCookie = (c: Context) => {
  deleteCookie(c, AUTH_COOKIE, { path: "/" });
};

const verifyToken = async (token: string, key: string) => {
  try {
    // Vérifie la signature et la date d'expiration
    return await verify(token, key, ALGORITHM);
  } catch {
    return undefined;
  }
};

// Accepte le token depuis l'en-tête Authorization (clients d'API) ou depuis le
// cookie httpOnly (front end dans un navigateur) ; l'en-tête l'emporte quand
// les deux sont envoyés
export const authenticate = createMiddleware<{
  Variables: { user: AuthUser };
}>(async (c, next) => {
  const key = secret();
  const bearer = c.req.header("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer ?? getCookie(c, AUTH_COOKIE);
  const payload = token ? await verifyToken(token, key) : undefined;

  if (typeof payload?.sub !== "string") {
    c.header("WWW-Authenticate", "Bearer");
    return c.json(
      { success: false, error: "Missing, invalid or expired token" },
      401,
    );
  }

  c.set("user", { email: payload.sub });
  await next();
});
