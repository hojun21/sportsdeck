"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { fetchWithAuth } from "./fetchWithAuth";
import { useSession } from "next-auth/react";

type User = {
    id: number;
    email: string;
    username: string;
    avatar: number;
    favoriteTeamId: number | null;
    role: "USER" | "ADMIN";
    isBanned: boolean;
};

type UserContextType = {
    user: User | null;
    loading: boolean;
    setUser: (user: User | null) => void;
};

const UserContext = createContext<UserContextType>({
    user: null,
    loading: true,
    setUser: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const { data: session } = useSession();

    useEffect(() => {
        const fetchUser = () => {

            // Token validation
            const token = localStorage.getItem("accessToken");
            if (!token) { setLoading(false); return; }
            
            // Called when application starts / signin / signout
            fetchWithAuth("/api/users/me")
                .then(res => { if (!res.ok) return null; return res.json(); })
                .then(data => { setUser(data?.user ?? null); setLoading(false); })
                .catch(() => setLoading(false));
        };

        fetchUser();
        window.addEventListener("auth-change", fetchUser);
        return () => window.removeEventListener("auth-change", fetchUser);
    }, [session]);

    return (
        // Provide user info to children 
        <UserContext.Provider value={{ user, loading, setUser }}>
            {children}
        </UserContext.Provider>
    );
}

// Get user info from UserContext
export function useUser() {
    return useContext(UserContext);
}