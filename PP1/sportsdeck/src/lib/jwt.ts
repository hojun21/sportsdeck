import jwt from "jsonwebtoken";

type AccessTokenPayload = {
    id: number;
    email: string;
    role: string;
}

type RefreshTokenPayload = {
    id: number
}

// Verfiy users when trying to sign in
export function verifyToken(request: Request): AccessTokenPayload | null {
    
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return null;

    const token = authHeader.split(" ")[1];
    if (!token) return null;

    try {
        const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AccessTokenPayload;
        return payload;
    } catch {
        return null;
    }
}

// Verify admin when trying to sign in 
export function verifyAdmin(request: Request): AccessTokenPayload | "FORBIDDEN" | null {
    const payload = verifyToken(request);

    if (!payload) return null;
    if (payload.role !== "ADMIN") return "FORBIDDEN";

    return payload;
}

// // Issues a new access token. Called during sign-in and token refresh.
export function signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET!, { expiresIn: "15m" });
}

// Issues a new refresh token. Called during sign-in
export function signRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, { expiresIn: "7d" });
}
