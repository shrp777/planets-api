import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { sign, verify } from "hono/jwt";

import { USER_ROLES, type UserRole } from "./types";

export const TOKEN_TTL_SECONDS = 3600;
export const AUTH_COOKIE = "access_token";

const ALGORITHM = "HS256";

// L'API n'a qu'un seul utilisateur. Seule l'empreinte argon2id du mot de passe
// est conservée
const user = {
  id: "5f0f4aca-7368-4b38-b2fe-a2ed7925441b",
  email: "john@doe.com",
  role: "astronaut" as UserRole,
  passwordHash:
    "$argon2id$v=19$m=65536,t=2,p=1$QzwBTdR82Taq8ha/ReAhvTKaqa0q6tIPh5rTdWSIzOI$RTCyi48plkZiaiWuh5QZLqp016Ik0AVp9B3O5q9KRJY",
};

export type AuthUser = { id: string; email: string; role: UserRole };

// Ce que le token transporte : de quoi identifier et autoriser l'utilisateur,
// sans donnée directement identifiante comme l'email (un JWT est signé, pas
// chiffré : son payload est lisible par quiconque le détient)
export type TokenUser = Pick<AuthUser, "id" | "role">;

// Lu à chaque appel : un secret manquant provoque une erreur explicite au lieu
// de signer des tokens avec une clé vide
const secret = () => {
  const value = Bun.env.JWT_SECRET;
  if (!value) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return value;
};

// Renvoie l'utilisateur si les identifiants sont corrects
export const checkCredentials = async (
  email: string,
  password: string,
): Promise<AuthUser | undefined> => {
  // Le mot de passe est toujours vérifié, pour que le temps de réponse ne
  // révèle pas si l'email est connu
  const validPassword = await Bun.password.verify(password, user.passwordHash);
  if (!validPassword || email.toLowerCase() !== user.email) {
    return undefined;
  }
  return { id: user.id, email: user.email, role: user.role };
};

// Les données absentes du token sont relues côté serveur à partir de l'id
export const findUserById = (id: string): AuthUser | undefined => {
  if (id !== user.id) {
    return undefined;
  }
  return { id: user.id, email: user.email, role: user.role };
};

// sub (subject) est la revendication standard qui identifie l'utilisateur :
// elle porte son id, un identifiant stable et pseudonyme
export const createToken = ({ id, role }: TokenUser) => {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: id, role, iat: now, exp: now + TOKEN_TTL_SECONDS },
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

const isRole = (value: unknown): value is UserRole =>
  USER_ROLES.includes(value as UserRole);

const verifyToken = async (
  token: string,
  key: string,
): Promise<TokenUser | undefined> => {
  try {
    // Vérifie la signature et la date d'expiration
    const { sub, role } = await verify(token, key, ALGORITHM);
    if (typeof sub === "string" && isRole(role)) {
      return { id: sub, role };
    }
  } catch {}
  return undefined;
};

// Accepte le token depuis l'en-tête Authorization (clients d'API) ou depuis le
// cookie httpOnly (front end dans un navigateur) ; l'en-tête l'emporte quand
// les deux sont envoyés
export const authenticate = createMiddleware<{
  Variables: { user: TokenUser };
}>(async (c, next) => {
  const key = secret();
  const bearer = c.req.header("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer ?? getCookie(c, AUTH_COOKIE);
  const user = token ? await verifyToken(token, key) : undefined;

  if (!user) {
    c.header("WWW-Authenticate", "Bearer");
    return c.json(
      { success: false, error: "Missing, invalid or expired token" },
      401,
    );
  }

  c.set("user", user);
  await next();
});
