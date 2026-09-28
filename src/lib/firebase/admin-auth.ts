import "server-only";
import { getAuth, type Auth } from "firebase-admin/auth";
import { obterApp } from "./servidor";

export function authAdmin(): Auth {
  return getAuth(obterApp());
}
