import { verifyToken, verifyAdmin } from "./jwt";
import { NextResponse } from "next/server";

type AccessTokenPayload = {
    id: number;
    email: string;
    role: string;
}

type AuthResult = {
    error: NextResponse | null;
    user: AccessTokenPayload | null
}

// Return's json to check if user has role USER
export function authorizeUser(request: Request): AuthResult {

    const payload = verifyToken(request);

    if (!payload) {
        return {error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null};
    }

    return {error: null, user: payload};
}

// Return's json to check if user has role ADMIN
export function authorizeAdmin(request: Request): AuthResult {

    const payload = verifyAdmin(request);

    if (payload === null) {
        return {error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), user: null};
    }

    if (payload === "FORBIDDEN") {
        return {error: NextResponse.json({ error: "Forbidden" }, { status: 403 }), user: null};
    }

    return {error: null, user: payload};
}