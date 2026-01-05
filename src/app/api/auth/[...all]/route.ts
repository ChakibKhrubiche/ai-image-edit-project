

import { toNextJsHandler } from "better-auth/next-js";

//import { auth } from "~/server/better-auth";
import { auth } from "~/lib/auth";

console.log("**************Routes enregistrées :", auth.api); 

export const { GET, POST } = toNextJsHandler(auth);


/*
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "~/lib/auth";
import * as authFunctions from "~/server/better-auth";

// On s'assure d'extraire l'instance auth exportée
export const { GET, POST } = toNextJsHandler(authFunctions.auth);
*/
console.log("**************Routes enregistrées :", auth.api); 
